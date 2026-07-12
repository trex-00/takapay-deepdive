import { COMPETITOR, isSwitchingIntent, mentions } from "./clean";
import type { Post, Sentiment } from "./types";

export interface SentimentCounts {
  positive: number;
  neutral: number;
  negative: number;
  total: number;
  negativeShare: number;
}

export function sentimentCounts(posts: Post[], useLabelled = false): SentimentCounts {
  const counts = { positive: 0, neutral: 0, negative: 0 };
  for (const p of posts) {
    counts[useLabelled ? p.labelledSentiment : p.sentiment] += 1;
  }
  const total = posts.length;
  return { ...counts, total, negativeShare: total ? counts.negative / total : 0 };
}

export interface TopicRow {
  topic: string;
  posts: number;
  negative: number;
  neutral: number;
  positive: number;
  negativeShare: number;
  /** Reactions + comments on the negative posts only: how far the complaint travelled. */
  negativeReach: number;
  /** negativeReach as a share of all negative reach on the brand. */
  reachShare: number;
  avgEngagement: number;
}

/**
 * The primary product call: rank issues by NEGATIVE REACH, not by post count.
 *
 * Negative reach = the engagement (reactions + comments) carried by the negative
 * posts on a topic. It folds volume, negativity and audience into one number, and
 * it answers the question a brand manager actually has on a Monday morning — which
 * single problem is doing the most damage in front of the most people — where a
 * raw post count does not. The two rankings genuinely disagree on this data:
 * cashback_offer is the 2nd-largest topic by volume but is almost entirely
 * positive, while charges_fees and app_crash are small but overwhelmingly angry.
 *
 * `competitor` is deliberately excluded. Every competitor post in the file is
 * labelled negative, including neutral ones, so letting it into a negativity-
 * weighted score would rank it on a label we know is unreliable. It gets its own
 * panel instead.
 */
export function issueTriage(posts: Post[]): TopicRow[] {
  const rows = topicBreakdown(posts).filter((r) => r.topic !== "competitor");
  const totalReach = rows.reduce((sum, r) => sum + r.negativeReach, 0);
  return rows
    .map((r) => ({ ...r, reachShare: totalReach ? r.negativeReach / totalReach : 0 }))
    .sort((a, b) => b.negativeReach - a.negativeReach);
}

export function topicBreakdown(posts: Post[]): TopicRow[] {
  const byTopic = new Map<string, Post[]>();
  for (const p of posts) {
    const list = byTopic.get(p.topic);
    if (list) list.push(p);
    else byTopic.set(p.topic, [p]);
  }

  const rows: TopicRow[] = [...byTopic].map(([topic, group]) => {
    const counts = sentimentCounts(group);
    const negatives = group.filter((p) => p.sentiment === "negative");
    const negativeReach = negatives.reduce((sum, p) => sum + p.engagement, 0);
    const engagement = group.reduce((sum, p) => sum + p.engagement, 0);
    return {
      topic,
      posts: group.length,
      negative: counts.negative,
      neutral: counts.neutral,
      positive: counts.positive,
      negativeShare: counts.negativeShare,
      negativeReach,
      reachShare: 0,
      avgEngagement: group.length ? Math.round(engagement / group.length) : 0,
    };
  });

  return rows.sort((a, b) => b.posts - a.posts);
}

export interface DayPoint {
  date: string;
  total: number;
  negative: number;
  negativeShare: number;
}

export function timeline(posts: Post[]): DayPoint[] {
  const byDay = new Map<string, { total: number; negative: number }>();
  for (const p of posts) {
    const day = byDay.get(p.date) ?? { total: 0, negative: 0 };
    day.total += 1;
    if (p.sentiment === "negative") day.negative += 1;
    byDay.set(p.date, day);
  }
  return [...byDay]
    .map(([date, d]) => ({
      date,
      total: d.total,
      negative: d.negative,
      negativeShare: d.total ? d.negative / d.total : 0,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export interface PlatformRow {
  platform: string;
  posts: number;
  negative: number;
  negativeShare: number;
}

export function platformBreakdown(posts: Post[]): PlatformRow[] {
  const byPlatform = new Map<string, { posts: number; negative: number }>();
  for (const p of posts) {
    const row = byPlatform.get(p.platform) ?? { posts: 0, negative: 0 };
    row.posts += 1;
    if (p.sentiment === "negative") row.negative += 1;
    byPlatform.set(p.platform, row);
  }
  return [...byPlatform]
    .map(([platform, r]) => ({
      platform,
      posts: r.posts,
      negative: r.negative,
      negativeShare: r.posts ? r.negative / r.posts : 0,
    }))
    .sort((a, b) => b.posts - a.posts);
}

export interface CompetitorInsight {
  competitorPosts: number;
  shareOfVoice: number;
  switchingIntent: Post[];
  /** What people say NgoodPay is better at, matched on the comparisons in the text. */
  battlegrounds: { theme: string; posts: number; example: string }[];
  topPosts: Post[];
}

const BATTLEGROUNDS: { theme: string; test: RegExp }[] = [
  { theme: "Cash-out charges", test: /charge|cash out|fee/i },
  { theme: "Agent network", test: /agent/i },
  { theme: "Recharge bonus", test: /bonus|recharge/i },
  { theme: "App speed", test: /faster|speed|fast/i },
  { theme: "Customer care", test: /customer care|helpline|support/i },
  { theme: "Cashback offers", test: /cashback|offer/i },
];

/**
 * The secondary product call: competitive switching risk.
 *
 * Share of voice tells the brand manager how loud NgoodPay is inside TakaPay's own
 * conversation. Switching intent tells them how many of those people are actually
 * walking — which is the number that gets reported upward, because it is revenue
 * leaving, not sentiment.
 */
export function competitorInsight(all: Post[], analysed: Post[]): CompetitorInsight {
  const competitorPosts = analysed.filter((p) => mentions(p.text, COMPETITOR));
  const switching = all.filter((p) => !p.isDuplicate && isSwitchingIntent(p.text));

  const battlegrounds = BATTLEGROUNDS.map(({ theme, test }) => {
    const hits = competitorPosts.filter((p) => test.test(p.text));
    return {
      theme,
      posts: hits.length,
      example: hits.sort((a, b) => b.engagement - a.engagement)[0]?.text ?? "",
    };
  })
    .filter((b) => b.posts > 0)
    .sort((a, b) => b.posts - a.posts);

  return {
    competitorPosts: competitorPosts.length,
    shareOfVoice: analysed.length ? competitorPosts.length / analysed.length : 0,
    switchingIntent: switching,
    battlegrounds,
    topPosts: [...competitorPosts].sort((a, b) => b.engagement - a.engagement).slice(0, 5),
  };
}

/** Loudest posts on a topic — what the brand manager should actually go and read. */
export function topPostsFor(posts: Post[], topic: string, sentiment: Sentiment = "negative"): Post[] {
  return posts
    .filter((p) => p.topic === topic && p.sentiment === sentiment)
    .sort((a, b) => b.engagement - a.engagement)
    .slice(0, 3);
}

export const TOPIC_LABELS: Record<string, string> = {
  failed_transaction: "Failed transactions",
  competitor: "Competitor",
  cashback_offer: "Cashback offers",
  off_topic: "Off-topic noise",
  recharge: "Mobile recharge",
  send_money: "Send money",
  charges_fees: "Charges & fees",
  agent_network: "Agent network",
  bill_payment: "Bill payment",
  feature_query: "Feature questions",
  customer_care: "Customer care",
  login_otp: "Login & OTP",
  app_crash: "App crashes",
  app_experience: "App experience",
  product_news: "Product news",
};

export function topicLabel(topic: string): string {
  return TOPIC_LABELS[topic] ?? topic;
}
