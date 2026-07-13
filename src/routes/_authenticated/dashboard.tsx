import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { AppShell } from "@/components/shell/AppShell";
import { useItemsData } from "@/lib/useItemsData";
import { LOGISTICS_LOCATIONS, type Item, type LoadedData } from "@/lib/itemsApi";
import { ItemDrawer } from "@/components/items/ItemDrawer";
import { StatusBadge } from "@/components/items/StatusDot";
import { projectSpend } from "@/lib/budgetMath";

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
  const [editing, setEditing] = useState<Item | null>(null);

  const todo = useMemo(
    () => (data?.items ?? []).filter((i) => i.status === "to_spec" || i.status === "to_order"),
    [data],
  );
  const asap = useMemo(() => (data?.items ?? []).filter((i) => i.priority === "asap"), [data]);

  const cashflow = useMemo(() => {
    const months = new Map<
      string,
      { client_owes: number; gad_owes: number; balance_due: number }
    >();
    for (const it of data?.items ?? []) {
      if (!it.delivery_date) continue;
      const k = monthKey(it.delivery_date);
      const row = months.get(k) ?? { client_owes: 0, gad_owes: 0, balance_due: 0 };
      if (!it.client_paid_gad) row.client_owes += it.client_price ?? 0;
      if (!it.gad_paid_vendor) row.gad_owes += it.gad_cost ?? 0;
      row.balance_due += it.balance_due_on_delivery ?? 0;
      months.set(k, row);
    }
    return [...months.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [data]);

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

            <Card title="Budget cashflow (by delivery month)" className="lg:col-span-2">
              {cashflow.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No dated obligations yet — set delivery dates and money fields on items.
                </p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="text-xs uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="px-2 py-1 text-left">Month</th>
                      <th className="px-2 py-1 text-right">Client owes GAD</th>
                      <th className="px-2 py-1 text-right">GAD owes vendors</th>
                      <th className="px-2 py-1 text-right">Balance due on delivery</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cashflow.map(([month, row]) => (
                      <tr key={month} className="border-t">
                        <td className="px-2 py-1.5 font-medium">{month}</td>
                        <td className="px-2 py-1.5 text-right">{fmtMoney(row.client_owes)}</td>
                        <td className="px-2 py-1.5 text-right">{fmtMoney(row.gad_owes)}</td>
                        <td className="px-2 py-1.5 text-right">{fmtMoney(row.balance_due)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
