/**
 * Sentiment is an ordered scale (negative <-> neutral <-> positive), so it gets a
 * diverging palette: two opposite hues with a neutral gray midpoint.
 *
 * Deliberately NOT red/green. Red-green is the conventional choice for sentiment
 * and it is the one palette that ~8% of men cannot read. Blue<->red keeps the
 * "opposite" reading for everyone: worst adjacent CVD separation is dE 37.5
 * (validated), versus a red/green pair which collapses under protanopia. Every
 * chart also carries direct labels and a legend, so colour never carries meaning
 * on its own.
 */
export const SENTIMENT_COLORS = {
  negative: "#d03b3b",
  neutral: "#8e8d85",
  positive: "#2a78d6",
} as const;

export const SENTIMENT_ORDER = ["negative", "neutral", "positive"] as const;

/** Fixed categorical order, assigned by entity and never cycled or re-ranked. */
export const PLATFORM_COLORS: Record<string, string> = {
  Facebook: "#2a78d6",
  Reddit: "#1baf7a",
  "News/Media": "#eda100",
  Instagram: "#4a3aa7",
  YouTube: "#e34948",
  TikTok: "#e87ba4",
  Twitter: "#eb6834",
};

export const INK = {
  primary: "#0b0b0b",
  secondary: "#52514e",
  muted: "#898781",
  grid: "#e1e0d9",
  axis: "#c3c2b7",
} as const;
