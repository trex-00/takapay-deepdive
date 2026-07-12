import type { ReactNode } from "react";

export function Card({
  title,
  subtitle,
  children,
  className = "",
  action,
}: {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
  action?: ReactNode;
}) {
  return (
    <section
      className={`rounded-xl border border-black/10 bg-white p-5 shadow-[0_1px_2px_rgba(11,11,11,0.04)] ${className}`}
    >
      {(title || action) && (
        <header className="mb-4 flex items-start justify-between gap-4">
          <div>
            {title && <h2 className="text-[15px] font-semibold text-[#0b0b0b]">{title}</h2>}
            {subtitle && <p className="mt-0.5 text-[13px] leading-snug text-[#52514e]">{subtitle}</p>}
          </div>
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

export function StatTile({
  label,
  value,
  note,
  tone = "neutral",
}: {
  label: string;
  value: string;
  note?: string;
  tone?: "neutral" | "bad" | "good";
}) {
  const valueColor =
    tone === "bad" ? "text-[#d03b3b]" : tone === "good" ? "text-[#2a78d6]" : "text-[#0b0b0b]";
  // A figure gets the hero size; a name does not, or it wraps and swamps the tile.
  const isFigure = /^[\d.,]+%?$/.test(value);
  const size = isFigure ? "text-4xl tabular-nums" : "text-2xl";
  return (
    <div className="flex flex-col rounded-xl border border-black/10 bg-white p-5 shadow-[0_1px_2px_rgba(11,11,11,0.04)]">
      <p className="text-[13px] font-medium text-[#52514e]">{label}</p>
      <p className={`mt-1.5 font-semibold tracking-tight ${size} ${valueColor}`}>{value}</p>
      {note && <p className="mt-auto pt-1.5 text-[13px] leading-snug text-[#898781]">{note}</p>}
    </div>
  );
}

/** A status callout. Colour is never the only signal — it always ships with a label. */
export function Callout({ tone, children }: { tone: "warning" | "info"; children: ReactNode }) {
  const styles =
    tone === "warning"
      ? "border-[#fab219]/40 bg-[#fab219]/10 text-[#52514e]"
      : "border-[#2a78d6]/30 bg-[#2a78d6]/[0.06] text-[#52514e]";
  return <div className={`rounded-lg border px-4 py-3 text-[13px] leading-relaxed ${styles}`}>{children}</div>;
}
