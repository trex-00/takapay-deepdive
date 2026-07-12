"use client";

import { COMPETITOR } from "@/lib/clean";
import type { CompetitorInsight } from "@/lib/metrics";
import { INK, SENTIMENT_COLORS } from "@/lib/palette";
import { Callout } from "./ui";

/**
 * The secondary product call. Share of voice says how loud NgoodPay is inside
 * TakaPay's own conversation; switching intent says how many people are actually
 * walking, and what they say pushed them.
 */
export function CompetitorPanel({ insight }: { insight: CompetitorInsight }) {
  const max = insight.battlegrounds[0]?.posts ?? 1;

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-black/10 p-4">
          <p className="text-[13px] font-medium text-[#52514e]">{COMPETITOR} share of voice</p>
          <p className="mt-1 text-3xl font-semibold tabular-nums text-[#0b0b0b]">
            {Math.round(insight.shareOfVoice * 100)}%
          </p>
          <p className="mt-1 text-[13px] text-[#898781]">
            {insight.competitorPosts}{" "}
            of the brand&apos;s own conversations name the competitor
          </p>
        </div>
        <div className="rounded-lg border border-[#d03b3b]/30 bg-[#d03b3b]/[0.04] p-4">
          <p className="text-[13px] font-medium text-[#52514e]">Stated switching intent</p>
          <p className="mt-1 text-3xl font-semibold tabular-nums text-[#d03b3b]">
            {insight.switchingIntent.length}
          </p>
          <p className="mt-1 text-[13px] text-[#898781]">
            posts where someone says they have left TakaPay for {COMPETITOR}
          </p>
        </div>
      </div>

      <div>
        <p className="mb-3 text-[13px] font-medium text-[#52514e]">
          What people say {COMPETITOR} does better
        </p>
        <ul className="space-y-2.5">
          {insight.battlegrounds.map((b) => (
            <li key={b.theme} className="flex items-center gap-3 text-[13px]">
              <span className="w-[124px] shrink-0 text-[#0b0b0b]">{b.theme}</span>
              <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-black/[0.06]">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${(b.posts / max) * 100}%`, background: SENTIMENT_COLORS.negative }}
                />
              </div>
              <span className="w-8 shrink-0 text-right font-semibold tabular-nums text-[#0b0b0b]">
                {b.posts}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {insight.switchingIntent.length > 0 && (
        <div>
          <p className="mb-2 text-[13px] font-medium text-[#52514e]">Every switching post says the same thing</p>
          <p className="rounded-lg border border-black/10 bg-black/[0.02] px-4 py-3 text-[13px] italic text-[#0b0b0b]">
            &ldquo;{insight.switchingIntent[0].text}&rdquo;
          </p>
          <p className="mt-2 text-[13px] leading-relaxed text-[#52514e]">
            All {insight.switchingIntent.length} of them cite {COMPETITOR}&apos;s{" "}
            <strong className="font-semibold text-[#0b0b0b]">cash-out charges</strong> — not app quality, not
            failed payments. The churn that people announce out loud is a pricing problem.
          </p>
        </div>
      )}

      <Callout tone="warning">
        <strong className="font-semibold" style={{ color: INK.primary }}>
          Read this panel with care.
        </strong>{" "}
        The source file labels <em>every</em> competitor post negative — including neutral ones like
        &ldquo;{COMPETITOR}{" "}
        launched a 500 taka cashback, has anyone tried it?&rdquo;. So the counts here are
        trustworthy but the sentiment on them is not, which is why competitor is kept out of the priority
        ranking above.
      </Callout>
    </div>
  );
}
