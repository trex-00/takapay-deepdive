export type Sentiment = "positive" | "neutral" | "negative";

/** A record exactly as it appears in the source file. Never mutated. */
export interface RawRecord {
  id: number;
  platform: string;
  timestamp: string;
  author: string;
  text: string;
  language: string;
  brand_mention: boolean;
  sentiment: string;
  sentiment_score: number;
  topic: string;
  reactions: number;
  comments: number;
}

/**
 * A source record plus the fields the cleaning pipeline derives. Every derived
 * field is additive: the original label is always still readable next to it, so
 * the dashboard can show the raw and the cleaned view from one array.
 */
export interface Post {
  id: number;
  platform: string;
  timestamp: string;
  date: string;
  author: string;
  text: string;
  language: string;
  topic: string;
  reactions: number;
  comments: number;
  engagement: number;

  /** Sentiment as shipped in the file. */
  labelledSentiment: Sentiment;
  score: number;
  /** Sentiment after reconciling the label against the score bands. */
  sentiment: Sentiment;
  /** True when the file's label disagreed with its own score. */
  sentimentOverridden: boolean;

  /** Whether the text actually names TakaPay, regardless of `brand_mention`. */
  mentionsBrand: boolean;
  /** The file claims brand_mention: true but the text never says TakaPay. */
  brandMentionContradiction: boolean;
  /** Text is identical to an earlier record's. */
  isDuplicate: boolean;
  /** Not about TakaPay at all — traffic, weather, cricket, biryani. */
  isOffTopic: boolean;
  /** Counted in the headline numbers: not a duplicate, not off-topic. */
  included: boolean;
}

export interface QualityReport {
  totalRaw: number;
  analysed: number;
  duplicatesDropped: number;
  offTopicExcluded: number;
  sentimentOverrides: number;
  brandMentionContradictions: number;
  competitorPosts: number;
  competitorAllNegative: boolean;
}

export interface CleanResult {
  posts: Post[];
  report: QualityReport;
}
