import { cn } from "@/lib/utils";
import type { StatusRoll } from "@/lib/itemsApi";

export function StatusDot({ roll, className }: { roll: StatusRoll; className?: string }) {
  const map: Record<StatusRoll, string> = {
    empty: "bg-[color:var(--status-empty)]",
    all_delivered: "bg-[color:var(--status-settled)]",
    in_motion: "bg-[color:var(--status-inflight)]",
    needs_action: "bg-[color:var(--status-needs)]",
  };
  return <span className={cn("inline-block h-1.5 w-1.5 rounded-full", map[roll], className)} />;
}

export function StatusBadge({ status }: { status: string | null }) {
  if (!status) return <span className="text-muted-foreground">—</span>;
  const isOption = status === "option";
  const labels: Record<string, string> = {
    option: "Option",
    to_spec: "To spec",
    to_order: "To order",
    ordered: "Ordered",
    delivered: "Delivered",
    installed: "Installed",
    on_hold: "On hold",
  };
  if (isOption) {
    return (
      <span className="label-micro inline-flex items-center rounded-sm border border-dashed border-[color:var(--rule-soft)] px-1.5 py-0.5 italic">
        {labels[status] ?? status}
      </span>
    );
  }
  return (
    <span className="label-micro inline-flex items-center rounded-sm border border-[color:var(--border)] bg-transparent px-1.5 py-0.5 text-foreground">
      {labels[status] ?? status}
    </span>
  );
}
