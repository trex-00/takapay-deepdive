"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { topicLabel, type DayPoint, type PlatformRow, type TopicRow } from "@/lib/metrics";
import { INK, PLATFORM_COLORS, SENTIMENT_COLORS } from "@/lib/palette";

const axis = { stroke: INK.axis, fontSize: 12, tickLine: false } as const;

function TooltipBox({ rows, title }: { title: string; rows: [string, string][] }) {
  return (
    <div className="rounded-lg border border-black/10 bg-white px-3 py-2 shadow-lg">
      <p className="mb-1 text-[13px] font-semibold text-[#0b0b0b]">{title}</p>
      {rows.map(([k, v]) => (
        <p key={k} className="text-[12px] text-[#52514e]">
          {k}: <span className="font-medium tabular-nums text-[#0b0b0b]">{v}</span>
        </p>
      ))}
    </div>
  );
}

/**
 * Volume over time, with emphasis rather than two competing series: total
 * conversation in recessive gray, negative conversation in the alert hue. The
 * reader's eye goes to the thing that needs a decision.
 */
export function VolumeTimeline({ data }: { data: DayPoint[] }) {
  return (
    <div>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -18 }}>
          <CartesianGrid stroke={INK.grid} vertical={false} />
          <XAxis
            dataKey="date"
            {...axis}
            tickFormatter={(d: string) => d.slice(8)}
            interval={2}
            axisLine={{ stroke: INK.axis }}
          />
          <YAxis {...axis} axisLine={false} width={40} />
          <Tooltip
            cursor={{ stroke: INK.axis, strokeDasharray: 3 }}
            content={({ active, payload, label }) =>
              active && payload?.length ? (
                <TooltipBox
                  title={String(label)}
                  rows={[
                    ["All posts", String(payload[0]?.payload.total)],
                    ["Negative", String(payload[0]?.payload.negative)],
                  ]}
                />
              ) : null
            }
          />
          <Line
            type="monotone"
            dataKey="total"
            stroke={INK.axis}
            strokeWidth={2}
            dot={false}
            name="All posts"
          />
          <Line
            type="monotone"
            dataKey="negative"
            stroke={SENTIMENT_COLORS.negative}
            strokeWidth={2}
            dot={false}
            name="Negative"
          />
        </LineChart>
      </ResponsiveContainer>
      <ul className="mt-3 flex gap-6">
        {[
          ["All posts", INK.axis],
          ["Negative", SENTIMENT_COLORS.negative],
        ].map(([label, color]) => (
          <li key={label} className="flex items-center gap-2 text-[13px] text-[#52514e]">
            <span className="h-0.5 w-4 rounded-full" style={{ background: color }} aria-hidden />
            {label}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Topics ranked by volume, each split by sentiment. Part-to-whole, so: stacked bar. */
export function TopicChart({ data }: { data: TopicRow[] }) {
  const rows = data.filter((r) => r.topic !== "off_topic");
  return (
    <div>
      <ResponsiveContainer width="100%" height={Math.max(240, rows.length * 30)}>
        <BarChart data={rows} layout="vertical" margin={{ top: 0, right: 16, bottom: 0, left: 8 }} barSize={16}>
          <CartesianGrid stroke={INK.grid} horizontal={false} />
          <XAxis type="number" {...axis} axisLine={{ stroke: INK.axis }} />
          <YAxis
            type="category"
            dataKey="topic"
            {...axis}
            axisLine={false}
            width={122}
            tickFormatter={topicLabel}
          />
          <Tooltip
            cursor={{ fill: "rgba(11,11,11,0.04)" }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const r = payload[0]?.payload as TopicRow;
              return (
                <TooltipBox
                  title={topicLabel(r.topic)}
                  rows={[
                    ["Posts", String(r.posts)],
                    ["Negative", `${r.negative} (${Math.round(r.negativeShare * 100)}%)`],
                    ["Neutral", String(r.neutral)],
                    ["Positive", String(r.positive)],
                  ]}
                />
              );
            }}
          />
          <Bar dataKey="negative" stackId="s" fill={SENTIMENT_COLORS.negative} />
          <Bar dataKey="neutral" stackId="s" fill={SENTIMENT_COLORS.neutral} />
          <Bar dataKey="positive" stackId="s" fill={SENTIMENT_COLORS.positive} radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
      <ul className="mt-2 flex flex-wrap gap-x-6 gap-y-1">
        {(["negative", "neutral", "positive"] as const).map((k) => (
          <li key={k} className="flex items-center gap-2 text-[13px] capitalize text-[#52514e]">
            <span
              className="h-2.5 w-2.5 rounded-[3px]"
              style={{ background: SENTIMENT_COLORS[k] }}
              aria-hidden
            />
            {k}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Where the conversation lives. Magnitude by entity, so colour follows the platform. */
export function PlatformChart({ data }: { data: PlatformRow[] }) {
  return (
    <ResponsiveContainer width="100%" height={210}>
      <BarChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -22 }} barSize={30}>
        <CartesianGrid stroke={INK.grid} vertical={false} />
        <XAxis dataKey="platform" {...axis} axisLine={{ stroke: INK.axis }} interval={0} fontSize={11} />
        <YAxis {...axis} axisLine={false} width={40} />
        <Tooltip
          cursor={{ fill: "rgba(11,11,11,0.04)" }}
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const r = payload[0]?.payload as PlatformRow;
            return (
              <TooltipBox
                title={r.platform}
                rows={[
                  ["Posts", String(r.posts)],
                  ["Negative", `${r.negative} (${Math.round(r.negativeShare * 100)}%)`],
                ]}
              />
            );
          }}
        />
        <Bar dataKey="posts" radius={[4, 4, 0, 0]}>
          {data.map((r) => (
            <Cell key={r.platform} fill={PLATFORM_COLORS[r.platform] ?? INK.muted} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
