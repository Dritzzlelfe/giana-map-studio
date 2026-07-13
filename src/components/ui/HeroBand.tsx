import heroAsset from "@/assets/hero-atelier.jpg.asset.json";
import type { ReactNode } from "react";

export function HeroBand({
  eyebrow,
  title,
  lede,
  right,
  height = "h-56",
}: {
  eyebrow?: string;
  title: string;
  lede?: string;
  right?: ReactNode;
  height?: string;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-md border border-[color:var(--rule-soft)] shadow-[var(--shadow-editorial)] ${height}`}
    >
      <img
        src={heroAsset.url}
        alt=""
        aria-hidden
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(90deg, rgba(43,36,29,0.82) 0%, rgba(43,36,29,0.55) 45%, rgba(43,36,29,0.05) 100%)",
        }}
      />
      <div className="relative flex h-full flex-col justify-end p-8 text-[color:var(--cream)]">
        {eyebrow && (
          <span
            className="mb-3 inline-flex items-center gap-2 text-[10.5px] font-semibold uppercase tracking-[0.22em]"
            style={{ color: "var(--accent-brass-soft)" }}
          >
            <span
              aria-hidden
              className="inline-block h-px w-6"
              style={{ background: "var(--accent-brass)" }}
            />
            {eyebrow}
          </span>
        )}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <h1 className="font-display text-[42px] leading-[1.05] tracking-tight text-[color:var(--cream)]">
              {title}
            </h1>
            {lede && (
              <p className="mt-2 max-w-xl text-sm text-[color:var(--sand)]">
                {lede}
              </p>
            )}
          </div>
          {right && <div className="shrink-0">{right}</div>}
        </div>
      </div>
    </div>
  );
}
