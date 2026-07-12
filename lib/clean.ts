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
 * Turns the raw feed into the set of posts the dashboard is allowed to report on.
 *
 * Four rules, in order. Nothing is deleted — every record survives with flags, so
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

      mentionsBrand,
      brandMentionContradiction,
      isDuplicate,
      isOffTopic,
      included: !isDuplicate && !isOffTopic,
    };
  });

  const competitorPosts = posts.filter((p) => p.topic === "competitor");

  return {
    posts,
    report: {
      totalRaw: posts.length,
      analysed: posts.filter((p) => p.included).length,
      duplicatesDropped: posts.filter((p) => p.isDuplicate).length,
      offTopicExcluded: posts.filter((p) => p.isOffTopic && !p.isDuplicate).length,
      sentimentOverrides: posts.filter((p) => p.sentimentOverridden).length,
      brandMentionContradictions: posts.filter((p) => p.brandMentionContradiction).length,
      competitorPosts: competitorPosts.length,
      // The file labels every single competitor post negative, including neutral
      // ones. Surfaced as a caveat rather than silently trusted.
      competitorAllNegative: competitorPosts.every((p) => p.labelledSentiment === "negative"),
    },
  };
}
