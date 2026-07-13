import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Loader2, Printer, Wallet } from "lucide-react";
import { AppShell } from "@/components/shell/AppShell";
import { useItemsData } from "@/lib/useItemsData";
import { useBudgets, useUpsertBudget, type Budget } from "@/lib/budgetsApi";
import { useUpdateRoom } from "@/lib/roomsApi";
import { useAllRoomTargets } from "@/lib/useAllRoomTargets";
import { useCurrentProfile } from "@/lib/useCurrentProfile";
import {
  axisSpend,
  gap,
  projectSpend,
  projectLevelSpend,
  roomBudgetRow,
  type Axis,
  type BudgetRoomRow,
} from "@/lib/budgetMath";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Link } from "@tanstack/react-router";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import type { LoadedData, Item, Room } from "@/lib/itemsApi";
import { isCommitted } from "@/lib/lifecycle";

export const Route = createFileRoute("/_authenticated/budget")({
  head: () => ({ meta: [{ title: "Budget — Project Map" }] }),
  component: BudgetPage,
});

function fmt(n: number | null | undefined) {
  if (n == null) return "—";
  return n.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

function BudgetPage() {
  const { data: items, isLoading } = useItemsData();
  const { data: budgets = [], isLoading: bLoading } = useBudgets();
  const { data: profile } = useCurrentProfile();
  const money = profile?.role?.money_visibility ?? "none";
  const canEdit = money === "full";

  const projectBudget = budgets.find((b) => b.scope === "project") ?? null;
  const roofBudget = budgets.find((b) => b.scope === "roof_deck") ?? null;

  // Now that Room exposes project_id, use it for new-budget inserts.
  const anyProjectId =
    projectBudget?.project_id ??
    roofBudget?.project_id ??
    items?.rooms[0]?.project_id ??
    "";

  const [exportRoom, setExportRoom] = useState<string | null>(null);

  return (
    <AppShell>
      <div className="flex-1 overflow-auto p-6 lg:p-8">
        <div className="mx-auto max-w-[1600px]">
          <div className="mb-6 border-b border-[color:var(--rule-soft)] pb-5">
            <div className="editorial-eyebrow mb-2">Signed budgets · gap live</div>
            <div className="flex items-center gap-3">
              <Wallet className="h-6 w-6 text-[color:var(--accent-brass)]" strokeWidth={1.25} />
              <h1 className="font-display text-3xl tracking-tight">Budget</h1>
              {money === "none" && (
                <span className="ml-2 rounded bg-muted px-2 py-0.5 text-xs italic text-muted-foreground">
                  Montants masqués par votre rôle
                </span>
              )}
            </div>
          </div>


        {(isLoading || bLoading) && (
          <div className="text-muted-foreground">
            <Loader2 className="mr-2 inline h-4 w-4 animate-spin" /> Loading…
          </div>
        )}

        {items && (
          <div className="space-y-6">
            <GlobalZone
              budget={projectBudget}
              projectId={anyProjectId}
              canEdit={canEdit}
              money={money}
            />

            <RoofDeckCard
              budget={roofBudget}
              projectId={anyProjectId}
              canEdit={canEdit}
              money={money}
              items={items.items}
              rooms={items.rooms}
            />

            <AxisTables data={items} onExport={setExportRoom} />
          </div>
        )}

        <RoomSummaryDialog
          roomId={exportRoom}
          data={items}
          onClose={() => setExportRoom(null)}
        />
        </div>
      </div>
    </AppShell>
  );
}

function GlobalZone({
  budget,
  projectId,
  canEdit,
  money,
}: {
  budget: Budget | null;
  projectId: string;
  canEdit: boolean;
  money: string;
}) {
  const upsert = useUpsertBudget();
  const [rateKey, setRateKey] = useState("");
  const [rateLabel, setRateLabel] = useState("");
  const [rateUnit, setRateUnit] = useState("");
  const [rateVal, setRateVal] = useState("");

  const rates = (budget?.per_unit_rates ?? {}) as Record<
    string,
    { label: string; unit: string; rate: number }
  >;

  return (
    <section className="grid gap-4 md:grid-cols-2">
      <BudgetCard
        title="Construction"
        axis="construction"
        value={budget?.construction_budget ?? null}
        masked={money !== "full"}
        canEdit={canEdit}
        onSave={(v) =>
          upsert.mutate({
            id: budget?.id,
            project_id: projectId,
            scope: "project",
            patch: { construction_budget: v },
          })
        }
      />
      <BudgetCard
        title="FF&E"
        axis="ffe"
        value={budget?.ffe_budget ?? null}
        masked={money === "none"}
        canEdit={canEdit}
        onSave={(v) =>
          upsert.mutate({
            id: budget?.id,
            project_id: projectId,
            scope: "project",
            patch: { ffe_budget: v },
          })
        }
      />

      <div className="rounded-md border bg-card p-4 md:col-span-2">
        <h3 className="mb-2 font-display text-base font-semibold">Per-unit rates</h3>
        {money !== "full" ? (
          <p className="italic text-muted-foreground">Hidden by your role.</p>
        ) : (
          <>
            <table className="w-full text-sm">
              <thead className="text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-2 py-1 text-left">Category key</th>
                  <th className="px-2 py-1 text-left">Label</th>
                  <th className="px-2 py-1 text-left">Unit</th>
                  <th className="px-2 py-1 text-right">Rate</th>
                  <th className="px-2 py-1"></th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(rates).map(([k, r]) => (
                  <tr key={k} className="border-t">
                    <td className="px-2 py-1.5 font-mono text-xs">{k}</td>
                    <td className="px-2 py-1.5">{r.label}</td>
                    <td className="px-2 py-1.5 text-muted-foreground">{r.unit}</td>
                    <td className="px-2 py-1.5 text-right num-tabular">{fmt(r.rate)}</td>
                    <td className="px-2 py-1.5 text-right">
                      {canEdit && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-muted-foreground"
                          onClick={() => {
                            const next = { ...rates };
                            delete next[k];
                            upsert.mutate({
                              id: budget?.id,
                              project_id: projectId,
                              scope: "project",
                              patch: { per_unit_rates: next },
                            });
                          }}
                        >
                          ×
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
                {Object.keys(rates).length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-2 py-4 text-center text-muted-foreground">
                      No rates yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            {canEdit && (
              <div className="mt-3 grid grid-cols-[120px_1fr_100px_120px_auto] gap-2">
                <Input placeholder="key (e.g. floor)" value={rateKey} onChange={(e) => setRateKey(e.target.value)} />
                <Input placeholder="Label" value={rateLabel} onChange={(e) => setRateLabel(e.target.value)} />
                <Input placeholder="Unit" value={rateUnit} onChange={(e) => setRateUnit(e.target.value)} />
                <Input
                  type="number"
                  placeholder="Rate"
                  value={rateVal}
                  onChange={(e) => setRateVal(e.target.value)}
                  className="num-tabular"
                />
                <Button
                  size="sm"
                  disabled={!rateKey.trim() || !rateVal || !projectId}
                  onClick={() => {
                    upsert.mutate({
                      id: budget?.id,
                      project_id: projectId,
                      scope: "project",
                      patch: {
                        per_unit_rates: {
                          ...rates,
                          [rateKey.trim()]: {
                            label: rateLabel || rateKey,
                            unit: rateUnit || "unit",
                            rate: Number(rateVal),
                          },
                        },
                      },
                    });
                    setRateKey("");
                    setRateLabel("");
                    setRateUnit("");
                    setRateVal("");
                  }}
                >
                  Add
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}

function BudgetCard({
  title,
  axis: _axis,
  value,
  masked,
  canEdit,
  onSave,
}: {
  title: string;
  axis: Axis;
  value: number | null;
  masked: boolean;
  canEdit: boolean;
  onSave: (v: number | null) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<string>("");
  return (
    <div className="rounded-md border bg-card p-4">
      <div className="label-micro">{title} budget</div>
      {masked ? (
        <div className="mt-2 italic text-muted-foreground">Hidden</div>
      ) : editing ? (
        <div className="mt-2 flex items-center gap-2">
          <Input
            type="number"
            className="w-40 num-tabular"
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
          />
          <Button
            size="sm"
            onClick={() => {
              onSave(draft === "" ? null : Number(draft));
              setEditing(false);
            }}
          >
            Save
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
            Cancel
          </Button>
        </div>
      ) : (
        <button
          className={cn(
            "mt-2 num-tabular text-3xl font-light tracking-tight",
            canEdit && "hover:underline",
          )}
          onClick={() => {
            if (!canEdit) return;
            setDraft(value != null ? String(value) : "");
            setEditing(true);
          }}
          disabled={!canEdit}
        >
          {value != null ? fmt(value) : "Définir"}
        </button>
      )}
    </div>
  );
}

function RoofDeckCard({
  budget,
  projectId,
  canEdit,
  money,
  items,
  rooms,
}: {
  budget: Budget | null;
  projectId: string;
  canEdit: boolean;
  money: string;
  items: Item[];
  rooms: Room[];
}) {
  const upsert = useUpsertBudget();
  const roofRoom = rooms.find((r) => /roof deck/i.test(r.name));
  const roofItems = roofRoom ? items.filter((i) => i.room_id === roofRoom.id) : [];
  const committed = roofItems
    .filter((i) => isCommitted(i.status) && i.client_price != null)
    .reduce((s, i) => s + Number(i.client_price), 0);
  const target = money === "full" ? (budget?.construction_budget ?? null) : null;
  const g = gap(target, committed);

  return (
    <section className="rounded-md border-2 border-dashed border-[color:var(--rule-soft)] bg-muted/20 p-4">
      <div className="mb-2 flex items-center justify-between">
        <div>
          <h3 className="font-display text-base font-semibold">Roof Deck (separate budget)</h3>
          <p className="text-xs text-muted-foreground">
            Separately signed by Candida, includes all dunnage. Also rolls into the project total.
          </p>
        </div>
        {roofRoom && (
          <Link to="/room/$roomId" params={{ roomId: roofRoom.id }} className="text-xs underline text-muted-foreground">
            Open room →
          </Link>
        )}
      </div>
      <div className="grid gap-3 sm:grid-cols-4">
        <BudgetCard
          title="Roof deck target"
          axis="construction"
          value={budget?.construction_budget ?? null}
          masked={money !== "full"}
          canEdit={canEdit}
          onSave={(v) =>
            upsert.mutate({
              id: budget?.id,
              project_id: projectId,
              scope: "roof_deck",
              patch: { construction_budget: v },
            })
          }
        />
        <StatCard label="Committed" value={money === "none" ? null : committed} />
        <StatCard
          label="Gap"
          value={money === "none" ? null : g}
          tone={g != null && g < 0 ? "over" : "neutral"}
        />
        <StatCard label="Items" value={roofItems.length} raw />
      </div>
    </section>
  );
}

function StatCard({
  label,
  value,
  tone,
  raw,
}: {
  label: string;
  value: number | null;
  tone?: "over" | "neutral";
  raw?: boolean;
}) {
  return (
    <div className="rounded border bg-card p-3">
      <div className="label-micro">{label}</div>
      <div
        className={cn(
          "mt-1 num-tabular text-2xl font-light tracking-tight",
          tone === "over" && "text-[color:var(--primary)]",
        )}
      >
        {value == null ? "—" : raw ? value : fmt(value)}
      </div>
    </div>
  );
}

function AxisTables({
  data,
  onExport,
}: {
  data: LoadedData;
  onExport: (roomId: string) => void;
}) {
  const { data: targets } = useAllRoomTargets();
  return (
    <section className="grid gap-4 lg:grid-cols-2">
      <AxisTable axis="construction" data={data} targets={targets} onExport={onExport} />
      <AxisTable axis="ffe" data={data} targets={targets} onExport={onExport} />
    </section>
  );
}

function AxisTable({
  axis,
  data,
  targets,
  onExport,
}: {
  axis: Axis;
  data: LoadedData;
  targets: Map<string, number | null> | undefined;
  onExport: (roomId: string) => void;
}) {
  const updateRoom = useUpdateRoom();
  const projectLevel = useMemo(() => {
    return projectLevelSpend(
      data.items.filter((i) => {
        const c = i.category_id ? data.categoryById[i.category_id] : undefined;
        const a = c?.axis === "ffe" ? "ffe" : "construction";
        return a === axis;
      }),
    );
  }, [data, axis]);
  const total = useMemo(
    () => axisSpend(data.items, data.categoryById, axis),
    [data, axis],
  );

  return (
    <div className="rounded-md border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-display text-base font-semibold">
          {axis === "construction" ? "Construction" : "FF&E"} — rooms
        </h3>
        <span className="text-xs text-muted-foreground">
          axis total: {fmt(total.committed)}{" "}
          {total.hasMaskedCommitted && <span className="italic">· partial</span>}
        </span>
      </div>
      <table className="w-full text-sm">
        <thead className="text-xs uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="px-2 py-1 text-left">Room</th>
            <th className="px-2 py-1 text-right">Target</th>
            <th className="px-2 py-1 text-right">Committed</th>
            <th className="px-2 py-1 text-right">Options</th>
            <th className="px-2 py-1 text-right">Gap</th>
            <th className="px-2 py-1"></th>
          </tr>
        </thead>
        <tbody>
          {data.rooms.map((r) => {
            const target = targets?.get(r.id) ?? null;
            const row: BudgetRoomRow = roomBudgetRow(
              data.items,
              r.id,
              target,
              data.categoryById,
              axis,
            );
            const empty = row.committed === 0 && row.options === 0;
            if (empty && row.target == null) return null;
            return (
              <RoomRow
                key={r.id}
                room={r}
                row={row}
                onSaveTarget={(v) =>
                  updateRoom.mutate({ id: r.id, patch: { target_amount: v } })
                }
                onExport={() => onExport(r.id)}
              />
            );
          })}
          <tr className="border-t bg-muted/30 font-medium">
            <td className="px-2 py-2">Project-wide costs (fees, project-level)</td>
            <td className="px-2 py-2 text-right text-muted-foreground">—</td>
            <td className="px-2 py-2 text-right num-tabular">{fmt(projectLevel.committed)}</td>
            <td className="px-2 py-2 text-right num-tabular">{fmt(projectLevel.options)}</td>
            <td className="px-2 py-2 text-right text-muted-foreground">—</td>
            <td></td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function RoomRow({
  room,
  row,
  onSaveTarget,
  onExport,
}: {
  room: Room;
  row: BudgetRoomRow;
  onSaveTarget: (v: number | null) => void;
  onExport: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<string>(row.target != null ? String(row.target) : "");
  return (
    <tr className="border-t hover:bg-accent/20">
      <td className="px-2 py-1.5">
        <Link
          to="/room/$roomId"
          params={{ roomId: room.id }}
          className="font-medium hover:underline"
        >
          {room.name}
        </Link>
      </td>
      <td className="px-2 py-1.5 text-right">
        {editing ? (
          <div className="flex items-center justify-end gap-1">
            <Input
              type="number"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              className="h-7 w-24 num-tabular"
              autoFocus
            />
            <Button
              size="sm"
              className="h-7"
              onClick={() => {
                onSaveTarget(draft === "" ? null : Number(draft));
                setEditing(false);
              }}
            >
              ✓
            </Button>
          </div>
        ) : (
          <button
            className="num-tabular text-muted-foreground hover:underline"
            onClick={() => {
              setDraft(row.target != null ? String(row.target) : "");
              setEditing(true);
            }}
          >
            {row.target != null ? fmt(row.target) : "— set"}
          </button>
        )}
      </td>
      <td className="px-2 py-1.5 text-right num-tabular">{fmt(row.committed)}</td>
      <td className="px-2 py-1.5 text-right num-tabular italic text-muted-foreground">
        {fmt(row.options)}
      </td>
      <td
        className={cn(
          "px-2 py-1.5 text-right num-tabular",
          row.gap != null && row.gap < 0 && "text-[color:var(--primary)]",
        )}
      >
        {row.gap != null ? (row.gap < 0 ? `−${fmt(Math.abs(row.gap))}` : fmt(row.gap)) : "—"}
      </td>
      <td className="px-2 py-1.5 text-right">
        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={onExport}>
          <Printer className="mr-1 h-3 w-3" strokeWidth={1.5} /> Summary
        </Button>
      </td>
    </tr>
  );
}

// Client-facing room summary: client_price only. No gad_cost, no margin.
function RoomSummaryDialog({
  roomId,
  data,
  onClose,
}: {
  roomId: string | null;
  data: LoadedData | undefined;
  onClose: () => void;
}) {
  if (!roomId || !data) return null;
  const room = data.roomById[roomId];
  const committed = data.items.filter(
    (i) => i.room_id === roomId && isCommitted(i.status),
  );
  const total = committed
    .filter((i) => i.client_price != null)
    .reduce((s, i) => s + Number(i.client_price), 0);
  const hasMasked = committed.some((i) => i.client_price == null);
  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Room decision summary — {room?.name}</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-muted-foreground">
          Client prices only. This is the record of your decisions for this room.
        </p>
        <div className="max-h-[60vh] overflow-auto">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-2 py-1 text-left">Item</th>
                <th className="px-2 py-1 text-left">Vendor</th>
                <th className="px-2 py-1 text-right">Qty</th>
                <th className="px-2 py-1 text-right">Client price</th>
              </tr>
            </thead>
            <tbody>
              {committed.map((i) => (
                <tr key={i.id} className="border-t">
                  <td className="px-2 py-1.5">{i.title}</td>
                  <td className="px-2 py-1.5 text-muted-foreground">
                    {i.vendor_id ? data.vendorById[i.vendor_id]?.name : "—"}
                  </td>
                  <td className="px-2 py-1.5 text-right num-tabular">{i.qty_needed ?? "—"}</td>
                  <td className="px-2 py-1.5 text-right num-tabular">
                    {i.client_price == null ? (
                      <span className="italic text-muted-foreground">Hidden</span>
                    ) : (
                      fmt(Number(i.client_price))
                    )}
                  </td>
                </tr>
              ))}
              <tr className="border-t font-medium">
                <td colSpan={3} className="px-2 py-2 text-right">
                  Total{hasMasked && <span className="ml-1 italic text-muted-foreground">· partial</span>}
                </td>
                <td className="px-2 py-2 text-right num-tabular">{fmt(total)}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="mr-1.5 h-4 w-4" strokeWidth={1.5} /> Print
          </Button>
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
