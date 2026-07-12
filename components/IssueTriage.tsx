"use client";

import { Fragment, useState } from "react";

import { topPostsFor, topicLabel, type TopicRow } from "@/lib/metrics";
import type { Post } from "@/lib/types";
import { SENTIMENT_COLORS } from "@/lib/palette";

/**
 * The primary product call. Issues are ranked by NEGATIVE REACH — the engagement
 * carried by the angry posts — not by how many times a topic was posted about.
 */
export function IssueTriage({ rows, posts }: { rows: TopicRow[]; posts: Post[] }) {
  const [open, setOpen] = useState<string | null>(rows[0]?.topic ?? null);
  const ranked = rows.filter((r) => r.negativeReach > 0).slice(0, 6);
  const maxReach = ranked[0]?.negativeReach ?? 1;

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] border-collapse text-[13px]">
        <thead>
          <tr className="border-b border-black/10 text-left text-[12px] font-medium text-[#52514e]">
            <th className="pb-2 pl-1 font-medium">#</th>
            <th className="pb-2 font-medium">Issue</th>
            <th className="pb-2 text-right font-medium">Posts</th>
            <th className="pb-2 text-right font-medium">Negative</th>
            <th className="pb-2 pl-6 font-medium">Share of negative reach</th>
          </tr>
        </thead>
        <tbody>
          {ranked.map((r, i) => {
            const isOpen = open === r.topic;
            const examples = isOpen ? topPostsFor(posts, r.topic) : [];
            return (
              <Fragment key={r.topic}>
                <tr
                  onClick={() => setOpen(isOpen ? null : r.topic)}
                  className="cursor-pointer border-b border-black/[0.06] hover:bg-black/[0.02]"
                >
                  <td className="py-3 pl-1 tabular-nums text-[#898781]">{i + 1}</td>
                  <td className="py-3 pr-4 font-medium text-[#0b0b0b]">
                    {topicLabel(r.topic)}
                    <span className="ml-2 text-[11px] font-normal text-[#898781]">
                      {isOpen ? "hide posts" : "see posts"}
                    </span>
                  </td>
                  <td className="py-3 text-right tabular-nums text-[#52514e]">{r.posts}</td>
                  <td className="py-3 text-right tabular-nums text-[#52514e]">
                    {Math.round(r.negativeShare * 100)}%
                  </td>
                  <td className="py-3 pl-6">
                    <div className="flex items-center gap-3">
                      <div className="h-2.5 w-full max-w-[180px] overflow-hidden rounded-full bg-black/[0.06]">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${(r.negativeReach / maxReach) * 100}%`,
                            background: SENTIMENT_COLORS.negative,
                          }}
                        />
                      </div>
                      <span className="w-10 shrink-0 text-right font-semibold tabular-nums text-[#0b0b0b]">
                        {Math.round(r.reachShare * 100)}%
                      </span>
                    </div>
                  </td>
                </tr>
                {isOpen && examples.length > 0 && (
                  <tr className="border-b border-black/[0.06] bg-black/[0.015]">
                    <td colSpan={5} className="px-1 py-3">
                      <p className="mb-2 text-[12px] font-medium text-[#52514e]">
                        Loudest complaints on this issue
                      </p>
                      <ul className="space-y-2">
                        {examples.map((p) => (
                          <li key={p.id} className="flex gap-3 text-[13px]">
                            <span className="w-[92px] shrink-0 text-[12px] text-[#898781]">
                              {p.platform} · {p.date.slice(5)}
                            </span>
                            <span className="flex-1 text-[#0b0b0b]">{p.text}</span>
                            <span className="w-24 shrink-0 text-right text-[12px] tabular-nums text-[#898781]">
                              {p.engagement.toLocaleString()} eng.
                            </span>
                          </li>
                        ))}
                      </ul>
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
