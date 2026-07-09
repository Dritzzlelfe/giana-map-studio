import { cn } from "@/lib/utils";
import type { StatusRoll } from "@/lib/itemsApi";

export function StatusDot({ roll, className }: { roll: StatusRoll; className?: string }) {
  const map: Record<StatusRoll, string> = {
    empty: "bg-muted",
    all_delivered: "bg-emerald-500",
    in_motion: "bg-amber-500",
    needs_action: "bg-rose-500",
  };
  return <span className={cn("inline-block h-2 w-2 rounded-full", map[roll], className)} />;
}

export function StatusBadge({ status }: { status: string | null }) {
  if (!status) return <span className="text-muted-foreground">—</span>;
  const palette: Record<string, string> = {
    option: "border border-dashed border-muted-foreground/40 bg-muted/40 text-muted-foreground",
    to_spec: "bg-rose-100 text-rose-800",
    to_order: "bg-rose-100 text-rose-800",
    ordered: "bg-amber-100 text-amber-800",
    delivered: "bg-emerald-100 text-emerald-800",
    on_hold: "bg-slate-200 text-slate-800",
  };
  const labels: Record<string, string> = {
    option: "Option",
    to_spec: "To spec",
    to_order: "To order",
    ordered: "Ordered",
    delivered: "Delivered",
    on_hold: "On hold",
  };
  return (
    <span className={cn("rounded px-1.5 py-0.5 text-xs font-medium", palette[status] ?? "bg-muted")}>
      {labels[status] ?? status}
    </span>
  );
}
