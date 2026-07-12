"use client";

import { useMemo, useState } from "react";

import { COMPETITOR } from "@/lib/clean";
import {
  competitorInsight,
  issueTriage,
  platformBreakdown,
  sentimentCounts,
  timeline,
  topicBreakdown,
  topicLabel,
} from "@/lib/metrics";
import type { CleanResult, Post } from "@/lib/types";

import { PlatformChart, TopicChart, VolumeTimeline } from "./Charts";
import { CompetitorPanel } from "./CompetitorPanel";
import { DataQualityPanel } from "./DataQualityPanel";
import { EMPTY_FILTERS, Filters, type FilterState } from "./Filters";
import { IssueTriage } from "./IssueTriage";
import { SentimentBar } from "./SentimentOverview";
import { Callout, Card, StatTile } from "./ui";

export function Dashboard({ posts, report }: CleanResult) {
  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS);
  const [showRaw, setShowRaw] = useState(false);

  const dateRange = useMemo<[string, string]>(() => {
    const dates = posts.map((p) => p.date).sort();
    return [dates[0], dates[dates.length - 1]];
  }, [posts]);

  // The raw view is the whole file exactly as shipped — duplicates, noise, bad
  // labels and all. The cleaned view is what survives the rules in lib/clean.ts.
  const base = useMemo(() => (showRaw ? posts : posts.filter((p) => p.included)), [posts, showRaw]);

  const filtered = useMemo(() => {
    const sentimentOf = (p: Post) => (showRaw ? p.labelledSentiment : p.sentiment);
    return base.filter(
      (p) =>
        (filters.platform === "all" || p.platform === filters.platform) &&
        (filters.topic === "all" || p.topic === filters.topic) &&
        (filters.sentiment === "all" || sentimentOf(p) === filters.sentiment) &&
        (!filters.from || p.date >= filters.from) &&
        (!filters.to || p.date <= filters.to),
    );
  }, [base, filters, showRaw]);

  const counts = useMemo(() => sentimentCounts(filtered, showRaw), [filtered, showRaw]);
  const rawCounts = useMemo(() => sentimentCounts(posts, true), [posts]);
  const cleanCounts = useMemo(() => sentimentCounts(posts.filter((p) => p.included)), [posts]);
  const triage = useMemo(() => issueTriage(filtered), [filtered]);
  const topics = useMemo(() => topicBreakdown(filtered), [filtered]);
  const days = useMemo(() => timeline(filtered), [filtered]);
  const platforms = useMemo(() => platformBreakdown(filtered), [filtered]);
  const competitor = useMemo(() => competitorInsight(posts, filtered), [posts, filtered]);

  const topIssue = triage[0];
  const allPlatforms = useMemo(() => [...new Set(posts.map((p) => p.platform))].sort(), [posts]);
  const allTopics = useMemo(() => [...new Set(posts.map((p) => p.topic))].sort(), [posts]);
  const negativeSwing = Math.round(cleanCounts.negativeShare * 100) - Math.round(rawCounts.negativeShare * 100);

  return (
    <main className="mx-auto max-w-[1180px] px-5 py-8 sm:px-8">
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[#0b0b0b]">
            TakaPay — what people are saying
          </h1>
          <p className="mt-1 text-[14px] text-[#52514e]">
            {dateRange[0]} to {dateRange[1]} · {report.totalRaw} posts collected across{" "}
            {allPlatforms.length} platforms
          </p>
        </div>

        <div className="flex items-center gap-3 rounded-xl border border-black/10 bg-white px-4 py-2.5">
          <span className="text-[13px] font-medium text-[#52514e]">Showing</span>
          <div className="flex rounded-lg border border-black/10 p-0.5">
            {[
              { key: false, label: "Cleaned" },
              { key: true, label: "Raw feed" },
            ].map((opt) => (
              <button
                key={String(opt.key)}
                onClick={() => setShowRaw(opt.key)}
                className={`rounded-md px-3 py-1 text-[13px] font-medium transition-colors ${
                  showRaw === opt.key
                    ? "bg-[#0b0b0b] text-white"
                    : "text-[#52514e] hover:bg-black/[0.04]"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {showRaw && (
        <div className="mb-6">
          <Callout tone="warning">
            <strong className="font-semibold text-[#0b0b0b]">You are looking at the raw feed.</strong> It
            includes {report.offTopicExcluded} posts that are not about TakaPay, {report.duplicatesDropped}{" "}
            duplicates, and {report.sentimentOverrides} sentiment labels that contradict their own score.
            These numbers are not safe to act on — switch back to Cleaned.
          </Callout>
        </div>
      )}

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Negative share of conversation"
          value={`${Math.round(counts.negativeShare * 100)}%`}
          tone="bad"
          note={
            showRaw
              ? "As shipped, before any cleaning"
              : `${negativeSwing > 0 ? "+" : ""}${negativeSwing} pts vs the raw feed, once noise is removed`
          }
        />
        <StatTile
          label="Biggest problem right now"
          value={topIssue ? topicLabel(topIssue.topic) : "—"}
          note={
            topIssue
              ? `${Math.round(topIssue.reachShare * 100)}% of all the negative reach on the brand`
              : undefined
          }
        />
        <StatTile
          label={`${COMPETITOR} share of voice`}
          value={`${Math.round(competitor.shareOfVoice * 100)}%`}
          note="of conversations about TakaPay also name the competitor"
        />
        <StatTile
          label="People saying they've left"
          value={String(competitor.switchingIntent.length)}
          tone="bad"
          note="posts stating they switched to the competitor"
        />
      </div>

      <div className="mb-6">
        <Filters
          filters={filters}
          setFilters={setFilters}
          platforms={allPlatforms}
          topics={allTopics}
          dateRange={dateRange}
          resultCount={filtered.length}
        />
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-[1fr_1.4fr]">
        <Card
          title="Overall sentiment"
          subtitle={`${counts.total} posts${showRaw ? ", as labelled in the file" : ", after cleaning"}`}
        >
          <SentimentBar counts={counts} />
          <p className="mt-5 border-t border-black/[0.06] pt-4 text-[13px] leading-relaxed text-[#52514e]">
            More than half of everything said about TakaPay is negative, and it is not spread evenly — it is
            concentrated in one issue.
          </p>
        </Card>

        <Card
          title="Conversation over time"
          subtitle="Daily volume, with the negative share called out"
        >
          <VolumeTimeline data={days} />
        </Card>
      </div>

      <Card
        className="mb-6"
        title="What to fix first"
        subtitle="Issues ranked by negative reach — how far the complaints actually travelled — not by how often they were posted"
      >
        <IssueTriage rows={triage} posts={filtered} />
        <p className="mt-4 border-t border-black/[0.06] pt-4 text-[13px] leading-relaxed text-[#52514e]">
          <strong className="font-semibold text-[#0b0b0b]">Why rank it this way.</strong> Post count would
          put cashback offers second — but those posts are cheerful, and fixing them is not a job. Weighting
          each topic by the reactions and comments on its <em>angry</em> posts folds volume, negativity and
          audience into one number, and it moves charges &amp; fees and app crashes up the list: small topics,
          furious readers. Click any row to read the loudest posts behind it.
        </p>
      </Card>

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <Card title="What people are talking about" subtitle="Every topic, split by sentiment">
          <TopicChart data={topics} />
        </Card>
        <div className="space-y-4">
          <Card title="Where the conversation is happening" subtitle="Posts by platform">
            <PlatformChart data={platforms} />
          </Card>
        </div>
      </div>

      <Card
        className="mb-6"
        title={`Losing ground to ${COMPETITOR}`}
        subtitle="How loud the competitor is inside TakaPay's own conversation, and who is actually walking"
      >
        <CompetitorPanel insight={competitor} />
      </Card>

      <Card
        title="Data quality — what was excluded, and why"
        subtitle="The feed arrived dirty. This is everything that did not make it into the numbers above."
      >
        <DataQualityPanel report={report} />
      </Card>

      <footer className="mt-8 text-[13px] text-[#898781]">
        Built for the Markopolo DeepDive take-home · 660 records from the TakaPay sample feed
      </footer>
    </main>
  );
}
