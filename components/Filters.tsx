"use client";

import { topicLabel } from "@/lib/metrics";
import type { Sentiment } from "@/lib/types";

export interface FilterState {
  platform: string;
  topic: string;
  sentiment: string;
  from: string;
  to: string;
}

export const EMPTY_FILTERS: FilterState = {
  platform: "all",
  topic: "all",
  sentiment: "all",
  from: "",
  to: "",
};

const SENTIMENTS: Sentiment[] = ["negative", "neutral", "positive"];

function Select({
  label,
  value,
  options,
  onChange,
  format = (v: string) => v,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
  format?: (v: string) => string;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[12px] font-medium text-[#52514e]">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 min-w-[132px] rounded-lg border border-black/10 bg-white px-2.5 text-[13px] text-[#0b0b0b] outline-none focus:border-[#2a78d6]"
      >
        <option value="all">All</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {format(o)}
          </option>
        ))}
      </select>
    </label>
  );
}

export function Filters({
  filters,
  setFilters,
  platforms,
  topics,
  dateRange,
  resultCount,
}: {
  filters: FilterState;
  setFilters: (f: FilterState) => void;
  platforms: string[];
  topics: string[];
  dateRange: [string, string];
  resultCount: number;
}) {
  const set = (patch: Partial<FilterState>) => setFilters({ ...filters, ...patch });
  const dirty = JSON.stringify(filters) !== JSON.stringify(EMPTY_FILTERS);

  return (
    <div className="flex flex-wrap items-end gap-4 rounded-xl border border-black/10 bg-white p-4">
      <Select
        label="Platform"
        value={filters.platform}
        options={platforms}
        onChange={(v) => set({ platform: v })}
      />
      <Select
        label="Topic"
        value={filters.topic}
        options={topics}
        onChange={(v) => set({ topic: v })}
        format={topicLabel}
      />
      <Select
        label="Sentiment"
        value={filters.sentiment}
        options={SENTIMENTS}
        onChange={(v) => set({ sentiment: v })}
        format={(v) => v[0].toUpperCase() + v.slice(1)}
      />
      <label className="flex flex-col gap-1">
        <span className="text-[12px] font-medium text-[#52514e]">From</span>
        <input
          type="date"
          value={filters.from}
          min={dateRange[0]}
          max={dateRange[1]}
          onChange={(e) => set({ from: e.target.value })}
          className="h-9 rounded-lg border border-black/10 bg-white px-2.5 text-[13px] text-[#0b0b0b] outline-none focus:border-[#2a78d6]"
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-[12px] font-medium text-[#52514e]">To</span>
        <input
          type="date"
          value={filters.to}
          min={dateRange[0]}
          max={dateRange[1]}
          onChange={(e) => set({ to: e.target.value })}
          className="h-9 rounded-lg border border-black/10 bg-white px-2.5 text-[13px] text-[#0b0b0b] outline-none focus:border-[#2a78d6]"
        />
      </label>

      <div className="ml-auto flex items-center gap-3">
        <span className="text-[13px] tabular-nums text-[#898781]">{resultCount} posts</span>
        {dirty && (
          <button
            onClick={() => setFilters(EMPTY_FILTERS)}
            className="h-9 rounded-lg border border-black/10 px-3 text-[13px] font-medium text-[#52514e] hover:bg-black/[0.03]"
          >
            Reset
          </button>
        )}
      </div>
    </div>
  );
}
