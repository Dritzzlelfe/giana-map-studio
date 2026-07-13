import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Banknote, Loader2, Printer, Plus } from "lucide-react";
import { AppShell } from "@/components/shell/AppShell";
import { useItemsData } from "@/lib/useItemsData";
import { useAllPayments, useCreatePaymentGlobal, useUpdatePaymentGlobal } from "@/lib/useAllPayments";
import { usePhases, type Phase } from "@/lib/usePhases";
import { useCurrentProfile } from "@/lib/useCurrentProfile";
import {
  pivotPayments,
  reservedTotal,
  upcomingSorted,
  type CashCell,
  type PaymentWithMeta,
  type PivotAxis,
} from "@/lib/budgetMath";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import type { LoadedData } from "@/lib/itemsApi";
import type { Payment } from "@/lib/paymentsApi";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/cashflow")({
  head: () => ({ meta: [{ title: "Cashflow — Project Map" }] }),
  component: CashflowPage,
});

const NULL_VAL = "__null__";

function fmt(n: number | null | undefined) {
  if (n == null) return "—";
  return n.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

function CashflowPage() {
  const { data: items, isLoading: itemsLoading } = useItemsData();
  const { data: payments = [], isLoading: pLoading } = useAllPayments();
  const { data: phases = [] } = usePhases();
  const { data: profile } = useCurrentProfile();
  const money = profile?.role?.money_visibility ?? "none";

  const enriched: PaymentWithMeta[] = useMemo(() => {
    if (!items) return [];
    return payments.map((p) => {
      const it = items.items.find((x) => x.id === p.item_id);
      const room = it?.room_id ? items.roomById[it.room_id] : null;
      const ph = phases.find((x) => x.id === p.phase_id);
      return {
        ...p,
        itemTitle: it?.title,
        roomName: room?.name ?? null,
        phaseName: ph?.name ?? null,
        phaseAxis: ph?.axis ?? null,
      };
    });
  }, [payments, items, phases]);

  const [axis, setAxis] = useState<PivotAxis>("month");
  const [drilldownCell, setDrilldownCell] = useState<CashCell | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [cashCallOpen, setCashCallOpen] = useState(false);

  const cells = useMemo(() => pivotPayments(enriched, axis, phases), [enriched, axis, phases]);
  const reserved = useMemo(() => reservedTotal(enriched), [enriched]);
  const upcoming = useMemo(() => upcomingSorted(enriched), [enriched]);

  const isEmpty = payments.length === 0;

  return (
    <AppShell>
      <div className="flex-1 overflow-auto p-6 lg:p-8">
        <div className="mx-auto max-w-[1600px]">
          <div className="mb-6 border-b border-[color:var(--rule-soft)] pb-5">
            <div className="editorial-eyebrow mb-2">Trésorerie · réel uniquement</div>
            <div className="flex flex-wrap items-center gap-3">
              <Banknote className="h-6 w-6 text-[color:var(--accent-brass)]" strokeWidth={1.25} />
              <h1 className="font-display text-3xl tracking-tight">Cashflow</h1>
              {money === "none" && (
                <span className="ml-2 rounded bg-muted px-2 py-0.5 text-xs italic text-muted-foreground">
                  Montants masqués par votre rôle
                </span>
              )}
              <div className="ml-auto flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setCashCallOpen(true)} disabled={isEmpty}>
                  <Printer className="mr-1.5 h-4 w-4" strokeWidth={1.5} /> Cash call
                </Button>
                <Button size="sm" onClick={() => setAddOpen(true)} disabled={!items}>
                  <Plus className="mr-1.5 h-4 w-4" strokeWidth={1.5} /> Add payment
                </Button>
              </div>
            </div>
          </div>


        {(itemsLoading || pLoading) && (
          <div className="text-muted-foreground">
            <Loader2 className="mr-2 inline h-4 w-4 animate-spin" /> Loading…
          </div>
        )}

        {items && !itemsLoading && !pLoading && isEmpty && (
          <EmptyState onAdd={() => setAddOpen(true)} />
        )}

        {items && !isEmpty && (
          <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
            <div className="space-y-6">
              <section className="rounded-md border bg-card p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="font-display text-base font-semibold">Pivot</h3>
                  <Tabs value={axis} onValueChange={(v) => setAxis(v as PivotAxis)}>
                    <TabsList>
                      <TabsTrigger value="month">By month</TabsTrigger>
                      <TabsTrigger value="phase">By phase</TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
                <PivotTable cells={cells} onCell={setDrilldownCell} />
              </section>

              <section className="rounded-md border bg-card p-4">
                <h3 className="mb-3 font-display text-base font-semibold">
                  Upcoming ({upcoming.length})
                </h3>
                <UpcomingTable
                  payments={upcoming}
                  phases={phases}
                  canEdit={money === "full"}
                  userEmail={profile?.email ?? null}
                />
              </section>
            </div>

            <aside className="space-y-4">
              <ReservedPanel
                total={reserved.total}
                count={reserved.count}
                masked={reserved.masked}
                payments={reserved.payments}
              />
            </aside>
          </div>
        )}

        <PivotDrilldownDialog
          cell={drilldownCell}
          onClose={() => setDrilldownCell(null)}
          phases={phases}
          canEdit={money === "full"}
          userEmail={profile?.email ?? null}
        />
        <AddPaymentDialog open={addOpen} onClose={() => setAddOpen(false)} data={items} phases={phases} />
        <CashCallDialog
          open={cashCallOpen}
          onClose={() => setCashCallOpen(false)}
          payments={enriched}
          phases={phases}
        />
        </div>
      </div>
    </AppShell>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="mx-auto max-w-xl rounded-md border border-dashed border-[color:var(--accent-brass)]/40 bg-card p-12 text-center shadow-[var(--shadow-cell)]">
      <Banknote
        className="mx-auto mb-4 h-10 w-10 text-[color:var(--accent-brass)]"
        strokeWidth={1.25}
      />
      <h3 className="font-display text-2xl tracking-tight text-foreground">
        Aucun paiement enregistré
      </h3>
      <Button className="mt-6" onClick={onAdd}>
        <Plus className="mr-1.5 h-4 w-4" strokeWidth={1.5} /> Ajouter un premier paiement
      </Button>
    </div>
  );
}

function PivotTable({
  cells,
  onCell,
}: {
  cells: CashCell[];
  onCell: (c: CashCell) => void;
}) {
  if (cells.length === 0) {
    return <p className="text-sm text-muted-foreground">No payments in this view.</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-sm">
        <thead className="text-xs uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="px-2 py-1 text-left">Column</th>
            <th className="px-2 py-1 text-right">Client → GAD</th>
            <th className="px-2 py-1 text-right">GAD → Vendor</th>
          </tr>
        </thead>
        <tbody>
          {cells.map((c) => (
            <tr key={c.column} className="border-t hover:bg-accent/20">
              <td className="px-2 py-1.5 font-medium">{c.column}</td>
              <td className="px-2 py-1.5 text-right">
                <button
                  className="num-tabular hover:underline"
                  onClick={() => onCell(c)}
                  disabled={c.clientLane.count === 0}
                >
                  {c.clientLane.count === 0
                    ? "—"
                    : `${fmt(c.clientLane.total)} · ${c.clientLane.count}`}
                  {c.clientLane.masked && (
                    <span className="ml-1 italic text-muted-foreground">· partial</span>
                  )}
                </button>
              </td>
              <td className="px-2 py-1.5 text-right">
                <button
                  className="num-tabular hover:underline"
                  onClick={() => onCell(c)}
                  disabled={c.vendorLane.count === 0}
                >
                  {c.vendorLane.count === 0
                    ? "—"
                    : `${fmt(c.vendorLane.total)} · ${c.vendorLane.count}`}
                  {c.vendorLane.masked && (
                    <span className="ml-1 italic text-muted-foreground">· partial</span>
                  )}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ReservedPanel({
  total,
  count,
  masked,
  payments,
}: {
  total: number;
  count: number;
  masked: boolean;
  payments: PaymentWithMeta[];
}) {
  return (
    <section className="rounded-md border bg-card p-4">
      <h3 className="mb-1 font-display text-base font-semibold">Reserved</h3>
      <p className="mb-3 text-xs text-muted-foreground">
        Client money paid, order not placed. Not GAD's until ordered.
      </p>
      <div className="mb-3 num-tabular text-2xl font-light tracking-tight">
        {count === 0 ? "—" : fmt(total)}
        {masked && <span className="ml-2 text-xs italic text-muted-foreground">· partial</span>}
      </div>
      <ul className="divide-y text-xs">
        {payments.map((p) => (
          <li key={p.id} className="flex items-center justify-between py-1.5">
            <span className="truncate">{p.itemTitle ?? "—"}</span>
            <span className="num-tabular text-muted-foreground">
              {p.amount == null ? "hidden" : fmt(Number(p.amount))}
            </span>
          </li>
        ))}
        {payments.length === 0 && (
          <li className="py-1.5 text-muted-foreground">Nothing reserved.</li>
        )}
      </ul>
      <p className="mt-3 text-[10px] italic text-muted-foreground">
        Cross-project view will appear once a second project exists.
      </p>
    </section>
  );
}

function UpcomingTable({
  payments,
  phases,
  canEdit,
  userEmail,
}: {
  payments: PaymentWithMeta[];
  phases: Phase[];
  canEdit: boolean;
  userEmail: string | null;
}) {
  const update = useUpdatePaymentGlobal();
  if (payments.length === 0) {
    return <p className="text-sm text-muted-foreground">Nothing upcoming.</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-sm">
        <thead className="text-xs uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="px-2 py-1 text-left">Due</th>
            <th className="px-2 py-1 text-left">Item</th>
            <th className="px-2 py-1 text-left">Direction</th>
            <th className="px-2 py-1 text-left">State</th>
            <th className="px-2 py-1 text-left">Phase</th>
            <th className="px-2 py-1 text-right">Amount</th>
            <th className="px-2 py-1 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {payments.map((p) => (
            <tr key={p.id} className="border-t hover:bg-accent/20">
              <td className="px-2 py-1.5 num-tabular text-muted-foreground">
                {p.due_date ?? "—"}
              </td>
              <td className="px-2 py-1.5">
                {p.itemTitle ?? "—"}
                {p.roomName && (
                  <span className="ml-1 text-xs text-muted-foreground">· {p.roomName}</span>
                )}
              </td>
              <td className="px-2 py-1.5 text-xs text-muted-foreground">
                {p.direction === "client_to_gad" ? "Client → GAD" : "GAD → Vendor"}
              </td>
              <td className="px-2 py-1.5">
                <Badge variant="outline" className="capitalize">
                  {p.state}
                </Badge>
              </td>
              <td className="px-2 py-1.5">
                {canEdit ? (
                  <PhaseSelect
                    value={p.phase_id}
                    phases={phases}
                    onChange={(next) => {
                      const oldName = p.phaseName ?? "unscheduled";
                      const newName = phases.find((x) => x.id === next)?.name ?? "unscheduled";
                      const stamp = new Date().toISOString().slice(0, 16).replace("T", " ");
                      const line = `[${stamp}] ${userEmail ?? "unknown"} moved from ${oldName} to ${newName}`;
                      const nextNotes = p.notes ? `${p.notes}\n${line}` : line;
                      update.mutate({
                        id: p.id,
                        patch: { phase_id: next, notes: nextNotes },
                        itemId: p.item_id,
                      });
                    }}
                  />
                ) : (
                  <span className="text-xs text-muted-foreground">{p.phaseName ?? "—"}</span>
                )}
              </td>
              <td className="px-2 py-1.5 text-right num-tabular">
                {p.amount == null ? (
                  <span className="italic text-muted-foreground">hidden</span>
                ) : (
                  fmt(Number(p.amount))
                )}
              </td>
              <td className="px-2 py-1.5 text-right">
                {canEdit && p.state !== "paid" && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    onClick={() => {
                      update.mutate({
                        id: p.id,
                        patch: { state: "paid" },
                        itemId: p.item_id,
                      });
                      toast.success("Marked paid.");
                    }}
                  >
                    Mark paid
                  </Button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PhaseSelect({
  value,
  phases,
  onChange,
}: {
  value: string | null;
  phases: Phase[];
  onChange: (id: string | null) => void;
}) {
  return (
    <Select
      value={value ?? NULL_VAL}
      onValueChange={(v) => onChange(v === NULL_VAL ? null : v)}
    >
      <SelectTrigger className="h-7 w-40 text-xs">
        <SelectValue placeholder="—" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={NULL_VAL}>— unscheduled</SelectItem>
        {phases.map((p) => (
          <SelectItem key={p.id} value={p.id}>
            {p.name} ({p.axis === "ffe" ? "FF&E" : "Construction"})
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function PivotDrilldownDialog({
  cell,
  onClose,
  phases,
  canEdit,
  userEmail,
}: {
  cell: CashCell | null;
  onClose: () => void;
  phases: Phase[];
  canEdit: boolean;
  userEmail: string | null;
}) {
  if (!cell) return null;
  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{cell.column} — payments</DialogTitle>
        </DialogHeader>
        <div className="max-h-[65vh] space-y-4 overflow-auto">
          <LanePreview
            title="Client → GAD"
            lane={cell.clientLane.payments}
            phases={phases}
            canEdit={canEdit}
            userEmail={userEmail}
          />
          <LanePreview
            title="GAD → Vendor"
            lane={cell.vendorLane.payments}
            phases={phases}
            canEdit={canEdit}
            userEmail={userEmail}
          />
        </div>
        <DialogFooter>
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function LanePreview({
  title,
  lane,
  phases,
  canEdit,
  userEmail,
}: {
  title: string;
  lane: PaymentWithMeta[];
  phases: Phase[];
  canEdit: boolean;
  userEmail: string | null;
}) {
  if (lane.length === 0) return null;
  return (
    <div>
      <h4 className="mb-2 label-micro">{title}</h4>
      <UpcomingTable payments={lane} phases={phases} canEdit={canEdit} userEmail={userEmail} />
    </div>
  );
}

function AddPaymentDialog({
  open,
  onClose,
  data,
  phases,
}: {
  open: boolean;
  onClose: () => void;
  data: LoadedData | undefined;
  phases: Phase[];
}) {
  const create = useCreatePaymentGlobal();
  const [itemId, setItemId] = useState("");
  const [amt, setAmt] = useState("");
  const [dir, setDir] = useState<"client_to_gad" | "gad_to_vendor">("client_to_gad");
  const [st, setSt] = useState<"paid" | "due" | "reserved">("due");
  const [due, setDue] = useState("");
  const [phaseId, setPhaseId] = useState<string>(NULL_VAL);

  if (!data) return null;
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add payment</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="label-micro mb-1 block">Item</label>
            <Select value={itemId} onValueChange={setItemId}>
              <SelectTrigger>
                <SelectValue placeholder="Pick an item" />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                {data.items.map((i) => (
                  <SelectItem key={i.id} value={i.id}>
                    {i.title}
                    {i.room_id && (
                      <span className="ml-1 text-muted-foreground">
                        · {data.roomById[i.room_id]?.name}
                      </span>
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-micro mb-1 block">Amount</label>
              <Input
                type="number"
                value={amt}
                onChange={(e) => setAmt(e.target.value)}
                className="num-tabular"
              />
            </div>
            <div>
              <label className="label-micro mb-1 block">Due date</label>
              <Input type="date" value={due} onChange={(e) => setDue(e.target.value)} />
            </div>
            <div>
              <label className="label-micro mb-1 block">Direction</label>
              <Select value={dir} onValueChange={(v) => setDir(v as typeof dir)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="client_to_gad">Client → GAD</SelectItem>
                  <SelectItem value="gad_to_vendor">GAD → Vendor</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="label-micro mb-1 block">State</label>
              <Select value={st} onValueChange={(v) => setSt(v as typeof st)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="due">Due</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="reserved">Reserved</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <label className="label-micro mb-1 block">Phase</label>
              <Select value={phaseId} onValueChange={setPhaseId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NULL_VAL}>— unscheduled</SelectItem>
                  {phases.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} ({p.axis === "ffe" ? "FF&E" : "Construction"})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={!itemId || !amt}
            onClick={async () => {
              await create.mutateAsync({
                item_id: itemId,
                amount: Number(amt),
                direction: dir,
                state: st,
                due_date: due || null,
                phase_id: phaseId === NULL_VAL ? null : phaseId,
                notes: null,
              } as Omit<Payment, "id" | "created_at" | "updated_at">);
              toast.success("Payment added.");
              setItemId("");
              setAmt("");
              setDue("");
              setPhaseId(NULL_VAL);
              onClose();
            }}
          >
            Add
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Cash call: CLIENT amounts only, grouped by phase, Construction vs FF&E.
function CashCallDialog({
  open,
  onClose,
  payments,
  phases,
}: {
  open: boolean;
  onClose: () => void;
  payments: PaymentWithMeta[];
  phases: Phase[];
}) {
  const today = new Date().toISOString().slice(0, 10);
  const client = payments.filter(
    (p) => p.direction === "client_to_gad" && p.state !== "paid",
  );

  const byAxis = (axisId: "construction" | "ffe") => {
    const scoped = client.filter((p) => {
      const ph = phases.find((x) => x.id === p.phase_id);
      return (ph?.axis ?? "construction") === axisId;
    });
    const groups = new Map<string, PaymentWithMeta[]>();
    for (const p of scoped) {
      const key = p.phaseName ?? "Unscheduled";
      (groups.get(key) ?? groups.set(key, []).get(key)!).push(p);
    }
    return [...groups.entries()];
  };

  const constrRows = byAxis("construction");
  const ffeRows = byAxis("ffe");

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Cash call — {today}</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-muted-foreground">
          Client amounts only. Vendor amounts and margins are never shown here.
        </p>
        <div className="grid gap-4 max-h-[65vh] overflow-auto md:grid-cols-2">
          <CashCallColumn title="Construction" rows={constrRows} />
          <CashCallColumn title="FF&E" rows={ffeRows} />
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

function CashCallColumn({
  title,
  rows,
}: {
  title: string;
  rows: [string, PaymentWithMeta[]][];
}) {
  const grandTotal = rows
    .flatMap(([, xs]) => xs)
    .filter((p) => p.amount != null)
    .reduce((s, p) => s + Number(p.amount), 0);
  const hasMasked = rows.flatMap(([, xs]) => xs).some((p) => p.amount == null);
  return (
    <div className="rounded border bg-muted/20 p-3">
      <h4 className="mb-2 font-display text-sm font-semibold">{title}</h4>
      {rows.length === 0 ? (
        <p className="text-xs text-muted-foreground">No amounts due.</p>
      ) : (
        rows.map(([phase, xs]) => {
          const total = xs
            .filter((p) => p.amount != null)
            .reduce((s, p) => s + Number(p.amount), 0);
          return (
            <div key={phase} className="mb-2">
              <div className="mb-1 label-micro">{phase}</div>
              <ul className="divide-y text-xs">
                {xs.map((p) => (
                  <li key={p.id} className="flex items-center justify-between py-1">
                    <span className="truncate">{p.itemTitle ?? "—"}</span>
                    <span className="num-tabular">
                      {p.amount == null ? (
                        <span className="italic text-muted-foreground">hidden</span>
                      ) : (
                        fmt(Number(p.amount))
                      )}
                    </span>
                  </li>
                ))}
                <li className="flex items-center justify-between border-t pt-1 font-medium">
                  <span>Subtotal</span>
                  <span className="num-tabular">{fmt(total)}</span>
                </li>
              </ul>
            </div>
          );
        })
      )}
      <div className="mt-2 border-t pt-2 text-right text-sm font-medium">
        Total: <span className="num-tabular">{fmt(grandTotal)}</span>
        {hasMasked && <span className="ml-1 text-xs italic text-muted-foreground">· partial</span>}
      </div>
    </div>
  );
}
