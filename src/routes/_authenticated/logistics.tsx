import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Loader2, Truck, AlertTriangle, Printer, MapPin } from "lucide-react";
import { AppShell } from "@/components/shell/AppShell";
import { useItemsData, useUpdateItem } from "@/lib/useItemsData";
import { LOGISTICS_LOCATIONS, type Item, type LoadedData } from "@/lib/itemsApi";
import { ItemDrawer } from "@/components/items/ItemDrawer";
import { StatusBadge } from "@/components/items/StatusDot";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/logistics")({
  head: () => ({ meta: [{ title: "Logistics — Project Map" }] }),
  component: LogisticsPage,
});

const COLUMNS: { id: string | null; label: string }[] = [
  { id: null, label: "Unset" },
  ...LOGISTICS_LOCATIONS.map((l) => ({ id: l.id as string | null, label: l.label })),
];

function LogisticsPage() {
  const { data, isLoading } = useItemsData();
  const [editing, setEditing] = useState<Item | null>(null);

  const items = useMemo(() => (data?.items ?? []).filter((i) => !i.is_fee), [data]);

  const pending = useMemo(() => items.filter((i) => i.delivery_address_pending), [items]);

  const byColumn = useMemo(() => {
    const map = new Map<string, Item[]>();
    for (const it of items) {
      const k = it.logistics_location ?? "__unset";
      (map.get(k) ?? map.set(k, []).get(k)!).push(it);
    }
    return map;
  }, [items]);

  return (
    <AppShell>
      <div className="flex-1 overflow-auto p-6">
        <div className="mb-4 flex items-center gap-3">
          <Truck className="h-5 w-5 text-[color:var(--primary)]" strokeWidth={1.5} />
          <h2 className="font-display text-lg font-semibold">Logistics</h2>
          <span className="ml-2 text-xs text-muted-foreground">
            Drag-and-drop deferred — use each card's "Move to…" for now.
          </span>
        </div>

        {isLoading && (
          <div className="text-muted-foreground">
            <Loader2 className="mr-2 inline h-4 w-4 animate-spin" /> Loading…
          </div>
        )}

        {data && (
          <>
            {pending.length > 0 && (
              <PendingBanner items={pending} data={data} onOpen={setEditing} />
            )}

            <Tabs defaultValue="board" className="mt-4">
              <TabsList>
                <TabsTrigger value="board">Board</TabsTrigger>
                <TabsTrigger value="manifest">France manifest</TabsTrigger>
                <TabsTrigger value="install">Install day</TabsTrigger>
                <TabsTrigger value="parties">Parties</TabsTrigger>
              </TabsList>

              <TabsContent value="board" className="mt-4">
                <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-5">
                  {COLUMNS.map((col) => {
                    const key = col.id ?? "__unset";
                    const rows = byColumn.get(key) ?? [];
                    return (
                      <BoardColumn
                        key={key}
                        label={col.label}
                        items={rows}
                        data={data}
                        onEdit={setEditing}
                      />
                    );
                  })}
                </div>
              </TabsContent>

              <TabsContent value="manifest" className="mt-4">
                <ManifestTable
                  items={items.filter(
                    (i) =>
                      i.logistics_location === "france_ship" ||
                      i.logistics_location === "mississippi_truck" ||
                      i.logistics_location === "mississippi_warehouse",
                  )}
                  data={data}
                />
              </TabsContent>

              <TabsContent value="install" className="mt-4">
                <InstallDay
                  items={items.filter((i) => i.logistics_location !== "residence")}
                  data={data}
                />
              </TabsContent>

              <TabsContent value="parties" className="mt-4">
                <PartiesPanel data={data} />
              </TabsContent>
            </Tabs>
          </>
        )}

        <ItemDrawer
          item={editing}
          data={data as LoadedData}
          open={!!editing}
          onOpenChange={(o) => !o && setEditing(null)}
        />
      </div>
    </AppShell>
  );
}

function PendingBanner({
  items,
  data,
  onOpen,
}: {
  items: Item[];
  data: LoadedData;
  onOpen: (i: Item) => void;
}) {
  return (
    <div className="rounded-md border border-[color:var(--primary)] bg-[color:var(--primary)]/5 p-3">
      <div className="mb-2 flex items-center gap-2 text-sm font-medium">
        <AlertTriangle className="h-4 w-4 text-[color:var(--primary)]" strokeWidth={1.5} />
        {items.length} item{items.length === 1 ? "" : "s"} with pending delivery address
      </div>
      <ul className="divide-y text-sm">
        {items.map((it) => (
          <li key={it.id} className="flex items-center justify-between py-1.5">
            <button className="text-left hover:underline" onClick={() => onOpen(it)}>
              <span className="font-medium">{it.title}</span>
              {it.room_id && (
                <span className="ml-2 text-xs text-muted-foreground">
                  · {data.roomById[it.room_id]?.name}
                </span>
              )}
            </button>
            <Button size="sm" variant="outline" onClick={() => onOpen(it)}>
              Confirm address
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function BoardColumn({
  label,
  items,
  data,
  onEdit,
}: {
  label: string;
  items: Item[];
  data: LoadedData;
  onEdit: (i: Item) => void;
}) {
  return (
    <div className="rounded-md border bg-muted/20 p-2">
      <div className="mb-2 flex items-center justify-between">
        <div className="label-micro">{label}</div>
        <span className="text-xs text-muted-foreground">{items.length}</span>
      </div>
      <div className="space-y-1.5">
        {items.map((it) => (
          <BoardCard key={it.id} item={it} data={data} onEdit={onEdit} currentLocation={label} />
        ))}
        {items.length === 0 && (
          <div className="rounded border border-dashed p-4 text-center text-xs text-muted-foreground">
            —
          </div>
        )}
      </div>
    </div>
  );
}

function BoardCard({
  item,
  data,
  onEdit,
  currentLocation,
}: {
  item: Item;
  data: LoadedData;
  onEdit: (i: Item) => void;
  currentLocation: string;
}) {
  const update = useUpdateItem();
  return (
    <div className="rounded border bg-card p-2 text-xs">
      <button className="w-full text-left hover:underline" onClick={() => onEdit(item)}>
        <div className="flex items-start justify-between gap-1">
          <span className="font-medium truncate">{item.title}</span>
          <StatusBadge status={item.status} />
        </div>
        <div className="mt-0.5 text-muted-foreground">
          {item.room_id ? data.roomById[item.room_id]?.name : "—"}
          {item.vendor_id && (
            <span> · {data.vendorById[item.vendor_id]?.name}</span>
          )}
        </div>
      </button>
      <div className="mt-1.5">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="h-6 w-full justify-start px-2 text-[10px]">
              Move to…
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-52 p-1" align="start">
            {COLUMNS.map((c) => (
              <button
                key={c.id ?? "__unset"}
                className={cn(
                  "flex w-full items-center rounded px-2 py-1.5 text-xs hover:bg-accent",
                  currentLocation === c.label && "font-semibold",
                )}
                onClick={() =>
                  update.mutate({
                    id: item.id,
                    patch: { logistics_location: c.id },
                  })
                }
              >
                {c.label}
              </button>
            ))}
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}

function ManifestTable({ items, data }: { items: Item[]; data: LoadedData }) {
  return (
    <div className="rounded-md border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-display text-base font-semibold">France container manifest</h3>
        <Button variant="outline" size="sm" onClick={() => window.print()}>
          <Printer className="mr-1.5 h-4 w-4" strokeWidth={1.5} /> Print
        </Button>
      </div>
      <ItemsTable items={items} data={data} />
    </div>
  );
}

function InstallDay({ items, data }: { items: Item[]; data: LoadedData }) {
  const byLoc = new Map<string, Item[]>();
  for (const it of items) {
    const k = it.logistics_location ?? "__unset";
    (byLoc.get(k) ?? byLoc.set(k, []).get(k)!).push(it);
  }
  const labelOf = (k: string) =>
    k === "__unset" ? "Unset" : LOGISTICS_LOCATIONS.find((l) => l.id === k)?.label ?? k;
  return (
    <div className="rounded-md border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-display text-base font-semibold">Install day — converging on residence</h3>
        <Button variant="outline" size="sm" onClick={() => window.print()}>
          <Printer className="mr-1.5 h-4 w-4" strokeWidth={1.5} /> Print
        </Button>
      </div>
      {[...byLoc.entries()].map(([k, rows]) => (
        <div key={k} className="mb-4">
          <h4 className="mb-1.5 label-micro">
            From {labelOf(k)} ({rows.length})
          </h4>
          <ItemsTable items={rows} data={data} />
        </div>
      ))}
    </div>
  );
}

function ItemsTable({ items, data }: { items: Item[]; data: LoadedData }) {
  if (items.length === 0)
    return <p className="text-sm text-muted-foreground">Nothing here.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[520px] text-sm">
        <thead className="text-xs uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="px-2 py-1 text-left">Item</th>
            <th className="px-2 py-1 text-left">Room</th>
            <th className="px-2 py-1 text-left">Vendor</th>
            <th className="px-2 py-1 text-right">Qty</th>
          </tr>
        </thead>
        <tbody>
          {items.map((i) => (
            <tr key={i.id} className="border-t">
              <td className="px-2 py-1.5 font-medium">{i.title}</td>
              <td className="px-2 py-1.5 text-muted-foreground">
                {i.room_id ? data.roomById[i.room_id]?.name : "—"}
              </td>
              <td className="px-2 py-1.5 text-muted-foreground">
                {i.vendor_id ? data.vendorById[i.vendor_id]?.name : "—"}
              </td>
              <td className="px-2 py-1.5 text-right num-tabular">{i.qty_needed ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PartiesPanel({ data }: { data: LoadedData }) {
  const logisticsVendors = data.vendors.filter((v) =>
    /brownstone|storage|movers|pc richard|paige/i.test(
      `${v.name} ${v.contact_name ?? ""} ${v.notes ?? ""}`,
    ),
  );
  const logisticsPeople = data.people.filter((p) =>
    /logistics|movers|storage|paige/i.test(
      `${p.role ?? ""} ${p.notes ?? ""} ${p.name}`,
    ),
  );
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="rounded-md border bg-card p-4">
        <h3 className="mb-2 font-display text-base font-semibold">Vendors (logistics)</h3>
        {logisticsVendors.length === 0 && (
          <p className="text-sm text-muted-foreground">
            None matched. Tag vendors with "storage", "movers", "Brownstone" etc. in their notes.
          </p>
        )}
        <ul className="divide-y text-sm">
          {logisticsVendors.map((v) => (
            <li key={v.id} className="py-2">
              <div className="flex items-center gap-2">
                <MapPin className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.5} />
                <span className="font-medium">{v.name}</span>
              </div>
              {v.contact_info && (
                <div className="ml-5 text-xs text-muted-foreground">{v.contact_info}</div>
              )}
              {v.notes && <div className="ml-5 text-xs text-muted-foreground">{v.notes}</div>}
            </li>
          ))}
        </ul>
      </div>
      <div className="rounded-md border bg-card p-4">
        <h3 className="mb-2 font-display text-base font-semibold">People</h3>
        {logisticsPeople.length === 0 && (
          <p className="text-sm text-muted-foreground">No people with logistics roles yet.</p>
        )}
        <ul className="divide-y text-sm">
          {logisticsPeople.map((p) => (
            <li key={p.id} className="py-2">
              <div className="font-medium">{p.name}</div>
              {p.role && <div className="text-xs text-muted-foreground">{p.role}</div>}
              {p.notes && <div className="text-xs text-muted-foreground">{p.notes}</div>}
            </li>
          ))}
        </ul>
      </div>
      <div className="rounded-md border-2 border-dashed border-[color:var(--primary)]/50 bg-[color:var(--primary)]/5 p-4 md:col-span-2">
        <div className="flex items-center gap-2 text-sm font-medium">
          <AlertTriangle className="h-4 w-4 text-[color:var(--primary)]" strokeWidth={1.5} />
          Open point
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          PC Richard storage facility name — still to confirm with Kimberly.
        </p>
      </div>
    </div>
  );
}
