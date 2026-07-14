import type { CleanResult, Post, RawRecord, Sentiment } from "./types";

/**
 * Sentiment bands, read off the data rather than chosen.
 *
 * The 660 sentiment_scores fall into three clusters with two completely empty
 * gaps: nothing scores 31-44, and nothing scores 61-69. So the cut points below
 * are structural — they sit inside the gaps, and moving them anywhere else in
 * the gap would not reclassify a single record.
 *
 *   negative  6-30   |  (gap 31-44)  |  neutral 45-60  |  (gap 61-69)  |  positive 70-94
 */
const NEGATIVE_CEILING = 40;
const NEUTRAL_CEILING = 65;

export function sentimentFromScore(score: number): Sentiment {
  if (score <= NEGATIVE_CEILING) return "negative";
  if (score < NEUTRAL_CEILING) return "neutral";
  return "positive";
}

export const BRAND = "TakaPay";
export const COMPETITOR = "NgoodPay";

export function mentions(text: string, name: string): boolean {
  return text.toLowerCase().includes(name.toLowerCase());
}

/**
 * Posts where someone says they are leaving TakaPay for the competitor. Matched
 * on the phrasing that actually occurs in the feed ("TakaPay chere switch
 * korlam" — I left TakaPay and switched), not on a generic churn word list.
 */
export function isSwitchingIntent(text: string): boolean {
  const t = text.toLowerCase();
  if (!t.includes("takapay")) return false;
  return /chere\s+(switch|dilam|dilo)|switch\s+korlam|chere\s+diyechi|uninstall/.test(t);
}

/**
 * The feed is machine-generated from templates: 660 posts collapse to ~106
 * skeletons, differing only in the slots — the amount, the recipient, the telco,
 * the bill type, the elapsed time. Blanking those out recovers the skeleton, which
 * lets identical posts be compared against each other (see rule 5).
 */
const SLOTS: [RegExp, string][] = [
  [/[0-9০-৯]+/g, "#"],
  [/\b(robi|airtel|grameenphone|gp|teletalk|banglalink)\b/g, "TELCO"],
  [/\b(credit card bill|tuition fee|gas bill|electricity bill|water bill|internet bill|dth bill)\b/g, "BILL"],
  [/\b(amar |my )?(friend|bhai|vai|bon|apu|ma|baba|colleague|bondhu|landlord|shop)\b/g, "PERSON"],
  [/\b(din|ghonta|min|minute|hour|week|day|sararat|sara rat)\b/g, "TIME"],
  [/(dhanmondi|gulshan|banani|mohakhali|uttara|mirpur|farmgate|bashundhara|motijheel)( ?#)?/g, "PLACE"],
];

export function templateKey(text: string): string {
  let t = text.toLowerCase();
  for (const [pattern, slot] of SLOTS) t = t.replace(pattern, slot);
  t = t.replace(/^\S+ (কে|ke)\b/, "PERSON $1");
  return t.replace(/\s+/g, " ").trim();
}

/**
 * A template group only gets a vote if there are enough copies to make a majority
 * mean something, and only if that majority is lopsided. In practice every group
 * that qualifies lands at 82-93% agreement, so nothing here is a close call — the
 * thresholds exist to make the rule refuse to guess, not to arbitrate genuine
 * disagreement.
 */
const MIN_GROUP = 6;
const MIN_MAJORITY = 0.7;

/**
 * Turns the raw feed into the set of posts the dashboard is allowed to report on.
 *
 * Five rules, in order. Nothing is deleted — every record survives with flags, so
 * the UI can show the raw picture and the cleaned picture from the same array and
 * the brand manager can see exactly what was set aside and why.
 */
export function cleanDataset(raw: RawRecord[]): CleanResult {
  const seenText = new Set<string>();

  const posts: Post[] = raw.map((r) => {
    const sentiment = sentimentFromScore(r.sentiment_score);
    const labelledSentiment = r.sentiment as Sentiment;

    // 1. brand_mention is `true` on every row in the file, including posts about
    //    traffic and biryani. The field carries no information, so it is ignored
    //    and brand mention is read from the text instead.
    const mentionsBrand = mentions(r.text, BRAND);
    const brandMentionContradiction = r.brand_mention && !mentionsBrand;

    // 2. Identical text under a different id/author: counted once.
    const isDuplicate = seenText.has(r.text);
    seenText.add(r.text);

    // 3. off_topic posts are not about the brand and must not move brand KPIs.
    const isOffTopic = r.topic === "off_topic";

    return {
      id: r.id,
      platform: r.platform,
      timestamp: r.timestamp,
      date: r.timestamp.slice(0, 10),
      author: r.author,
      text: r.text,
      language: r.language,
      topic: r.topic,
      reactions: r.reactions,
      comments: r.comments,
      engagement: r.reactions + r.comments,

      labelledSentiment,
      score: r.sentiment_score,
      // 4. Where the shipped label contradicts its own score, the score wins.
      sentiment,
      sentimentOverridden: sentiment !== labelledSentiment,
      templateKey: templateKey(r.text),
      templateFlipped: false,

      mentionsBrand,
      brandMentionContradiction,
      isDuplicate,
      isOffTopic,
      included: !isDuplicate && !isOffTopic,
    };
  });

  // 5. Identical sentence, identical sentiment.
  //
  //    Rule 4 only catches a row whose label fights its own score. It cannot catch
  //    a row where the label and the score are BOTH wrong — and ~6% of every
  //    template is exactly that: the sentiment is flipped and the score is dragged
  //    along to match, so the row is internally consistent and lies anyway. In one
  //    43-copy template, 39 posts read positive at scores 72-93 and 4 identical
  //    posts read negative at 19-20. The English templates prove it is injected
  //    noise rather than ambiguity: "done before I finished my tea" appears once as
  //    a complaint, and "this is robbery" five times as praise.
  //
  //    The templating is the antidote to the corruption. A post that disagrees with
  //    an overwhelming majority of its own identical twins is outvoted by them.
  let templateConflictsUnresolved = 0;
  const groups = new Map<string, Post[]>();
  for (const p of posts) {
    const group = groups.get(p.templateKey);
    if (group) group.push(p);
    else groups.set(p.templateKey, [p]);
  }

  for (const group of groups.values()) {
    const tally = new Map<Sentiment, number>();
    for (const p of group) tally.set(p.sentiment, (tally.get(p.sentiment) ?? 0) + 1);
    if (tally.size < 2) continue;

    const [majority, votes] = [...tally].sort((a, b) => b[1] - a[1])[0];
    const dissenters = group.filter((p) => p.sentiment !== majority);

    // Refuse to vote when the group is thin or the margin is close: better to leave
    // a bad row in and say so than to invent a sentiment on weak evidence.
    if (group.length < MIN_GROUP || votes / group.length < MIN_MAJORITY) {
      templateConflictsUnresolved += dissenters.length;
      continue;
    }
    for (const p of dissenters) {
      p.sentiment = majority;
      p.templateFlipped = true;
    }
  }

  const competitorPosts = posts.filter((p) => p.topic === "competitor");

  return {
    posts,
    report: {
      totalRaw: posts.length,
      analysed: posts.filter((p) => p.included).length,
      duplicatesDropped: posts.filter((p) => p.isDuplicate).length,
      offTopicExcluded: posts.filter((p) => p.isOffTopic && !p.isDuplicate).length,
      sentimentOverrides: posts.filter((p) => p.sentimentOverridden).length,
      templateFlips: posts.filter((p) => p.templateFlipped).length,
      templateConflictsUnresolved,
      brandMentionContradictions: posts.filter((p) => p.brandMentionContradiction).length,
      competitorPosts: competitorPosts.length,
      // The file labels every single competitor post negative, including neutral
      // ones. Surfaced as a caveat rather than silently trusted.
      competitorAllNegative: competitorPosts.every((p) => p.labelledSentiment === "negative"),
    },
  };
}
