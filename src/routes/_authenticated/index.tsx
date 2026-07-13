import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/shell/AppShell";
import { useItemsData } from "@/lib/useItemsData";
import { rollupStatus, countOptions, isVisibleInGrid, type Category, type Item, type Room } from "@/lib/itemsApi";
import { StatusDot } from "@/components/items/StatusDot";
import { CellPanel } from "@/components/items/CellPanel";
import { ItemDrawer } from "@/components/items/ItemDrawer";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/")({
  head: () => ({
    meta: [
      { title: "Matrix — Giana Allen Design Project Map" },
      { name: "description", content: "Rooms × categories matrix view over the project items." },
    ],
  }),
  component: MatrixPage,
});

function MatrixPage() {
  const { data, isLoading, error } = useItemsData();
  const [cell, setCell] = useState<{ room: Room; category: Category } | null>(null);
  const [editing, setEditing] = useState<Item | null>(null);
  const [hideEmptyCols, setHideEmptyCols] = useState(false);

  const grouped = useMemo(() => {
    const m = new Map<string, Item[]>();
    if (!data) return m;
    for (const it of data.items) {
      if (!isVisibleInGrid(it)) continue;
      if (!it.room_id || !it.category_id) continue;
      const k = `${it.room_id}::${it.category_id}`;
      const arr = m.get(k) ?? [];
      arr.push(it);
      m.set(k, arr);
    }
    return m;
  }, [data]);

  const activeRooms = useMemo(() => data?.rooms.filter((r) => r.active) ?? [], [data]);

  const categories = useMemo(() => {
    if (!data) return [];
    if (!hideEmptyCols) return data.categories;
    return data.categories.filter((c) =>
      activeRooms.some((r) => (grouped.get(`${r.id}::${c.id}`) ?? []).length > 0),
    );
  }, [data, hideEmptyCols, activeRooms, grouped]);

  const colTotals = useMemo(() => {
    const m = new Map<string, number>();
    for (const c of categories) {
      let n = 0;
      for (const r of activeRooms) n += (grouped.get(`${r.id}::${c.id}`) ?? []).length;
      m.set(c.id, n);
    }
    return m;
  }, [categories, activeRooms, grouped]);

  return (
    <AppShell>
      {isLoading && (
        <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
          Loading…
        </div>
      )}
      {error && <div className="p-6 text-destructive">{(error as Error).message}</div>}
      {data && (
        <div className="flex-1 overflow-hidden bg-paper">
          <div className="mx-auto flex h-full max-w-[1600px] flex-col px-8 pt-8">
            <header className="pb-5">
              <div className="label-micro">Project</div>
              <h1 className="mt-1 text-3xl font-light tracking-tight">
                {data.rooms[0] ? "Candida Smith" : "Project"}
              </h1>
              <div className="mt-1 text-sm text-muted-foreground">
                Rooms × trades — the full plan at a glance.
              </div>
            </header>

            <div className="flex items-end justify-between border-b border-[color:var(--rule-soft)] pb-3">
              <Legend />
              <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  checked={hideEmptyCols}
                  onChange={(e) => setHideEmptyCols(e.target.checked)}
                  className="h-3 w-3 accent-[color:var(--primary)]"
                />
                Hide empty trades
              </label>
            </div>

            <div className="mt-0 flex-1 overflow-auto">
              <table className="matrix-table w-full border-separate border-spacing-0 text-sm">
                <thead className="sticky top-0 z-20 bg-paper">
                  <tr>
                    <th className="sticky left-0 top-0 z-30 bg-paper px-4 py-3 text-left align-bottom hairline-b hairline-r">
                      <div className="label-micro">Room</div>
                    </th>
                    {categories.map((c) => (
                      <th
                        key={c.id}
                        className="min-w-[92px] bg-paper px-3 py-3 text-left align-bottom hairline-b"
                      >
                        <Link
                          to="/schedule/$categoryKey"
                          params={{ categoryKey: c.key }}
                          className="label-micro hover:text-foreground"
                        >
                          {c.label}
                        </Link>
                        <div className="mt-1 num-tabular text-[11px] font-light text-muted-foreground">
                          {colTotals.get(c.id) || ""}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {activeRooms.map((room) => {
                    const rowTotal = categories.reduce(
                      (n, c) => n + (grouped.get(`${room.id}::${c.id}`) ?? []).length,
                      0,
                    );
                    return (
                      <tr key={room.id} className="group">
                        <th className="sticky left-0 z-10 bg-paper px-4 py-4 text-left align-middle hairline-b hairline-r">
                          <Link
                            to="/room/$roomId"
                            params={{ roomId: room.id }}
                            className="flex items-baseline gap-3 hover:text-foreground"
                          >
                            <span className="text-[15px] font-normal tracking-tight">
                              {room.name}
                            </span>
                            <span className="num-tabular text-[11px] font-light text-muted-foreground">
                              {rowTotal || ""}
                            </span>
                          </Link>
                        </th>
                        {categories.map((c) => {
                          const items = grouped.get(`${room.id}::${c.id}`) ?? [];
                          const roll = rollupStatus(items);
                          const opts = countOptions(items);
                          const committed = items.length - opts;
                          const asap = items.some(
                            (i) => i.priority === "asap" && i.status !== "option",
                          );
                          const selected = cell?.room.id === room.id && cell?.category.id === c.id;
                          const isEmpty = items.length === 0;
                          return (
                            <td key={c.id} className="hairline-b p-0 align-middle">
                              <button
                                onClick={() => setCell({ room, category: c })}
                                className={cn(
                                  "group/cell relative flex h-[56px] w-full items-center justify-between gap-2 px-3 text-left transition-colors",
                                  selected
                                    ? "bg-[color:var(--accent-tint)] ring-1 ring-inset ring-[color:var(--primary)]"
                                    : "hover:bg-[color:var(--accent-tint)]",
                                )}
                              >
                                {isEmpty ? (
                                  <span className="text-[13px] font-light text-transparent transition-colors group-hover/cell:text-muted-foreground">
                                    +
                                  </span>
                                ) : (
                                  <span className="flex items-baseline gap-2">
                                    <StatusDot roll={roll} className="translate-y-[-2px]" />
                                    <span className="num-tabular text-[15px] font-normal text-foreground">
                                      {committed || ""}
                                    </span>
                                    {opts > 0 && (
                                      <span className="num-tabular text-[10.5px] text-muted-foreground">
                                        +{opts} opt
                                      </span>
                                    )}
                                  </span>
                                )}
                                {asap && (
                                  <span className="label-micro !text-[9px] text-[color:var(--primary)]">
                                    ASAP
                                  </span>
                                )}
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {data && (
        <>
          <CellPanel
            open={!!cell}
            onOpenChange={(o) => !o && setCell(null)}
            room={cell?.room ?? null}
            category={cell?.category ?? null}
            items={
              cell
                ? data.items.filter(
                    (i) => i.room_id === cell.room.id && i.category_id === cell.category.id,
                  )
                : []
            }
            data={data}
            onEdit={(it) => setEditing(it)}
          />
          <ItemDrawer
            item={editing}
            data={data}
            open={!!editing}
            onOpenChange={(o) => !o && setEditing(null)}
          />
        </>
      )}
    </AppShell>
  );
}

function Legend() {
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-muted-foreground">
      <span className="flex items-center gap-1.5">
        <StatusDot roll="all_delivered" /> settled
      </span>
      <span className="flex items-center gap-1.5">
        <StatusDot roll="in_motion" /> in flight
      </span>
      <span className="flex items-center gap-1.5">
        <StatusDot roll="needs_action" /> needs action
      </span>
      <span className="flex items-center gap-1.5">
        <StatusDot roll="empty" /> empty
      </span>
    </div>
  );
}
