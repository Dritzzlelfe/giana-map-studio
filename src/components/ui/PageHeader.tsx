import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

// Compact editorial page header — brass eyebrow + serif title + optional right slot.
// Used on internal pages that don't warrant a full HeroBand.
export function PageHeader({
  eyebrow,
  title,
  lede,
  icon: Icon,
  right,
}: {
  eyebrow?: string;
  title: string;
  lede?: string;
  icon?: LucideIcon;
  right?: ReactNode;
}) {
  return (
    <div className="mb-6 border-b border-[color:var(--rule-soft)] pb-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          {eyebrow && (
            <span className="editorial-eyebrow mb-2">{eyebrow}</span>
          )}
          <div className="flex items-center gap-3">
            {Icon && (
              <Icon
                className="h-6 w-6 text-[color:var(--accent-brass)]"
                strokeWidth={1.25}
              />
            )}
            <h1 className="font-display text-3xl tracking-tight text-foreground">
              {title}
            </h1>
          </div>
          {lede && (
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              {lede}
            </p>
          )}
        </div>
        {right && <div className="shrink-0">{right}</div>}
      </div>
    </div>
  );
}
