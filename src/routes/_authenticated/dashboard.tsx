import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Banknote, Loader2, Truck, Users2, Wallet } from "lucide-react";
import { AppShell } from "@/components/shell/AppShell";
import { HeroBand } from "@/components/ui/HeroBand";
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
        <div className="flex-1 overflow-auto">
          <div className="mx-auto max-w-[1600px] space-y-6 p-6 lg:p-8">
            <HeroBand
              eyebrow={`En chantier · ${data.rooms.length} pièces`}
              title="Candida Residence"
              lede="Le tableau de bord réunit chiffres, cadences et logistique — sans jamais inventer un paiement."
              right={
                <div className="hidden gap-6 md:flex">
                  <HeroStat label="Committed" value={totals.committed} count={totals.committedCount} />
                  <HeroStat label="Options" value={totals.options} count={totals.optionsCount} />
                </div>
              }
            />

            <section className="grid gap-4 sm:grid-cols-3">
              <Metric
                icon={Wallet}
                label="Committed"
                value={totals.committed}
                masked={totals.hasMaskedCommitted}
                count={totals.committedCount}
              />
              <Metric
                icon={Users2}
                label="Options"
                value={totals.options}
                masked={totals.hasMaskedOptions}
                count={totals.optionsCount}
              />
              <Metric
                icon={Banknote}
                label="Committed + options"
                value={
                  totals.committed != null && totals.options != null
                    ? totals.committed + totals.options
                    : null
                }
                masked={totals.hasMaskedCommitted || totals.hasMaskedOptions}
                count={totals.committedCount + totals.optionsCount}
              />
            </section>
            {(totals.hasMaskedCommitted || totals.hasMaskedOptions) && (
              <p className="text-xs italic text-muted-foreground">
                Certains montants sont masqués par votre rôle — les totaux excluent les lignes masquées.
              </p>
            )}

            <div className="grid gap-6 lg:grid-cols-2">
              <Card title={`ASAP`} eyebrow="Priorité haute" count={asap.length}>
                <ItemList items={asap} data={data} onEdit={setEditing} />
              </Card>
              <Card title={`À faire`} eyebrow="À spec / à commander" count={todo.length}>
                <ItemList
                  items={[...todo].sort((a, b) =>
                    (a.delivery_date ?? "9999").localeCompare(b.delivery_date ?? "9999"),
                  )}
                  data={data}
                  onEdit={setEditing}
                />
              </Card>

              <Card title="Personnes" eyebrow="Équipe projet" count={data.people.length}>
                <ul className="divide-y divide-[color:var(--rule-soft)] text-sm">
                  {data.people.map((p) => (
                    <li key={p.id} className="flex items-center justify-between py-2">
                      <span className="font-medium">{p.name}</span>
                      <span className="text-xs text-muted-foreground">{p.role ?? "—"}</span>
                    </li>
                  ))}
                </ul>
              </Card>
              <Card title="Fournisseurs" eyebrow="Vendors" count={data.vendors.length}>
                <ul className="divide-y divide-[color:var(--rule-soft)] text-sm">
                  {data.vendors.map((v) => (
                    <li key={v.id} className="flex items-center justify-between py-2">
                      <span className="font-medium">{v.name}</span>
                      <span
                        className={
                          v.account_status === "trade_account_open"
                            ? "rounded-sm bg-[color:var(--accent-brass-soft)] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[color:var(--walnut)]"
                            : "rounded-sm border border-[color:var(--rule-soft)] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"
                        }
                      >
                        {v.account_status === "trade_account_open" ? "Trade open" : "Purchased from"}
                      </span>
                    </li>
                  ))}
                </ul>
              </Card>
            </div>

            <Card title="Cashflow" eyebrow="Ce mois & le suivant" icon={Banknote}>
              {payments.length === 0 ? (
                <div className="rounded border border-dashed border-[color:var(--rule-soft)] p-8 text-center">
                  <Banknote
                    className="mx-auto mb-3 h-8 w-8 text-[color:var(--accent-brass)]"
                    strokeWidth={1.25}
                  />
                  <p className="font-display text-lg text-foreground">Aucun paiement enregistré</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Les mouvements apparaîtront à mesure qu'ils sont saisis.
                  </p>
                  <Link
                    to="/cashflow"
                    className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-[color:var(--primary)] hover:underline"
                  >
                    Ajouter un paiement →
                  </Link>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  <CashBucket label="This month" bucket={cashCard.thisMonth} />
                  <CashBucket label="Next month" bucket={cashCard.nextMonth} />
                </div>
              )}
            </Card>

            <Card title="Logistique" eyebrow="Board" icon={Truck}>
              <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-5">
                {LOGISTICS_LOCATIONS.map((loc) => {
                  const items = logisticsGroups[loc.id] ?? [];
                  return (
                    <div
                      key={loc.id}
                      className="rounded border border-[color:var(--rule-soft)] bg-[color:var(--surface-sand)]/60 p-3"
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <div className="label-micro">{loc.label}</div>
                        <span className="serif-num text-sm text-[color:var(--accent-brass)]">
                          {items.length}
                        </span>
                      </div>
                      <div className="space-y-1.5">
                        {items.slice(0, 4).map((it) => (
                          <button
                            key={it.id}
                            onClick={() => setEditing(it)}
                            className="w-full rounded border border-[color:var(--rule-soft)] bg-card p-2 text-left text-xs transition-colors hover:border-[color:var(--accent-brass)]"
                          >
                            <div className="truncate font-medium">{it.title}</div>
                            <div className="mt-0.5 text-muted-foreground">
                              {it.room_id ? data.roomById[it.room_id]?.name : "—"}
                            </div>
                          </button>
                        ))}
                        {items.length > 4 && (
                          <div className="text-[10px] italic text-muted-foreground">
                            +{items.length - 4} de plus
                          </div>
                        )}
                        {items.length === 0 && (
                          <div className="text-xs italic text-muted-foreground">—</div>
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

function CashBucket({
  label,
  bucket,
}: {
  label: string;
  bucket: { client: { total: number; count: number; masked: boolean }; vendor: { total: number; count: number; masked: boolean } };
}) {
  return (
    <div className="rounded border bg-muted/20 p-3">
      <div className="label-micro">{label}</div>
      <div className="mt-2 grid grid-cols-2 gap-3">
        <Lane title="Client → GAD" lane={bucket.client} />
        <Lane title="GAD → Vendor" lane={bucket.vendor} />
      </div>
    </div>
  );
}

function Lane({
  title,
  lane,
}: {
  title: string;
  lane: { total: number; count: number; masked: boolean };
}) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{title}</div>
      <div className="num-tabular text-lg font-light">
        {lane.count === 0 ? "—" : fmtMoney(lane.total)}
        {lane.masked && lane.count > 0 && (
          <span className="ml-1 text-xs italic text-muted-foreground">· partial</span>
        )}
      </div>
      <div className="text-[10px] text-muted-foreground">
        {lane.count} {lane.count === 1 ? "payment" : "payments"}
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
