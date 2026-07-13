import { useState } from "react";
import { useCurrentProfile } from "@/lib/useCurrentProfile";
import { useRoomTarget } from "@/lib/useRoomTarget";
import { useUpdateRoom } from "@/lib/roomsApi";
import { gap, roomSpend } from "@/lib/budgetMath";
import type { Item } from "@/lib/itemsApi";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function BudgetStrip({ roomId, items }: { roomId: string; items: Item[] }) {
  const { data: profile } = useCurrentProfile();
  const money = profile?.role?.money_visibility ?? "none";
  const showMoney = money !== "none";
  const { data: target, isLoading } = useRoomTarget(roomId);
  const update = useUpdateRoom();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<string>("");

  const spend = roomSpend(items, roomId);
  const targetVal = target?.target_amount ?? null;
  const g = gap(targetVal, spend.committed);

  return (
    <div className="mb-6 flex flex-wrap items-stretch gap-0 divide-x divide-[color:var(--rule-soft)] rounded-md border border-[color:var(--rule-soft)] bg-card">
      <Cell label="Target" wide>
        {isLoading ? (
          <span className="text-muted-foreground">…</span>
        ) : !showMoney ? (
          <span className="italic text-muted-foreground">Hidden</span>
        ) : editing ? (
          <div className="flex items-center gap-1">
            <Input
              type="number"
              value={draft}
              autoFocus
              onChange={(e) => setDraft(e.target.value)}
              className="h-8 w-28 num-tabular"
            />
            <Button
              size="sm"
              onClick={() => {
                update.mutate(
                  { id: roomId, patch: { target_amount: draft === "" ? null : Number(draft) } },
                  { onSuccess: () => setEditing(false) },
                );
              }}
            >
              Save
            </Button>
          </div>
        ) : (
          <button
            className="num-tabular text-left hover:underline"
            onClick={() => {
              setDraft(targetVal != null ? String(targetVal) : "");
              setEditing(true);
            }}
          >
            {targetVal != null ? `$${targetVal.toLocaleString()}` : "— set target"}
          </button>
        )}
      </Cell>
      <Cell label="Committed">
        <MoneyReadout
          value={spend.committed}
          masked={spend.hasMaskedCommitted}
          show={showMoney}
          count={spend.committedCount}
        />
      </Cell>
      <Cell label="Wishlist (options)" muted>
        <MoneyReadout
          value={spend.options}
          masked={spend.hasMaskedOptions}
          show={showMoney}
          count={spend.optionsCount}
        />
      </Cell>
      <Cell label="Gap">
        {!showMoney ? (
          <span className="italic text-muted-foreground">Hidden</span>
        ) : g == null ? (
          <span className="text-muted-foreground">—</span>
        ) : (
          <span
            className={cn(
              "num-tabular",
              g < 0 ? "text-[color:var(--primary)]" : "text-foreground",
            )}
          >
            {g < 0 ? "−" : ""}${Math.abs(g).toLocaleString()}
          </span>
        )}
      </Cell>
    </div>
  );
}

function Cell({
  label,
  children,
  wide,
  muted,
}: {
  label: string;
  children: React.ReactNode;
  wide?: boolean;
  muted?: boolean;
}) {
  return (
    <div className={cn("flex flex-col gap-1 p-4", wide ? "min-w-[220px]" : "min-w-[160px] flex-1")}>
      <div className={cn("label-micro", muted && "text-muted-foreground/70")}>{label}</div>
      <div className={cn("text-lg font-medium", muted && "italic text-muted-foreground")}>
        {children}
      </div>
    </div>
  );
}

function MoneyReadout({
  value,
  masked,
  show,
  count,
}: {
  value: number | null;
  masked: boolean;
  show: boolean;
  count: number;
}) {
  if (!show) return <span className="italic text-muted-foreground">Hidden</span>;
  if (count === 0) return <span className="text-muted-foreground">—</span>;
  return (
    <span className="num-tabular">
      ${(value ?? 0).toLocaleString()}
      {masked && (
        <span className="ml-2 text-[10px] italic text-muted-foreground">
          some hidden
        </span>
      )}
    </span>
  );
}
