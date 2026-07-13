// Reconciliation tab of /cashflow — validation surface for imported payments.
//
// Golden rule: an unconfirmed (or dismissed) payment enters NO total. It only
// appears here. Confirming writes confirmed=true, confirmed_by, confirmed_at,
// and the chosen state. Dismissing sets dismissed=true (row stays visible).
//
// Only shown to full-money-visibility roles; masked roles cannot even read
// `amount` from the base table.

import { useMemo, useState } from "react";
import { AlertTriangle, Check, X, Loader2 } from "lucide-react";
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
import { toast } from "sonner";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { confirmPayments, updatePayment } from "@/lib/paymentsApi";
import { ALL_PAYMENTS_QK } from "@/lib/useAllPayments";
import type { PaymentWithMeta } from "@/lib/budgetMath";
import type { LoadedData } from "@/lib/itemsApi";
import type { Phase } from "@/lib/usePhases";

const NULL_VAL = "__null__";

function fmt(n: number | null | undefined) {
  if (n == null) return "—";
  return n.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

// Static note flagged by the spec — figure discrepancy on Roche Bobois.
const ROCHE_STATIC_NOTE =
  "Roche Bobois — schedule totals $61,388.44, but the 60% deposit of $39,264.67 implies a $65,441.12 contract (Δ $4,052.68).";

export function ReconciliationTab({
  payments,
  data,
  phases,
  userId,
}: {
  payments: PaymentWithMeta[];
  data: LoadedData;
  phases: Phase[];
  userId: string;
}) {
  const qc = useQueryClient();

  const pending = useMemo(
    () => payments.filter((p) => !p.confirmed && !p.dismissed),
    [payments],
  );
  const confirmedVendor = useMemo(
    () =>
      payments.filter(
        (p) =>
          p.confirmed &&
          !p.dismissed &&
          p.direction === "gad_to_vendor" &&
          p.source === "reconciliation_import",
      ),
    [payments],
  );
  const dismissed = useMemo(() => payments.filter((p) => p.dismissed), [payments]);

  // Group pending client-invoice rows by invoice number.
  const invoiceGroups = useMemo(() => {
    const m = new Map<string, PaymentWithMeta[]>();
    for (const p of pending) {
      if (p.source === "reconciliation_derived") continue;
      const key = p.invoice_num ?? "—";
      const arr = m.get(key) ?? [];
      arr.push(p);
      m.set(key, arr);
    }
    return [...m.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [pending]);

  const derived = useMemo(
    () => pending.filter((p) => p.source === "reconciliation_derived"),
    [pending],
  );

  // Anomaly: vendors that have payments but zero items in the schedule.
  const vendorAnomalies = useMemo(() => {
    const itemVendorIds = new Set(
      data.items.map((i) => i.vendor_id).filter((x): x is string => !!x),
    );
    const totals = new Map<string, { vendor: string; total: number; count: number }>();
    for (const p of payments) {
      if (!p.vendor_id) continue;
      if (itemVendorIds.has(p.vendor_id)) continue;
      const vname = data.vendorById[p.vendor_id]?.name ?? "Unknown";
      const cur = totals.get(p.vendor_id) ?? { vendor: vname, total: 0, count: 0 };
      cur.total += Number(p.amount ?? 0);
      cur.count += 1;
      totals.set(p.vendor_id, cur);
    }
    return [...totals.values()];
  }, [payments, data]);

  const confirmMut = useMutation({
    mutationFn: ({ ids, patch }: { ids: string[]; patch: Record<string, unknown> }) =>
      confirmPayments(ids, patch, userId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ALL_PAYMENTS_QK }),
    onError: (e: Error) => toast.error(`Confirm failed: ${e.message}`),
  });
  const updateMut = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Record<string, unknown> }) =>
      updatePayment(id, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: ALL_PAYMENTS_QK }),
    onError: (e: Error) => toast.error(`Update failed: ${e.message}`),
  });

  const [derivedConfirmTarget, setDerivedConfirmTarget] = useState<PaymentWithMeta | null>(null);
  const [editTarget, setEditTarget] = useState<PaymentWithMeta | null>(null);

  return (
    <div className="space-y-6">
      {pending.length > 0 && (
        <div className="rounded-md border border-amber-500/40 bg-amber-500/5 p-4 text-sm">
          <div className="flex items-center gap-2 font-medium">
            <AlertTriangle className="h-4 w-4 text-amber-600" strokeWidth={1.5} />
            {pending.length} payment{pending.length > 1 ? "s" : ""} awaiting confirmation
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            None of these payments count toward totals until confirmed.
          </p>
        </div>
      )}

      {(vendorAnomalies.length > 0 || true) && (
        <section className="rounded-md border bg-card p-4">
          <h3 className="mb-2 font-display text-base font-semibold">Needs review</h3>
          <ul className="space-y-1 text-sm text-muted-foreground">
            {vendorAnomalies.map((a) => (
              <li key={a.vendor}>
                <span className="font-medium text-foreground">{a.vendor}</span> — {fmt(a.total)}{" "}
                across {a.count} payment{a.count > 1 ? "s" : ""}. This vendor doesn't appear
                anywhere in the schedule.
              </li>
            ))}
            <li>{ROCHE_STATIC_NOTE}</li>
          </ul>
        </section>
      )}

      {invoiceGroups.map(([inv, rows]) => (
        <InvoicePanel
          key={inv}
          invoice={inv}
          rows={rows}
          phases={phases}
          busy={confirmMut.isPending}
          onBulkConfirm={(state, phaseId) =>
            confirmMut.mutate({
              ids: rows.map((r) => r.id),
              patch: phaseId !== undefined ? { state, phase_id: phaseId } : { state },
            })
          }
          onRowConfirm={(id, state) => confirmMut.mutate({ ids: [id], patch: { state } })}
          onRowDismiss={(id) => updateMut.mutate({ id, patch: { dismissed: true } })}
          onRowEdit={(row) => setEditTarget(row)}
        />
      ))}

      {derived.length > 0 && (
        <section className="rounded-md border bg-card p-4">
          <h3 className="mb-2 font-display text-base font-semibold">
            Derived contract balances ({derived.length})
          </h3>
          <p className="mb-3 text-xs text-muted-foreground">
            These balances are stated in the invoices (50% / 40% remaining). Confirming requires
            assigning a due date — that's what makes them callable to the client.
          </p>
          <ul className="divide-y text-sm">
            {derived.map((p) => (
              <li key={p.id} className="py-2">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium">{p.description ?? "—"}</div>
                    <div className="text-xs text-muted-foreground">
                      {data.vendorById[p.vendor_id ?? ""]?.name ?? "Unknown vendor"} · {fmt(Number(p.amount ?? 0))}
                    </div>
                  </div>
                  <div className="flex flex-shrink-0 gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      onClick={() => setDerivedConfirmTarget(p)}
                    >
                      Confirm & date
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs"
                      onClick={() => updateMut.mutate({ id: p.id, patch: { dismissed: true } })}
                    >
                      Dismiss
                    </Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="rounded-md border bg-card p-4">
        <details>
          <summary className="cursor-pointer font-display text-base font-semibold">
            Vendor payments already confirmed ({confirmedVendor.length})
          </summary>
          <p className="mt-1 mb-3 text-xs text-muted-foreground">
            These amounts left the GAD account (AmEx / Wells Fargo) — they already count toward
            totals.
          </p>
          <ul className="divide-y text-xs">
            {confirmedVendor.map((p) => (
              <li key={p.id} className="flex items-center justify-between py-1.5">
                <span className="min-w-0 flex-1 truncate">
                  {p.due_date ?? "—"} · {p.description ?? "—"}
                </span>
                <span className="ml-3 num-tabular text-muted-foreground">
                  {fmt(Number(p.amount ?? 0))}
                </span>
              </li>
            ))}
          </ul>
        </details>
      </section>

      {dismissed.length > 0 && (
        <section className="rounded-md border bg-card p-4">
          <h3 className="mb-2 font-display text-base font-semibold">Dismissed ({dismissed.length})</h3>
          <ul className="divide-y text-xs">
            {dismissed.map((p) => (
              <li key={p.id} className="flex items-center justify-between py-1.5">
                <span className="min-w-0 flex-1 truncate">
                  <Badge variant="outline" className="mr-2">excluded</Badge>
                  {p.description ?? "—"}
                </span>
                <div className="flex flex-shrink-0 items-center gap-2">
                  <span className="num-tabular text-muted-foreground">
                    {fmt(Number(p.amount ?? 0))}
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 text-xs"
                    onClick={() => updateMut.mutate({ id: p.id, patch: { dismissed: false } })}
                  >
                    Restore
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <ConfirmDerivedDialog
        target={derivedConfirmTarget}
        onClose={() => setDerivedConfirmTarget(null)}
        phases={phases}
        onConfirm={(dueDate, phaseId, state) => {
          if (!derivedConfirmTarget) return;
          confirmMut.mutate({
            ids: [derivedConfirmTarget.id],
            patch: { due_date: dueDate, phase_id: phaseId, state },
          });
          setDerivedConfirmTarget(null);
        }}
      />

      <EditPaymentDialog
        target={editTarget}
        onClose={() => setEditTarget(null)}
        phases={phases}
        onSave={(patch) => {
          if (!editTarget) return;
          updateMut.mutate({ id: editTarget.id, patch });
          setEditTarget(null);
        }}
      />
    </div>
  );
}

function InvoicePanel({
  invoice,
  rows,
  phases,
  busy,
  onBulkConfirm,
  onRowConfirm,
  onRowDismiss,
  onRowEdit,
}: {
  invoice: string;
  rows: PaymentWithMeta[];
  phases: Phase[];
  busy: boolean;
  onBulkConfirm: (state: "paid" | "due", phaseId?: string | null) => void;
  onRowConfirm: (id: string, state: "paid" | "due") => void;
  onRowDismiss: (id: string) => void;
  onRowEdit: (row: PaymentWithMeta) => void;
}) {
  const total = rows.reduce((s, r) => s + Number(r.amount ?? 0), 0);
  const [phaseId, setPhaseId] = useState<string>(NULL_VAL);

  return (
    <section className="rounded-md border bg-card p-4">
      <div className="mb-3 flex flex-wrap items-center gap-3 border-b pb-3">
        <div>
          <h3 className="font-display text-base font-semibold">Invoice {invoice}</h3>
          <div className="text-xs text-muted-foreground">
            {rows.length} row{rows.length > 1 ? "s" : ""} · {fmt(total)}
          </div>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Select value={phaseId} onValueChange={setPhaseId}>
            <SelectTrigger className="h-8 w-44 text-xs">
              <SelectValue placeholder="Assign phase" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NULL_VAL}>No phase</SelectItem>
              {phases.map((ph) => (
                <SelectItem key={ph.id} value={ph.id}>
                  {ph.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            size="sm"
            className="h-8 text-xs"
            disabled={busy}
            onClick={() => onBulkConfirm("paid", phaseId === NULL_VAL ? null : phaseId)}
          >
            {busy && <Loader2 className="mr-1 h-3 w-3 animate-spin" />} Confirm invoice paid
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs"
            disabled={busy}
            onClick={() => onBulkConfirm("due", phaseId === NULL_VAL ? null : phaseId)}
          >
            Confirm invoice due
          </Button>
        </div>
      </div>
      <ul className="divide-y text-sm">
        {rows.map((r) => (
          <li key={r.id} className="flex items-start gap-3 py-2">
            <div className="min-w-0 flex-1">
              <div className="truncate font-medium">{r.description ?? "—"}</div>
              <div className="text-xs text-muted-foreground">
                {r.due_date ?? "—"} · {r.direction === "client_to_gad" ? "Client → GAD" : "GAD → Vendor"} · state: {r.state}
              </div>
            </div>
            <div className="num-tabular whitespace-nowrap text-sm">{fmt(Number(r.amount ?? 0))}</div>
            <div className="flex flex-shrink-0 items-center gap-1">
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                title="Confirm paid"
                onClick={() => onRowConfirm(r.id, "paid")}
              >
                <Check className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2 text-xs"
                onClick={() => onRowConfirm(r.id, "due")}
              >
                Due
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2 text-xs"
                onClick={() => onRowEdit(r)}
              >
                Edit
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                title="Dismiss"
                onClick={() => onRowDismiss(r.id)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function ConfirmDerivedDialog({
  target,
  onClose,
  phases,
  onConfirm,
}: {
  target: PaymentWithMeta | null;
  onClose: () => void;
  phases: Phase[];
  onConfirm: (dueDate: string, phaseId: string | null, state: "paid" | "due") => void;
}) {
  const [dueDate, setDueDate] = useState("");
  const [phaseId, setPhaseId] = useState<string>(NULL_VAL);
  const [state, setState] = useState<"paid" | "due">("due");
  if (!target) return null;
  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Confirm & date</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <div className="rounded border bg-muted/30 p-3 text-xs">
            <div className="font-medium">{target.description ?? "—"}</div>
            <div className="mt-1 text-muted-foreground">{fmt(Number(target.amount ?? 0))}</div>
          </div>
          <div>
            <label className="label-micro mb-1 block">Due date (required)</label>
            <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
          <div>
            <label className="label-micro mb-1 block">Phase</label>
            <Select value={phaseId} onValueChange={setPhaseId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={NULL_VAL}>No phase</SelectItem>
                {phases.map((ph) => (
                  <SelectItem key={ph.id} value={ph.id}>{ph.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="label-micro mb-1 block">State</label>
            <Select value={state} onValueChange={(v) => setState(v as "paid" | "due")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="due">Due</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button
            disabled={!dueDate}
            onClick={() => onConfirm(dueDate, phaseId === NULL_VAL ? null : phaseId, state)}
          >
            Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditPaymentDialog({
  target,
  onClose,
  phases,
  onSave,
}: {
  target: PaymentWithMeta | null;
  onClose: () => void;
  phases: Phase[];
  onSave: (patch: Record<string, unknown>) => void;
}) {
  const [amt, setAmt] = useState("");
  const [due, setDue] = useState("");
  const [phaseId, setPhaseId] = useState<string>(NULL_VAL);
  // Reset when target changes.
  useMemo(() => {
    if (target) {
      setAmt(target.amount == null ? "" : String(target.amount));
      setDue(target.due_date ?? "");
      setPhaseId(target.phase_id ?? NULL_VAL);
    }
  }, [target]);
  if (!target) return null;
  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit payment</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <div className="rounded border bg-muted/30 p-2 text-xs text-muted-foreground">
            {target.description ?? "—"}
          </div>
          <div>
            <label className="label-micro mb-1 block">Amount</label>
            <Input type="number" value={amt} onChange={(e) => setAmt(e.target.value)} className="num-tabular" />
          </div>
          <div>
            <label className="label-micro mb-1 block">Due date</label>
            <Input type="date" value={due} onChange={(e) => setDue(e.target.value)} />
          </div>
          <div>
            <label className="label-micro mb-1 block">Phase</label>
            <Select value={phaseId} onValueChange={setPhaseId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={NULL_VAL}>No phase</SelectItem>
                {phases.map((ph) => (
                  <SelectItem key={ph.id} value={ph.id}>{ph.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button
            onClick={() =>
              onSave({
                amount: amt === "" ? null : Number(amt),
                due_date: due || null,
                phase_id: phaseId === NULL_VAL ? null : phaseId,
              })
            }
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
