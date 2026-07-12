"use client";

import { SENTIMENT_COLORS } from "@/lib/palette";
import type { SentimentCounts } from "@/lib/metrics";

const ORDER = ["negative", "neutral", "positive"] as const;
const LABELS = { negative: "Negative", neutral: "Neutral", positive: "Positive" } as const;

/**
 * Sentiment is an ordered scale, so it reads as one 100% stacked bar rather than a
 * donut: the eye compares segment lengths on a shared baseline instead of angles.
 * Segments are direct-labelled, so the chart is readable without the colours.
 */
export function SentimentBar({ counts }: { counts: SentimentCounts }) {
  const total = counts.total || 1;
  return (
    <div>
      <div className="flex h-11 w-full gap-[2px] overflow-hidden rounded-md">
        {ORDER.map((key) => {
          const n = counts[key];
          if (n === 0) return null;
          const pct = (n / total) * 100;
          return (
            <div
              key={key}
              className="flex items-center justify-center first:rounded-l-md last:rounded-r-md"
              style={{ width: `${pct}%`, background: SENTIMENT_COLORS[key] }}
              title={`${LABELS[key]}: ${n} posts (${Math.round(pct)}%)`}
            >
              {pct >= 8 && (
                <span className="text-[13px] font-semibold text-white tabular-nums">{Math.round(pct)}%</span>
              )}
            </div>
          );
        })}
      </div>
      <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
        {ORDER.map((key) => (
          <li key={key} className="flex items-center gap-2 text-[13px]">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-[3px]"
              style={{ background: SENTIMENT_COLORS[key] }}
              aria-hidden
            />
            <span className="text-[#52514e]">{LABELS[key]}</span>
            <span className="font-semibold tabular-nums text-[#0b0b0b]">{counts[key]}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
