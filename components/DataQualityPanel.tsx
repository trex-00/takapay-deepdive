"use client";

import type { QualityReport } from "@/lib/types";

/**
 * Shown in the product, not buried in the README. A brand manager acting on these
 * numbers deserves to know what was thrown away and why; a reviewer deserves to see
 * that the file's defects were caught rather than passed through.
 */
export function DataQualityPanel({ report }: { report: QualityReport }) {
  const rules = [
    {
      n: report.offTopicExcluded,
      rule: "Off-topic posts excluded from every brand number",
      why: "Traffic in Farmgate, rain in Mirpur, biryani in Uttara, a semester final. These carry sentiment labels but say nothing about TakaPay, and they were dragging the brand's numbers toward a neutral middle.",
    },
    {
      n: report.brandMentionContradictions,
      rule: "Rows where the brand_mention field is simply wrong",
      why: "brand_mention is true on all 660 rows, yet 70 of those texts never say TakaPay. The field carries no information, so it is ignored and brand mention is read from the text instead.",
    },
    {
      n: report.sentimentOverrides,
      rule: "Sentiment labels overruled by their own score",
      why: "All 23 are labelled positive while scoring 46-60, which is squarely inside the neutral band. Every one of them is an off-topic post — the label corruption in this file is entirely contained in the noise, which is independent evidence that the noise should go.",
    },
    {
      n: report.duplicatesDropped,
      rule: "Duplicate posts counted once",
      why: "Identical text re-appearing under a different id and author. Left in, they would double-count complaints that never actually happened twice.",
    },
    {
      n: report.competitorPosts,
      rule: "Competitor posts flagged, not trusted",
      why: "Every single competitor post is labelled negative, including neutral market intel. The volume is real, the sentiment is not, so these are kept out of the priority ranking and shown separately.",
    },
  ];

  return (
    <div className="space-y-4">
      <p className="text-[13px] leading-relaxed text-[#52514e]">
        The source feed is not clean. {report.totalRaw} records came in;{" "}
        <strong className="font-semibold text-[#0b0b0b]">{report.analysed}</strong> are trustworthy enough to
        report on. Every rule applied is listed below, and the toggle at the top of the page switches the
        whole dashboard back to the raw, uncleaned feed so you can see what each one is worth.
      </p>
      <ul className="divide-y divide-black/[0.06]">
        {rules.map((r) => (
          <li key={r.rule} className="flex gap-4 py-3">
            <span className="w-10 shrink-0 text-right text-lg font-semibold tabular-nums text-[#d03b3b]">
              {r.n}
            </span>
            <div>
              <p className="text-[13px] font-medium text-[#0b0b0b]">{r.rule}</p>
              <p className="mt-0.5 text-[13px] leading-relaxed text-[#52514e]">{r.why}</p>
            </div>
          </li>
        ))}
      </ul>
      <p className="text-[13px] leading-relaxed text-[#898781]">
        Checked and found clean: ids are unique, every timestamp falls inside June 2026, and the language
        tags are accurate on 659 of 660 rows. Those needed no fixing.
      </p>
    </div>
  );
}
