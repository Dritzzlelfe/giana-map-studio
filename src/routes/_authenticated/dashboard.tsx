import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { AppShell } from "@/components/shell/AppShell";
import { useItemsData } from "@/lib/useItemsData";
import { LOGISTICS_LOCATIONS, type Item, type LoadedData } from "@/lib/itemsApi";
import { ItemDrawer } from "@/components/items/ItemDrawer";
import { StatusBadge } from "@/components/items/StatusDot";
import { projectSpend, dashboardCashCard, type PaymentWithMeta } from "@/lib/budgetMath";
import { useAllPayments } from "@/lib/useAllPayments";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Project Map" }] }),
  component: DashboardPage,
});

function fmtMoney(n: number | null | undefined) {
  if (n === null || n === undefined) return "—";
  return n.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}
function monthKey(d: string) {
  return d.slice(0, 7);
}

function DashboardPage() {
  const { data, isLoading, error } = useItemsData();
  const { data: payments = [] } = useAllPayments();
  const [editing, setEditing] = useState<Item | null>(null);

  const todo = useMemo(
    () => (data?.items ?? []).filter((i) => i.status === "to_spec" || i.status === "to_order"),
    [data],
  );
  const asap = useMemo(() => (data?.items ?? []).filter((i) => i.priority === "asap"), [data]);

  const totals = useMemo(() => projectSpend(data?.items ?? []), [data]);

  // Real cashflow card — driven by payments_visible (not fabricated from item
  // statuses). Same math as the /cashflow route.
  const cashCard = useMemo(
    () => dashboardCashCard(payments as PaymentWithMeta[]),
    [payments],
  );

  const logisticsGroups = useMemo(() => {
    const groups: Record<string, Item[]> = {};
    for (const it of data?.items ?? []) {
      const k = it.logistics_location ?? "na";
      (groups[k] ??= []).push(it);
    }
    return groups;
  }, [data]);

  return (
    <AppShell>
      {isLoading && (
        <div className="flex flex-1 items-center justify-center text-muted-foreground">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading…
        </div>
      )}
      {error && <div className="p-6 text-destructive">{(error as Error).message}</div>}
      {data && (
        <div className="flex-1 overflow-auto p-5">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card title="Project totals" className="lg:col-span-2">
              <div className="grid gap-4 sm:grid-cols-3">
                <Metric
                  label="Committed"
                  value={totals.committed}
                  masked={totals.hasMaskedCommitted}
                  count={totals.committedCount}
                />
                <Metric
                  label="Options"
                  value={totals.options}
                  masked={totals.hasMaskedOptions}
                  count={totals.optionsCount}
                />
                <Metric
                  label="Total (committed + options)"
                  value={
                    totals.committed != null && totals.options != null
                      ? totals.committed + totals.options
                      : null
                  }
                  masked={totals.hasMaskedCommitted || totals.hasMaskedOptions}
                  count={totals.committedCount + totals.optionsCount}
                />
              </div>
              {(totals.hasMaskedCommitted || totals.hasMaskedOptions) && (
                <p className="mt-3 text-xs text-muted-foreground">
                  Some money values are hidden by your role — totals shown exclude masked rows.
                </p>
              )}
            </Card>


            <Card title={`ASAP (${asap.length})`}>
              <ItemList items={asap} data={data} onEdit={setEditing} />
            </Card>
            <Card title={`To-Do (${todo.length})`}>
              <ItemList
                items={[...todo].sort((a, b) =>
                  (a.delivery_date ?? "9999").localeCompare(b.delivery_date ?? "9999"),
                )}
                data={data}
                onEdit={setEditing}
              />
            </Card>

            <Card title={`People (${data.people.length})`}>
              <ul className="divide-y text-sm">
                {data.people.map((p) => (
                  <li key={p.id} className="flex items-center justify-between py-1.5">
                    <span className="font-medium">{p.name}</span>
                    <span className="text-xs text-muted-foreground">{p.role ?? "—"}</span>
                  </li>
                ))}
              </ul>
            </Card>
            <Card title={`Vendors (${data.vendors.length})`}>
              <ul className="divide-y text-sm">
                {data.vendors.map((v) => (
                  <li key={v.id} className="flex items-center justify-between py-1.5">
                    <span className="font-medium">{v.name}</span>
                    <span
                      className={
                        v.account_status === "trade_account_open"
                          ? "rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-amber-800"
                          : "rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-emerald-800"
                      }
                    >
                      {v.account_status === "trade_account_open" ? "Trade open" : "Purchased from"}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>

            <Card title="Cashflow — this month & next" className="lg:col-span-2">
              {payments.length === 0 ? (
                <div className="text-sm text-muted-foreground">
                  No payments yet.{" "}
                  <Link to="/cashflow" className="text-[color:var(--primary)] hover:underline">
                    Add one in Cashflow →
                  </Link>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  <CashBucket label="This month" bucket={cashCard.thisMonth} />
                  <CashBucket label="Next month" bucket={cashCard.nextMonth} />
                </div>
              )}
            </Card>

            <Card title="Logistics board" className="lg:col-span-2">
              <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-5">
                {LOGISTICS_LOCATIONS.map((loc) => {
                  const items = logisticsGroups[loc.id] ?? [];
                  return (
                    <div key={loc.id} className="rounded border bg-muted/30 p-2">
                      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {loc.label}{" "}
                        <span className="ml-1 text-muted-foreground/70">({items.length})</span>
                      </div>
                      <div className="space-y-1">
                        {items.map((it) => (
                          <button
                            key={it.id}
                            onClick={() => setEditing(it)}
                            className="w-full rounded border bg-card p-2 text-left text-xs hover:bg-accent/40"
                          >
                            <div className="font-medium">{it.title}</div>
                            <div className="mt-0.5 text-muted-foreground">
                              {it.room_id ? data.roomById[it.room_id]?.name : "—"}
                            </div>
                          </button>
                        ))}
                        {items.length === 0 && (
                          <div className="text-xs text-muted-foreground">—</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>

          <ItemDrawer
            item={editing}
            data={data}
            open={!!editing}
            onOpenChange={(o) => !o && setEditing(null)}
          />
        </div>
      )}
    </AppShell>
  );
}

function Card({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-md border bg-card p-4 ${className ?? ""}`}>
      <h2 className="mb-3 font-display text-base font-semibold">{title}</h2>
      {children}
    </div>
  );
}

function Metric({
  label,
  value,
  masked,
  count,
}: {
  label: string;
  value: number | null;
  masked: boolean;
  count: number;
}) {
  return (
    <div className="rounded border bg-muted/20 p-3">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 num-tabular text-2xl font-light tracking-tight">
        {value == null ? "—" : fmtMoney(value)}
        {masked && value != null && (
          <span className="ml-1 text-xs font-normal text-muted-foreground">·  partial</span>
        )}
      </div>
      <div className="mt-0.5 text-xs text-muted-foreground">
        {count} {count === 1 ? "item" : "items"}
      </div>
    </div>
  );
}

function ItemList({
  items,
  data,
  onEdit,
}: {
  items: Item[];
  data: LoadedData;
  onEdit: (i: Item) => void;
}) {
  if (items.length === 0) return <p className="text-sm text-muted-foreground">Nothing here.</p>;
  return (
    <ul className="divide-y text-sm">
      {items.map((it) => (
        <li key={it.id} className="flex items-center justify-between gap-2 py-1.5">
          <button onClick={() => onEdit(it)} className="min-w-0 flex-1 text-left hover:underline">
            <div className="truncate font-medium">{it.title}</div>
            <div className="text-xs text-muted-foreground">
              {it.room_id ? data.roomById[it.room_id]?.name : "—"}
              {it.delivery_date && <span> · {it.delivery_date}</span>}
            </div>
          </button>
          <StatusBadge status={it.status} />
        </li>
      ))}
    </ul>
  );
}
