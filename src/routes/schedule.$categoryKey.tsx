import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { AppShell } from "@/components/shell/AppShell";
import { useItemsData } from "@/lib/useItemsData";
import { ItemsTable } from "@/components/items/ItemsTable";
import { ItemDrawer } from "@/components/items/ItemDrawer";
import type { Item } from "@/lib/itemsApi";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/schedule/$categoryKey")({
  head: () => ({ meta: [{ title: "Schedule — Project Map" }] }),
  component: SchedulePage,
});

function SchedulePage() {
  const { categoryKey } = useParams({ from: "/schedule/$categoryKey" });
  const { data, isLoading, error } = useItemsData();
  const [editing, setEditing] = useState<Item | null>(null);

  const category = data?.categoryByKey[categoryKey] ?? null;
  const items = data
    ? data.items
        .filter((i) => category && i.category_id === category.id)
        .sort((a, b) => (a.delivery_date ?? "9999").localeCompare(b.delivery_date ?? "9999"))
    : [];

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
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <span className="text-sm text-muted-foreground">Schedule by trade:</span>
            {data.categories.map((c) => (
              <Link
                key={c.id}
                to="/schedule/$categoryKey"
                params={{ categoryKey: c.key }}
                className={cn(
                  "rounded border px-2 py-1 text-sm transition-colors",
                  c.key === categoryKey
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card hover:bg-accent",
                )}
              >
                {c.label}
              </Link>
            ))}
          </div>
          {!category ? (
            <div className="rounded-md border border-dashed p-10 text-center text-muted-foreground">
              Category not found.
            </div>
          ) : (
            <>
              <h2 className="mb-3 font-display text-lg font-semibold">{category.label} — across all rooms</h2>
              <ItemsTable items={items} data={data} onEdit={setEditing} showRoom showCategory={false} />
            </>
          )}
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
