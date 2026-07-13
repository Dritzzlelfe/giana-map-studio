import { createFileRoute, Link } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { AppShell } from "@/components/shell/AppShell";
import { useItemsData } from "@/lib/useItemsData";

export const Route = createFileRoute("/_authenticated/schedule/")({
  head: () => ({ meta: [{ title: "Schedule — Project Map" }] }),
  component: SchedulePicker,
});

function SchedulePicker() {
  const { data, isLoading } = useItemsData();
  return (
    <AppShell>
      <div className="flex-1 overflow-auto p-6">
        <h2 className="mb-1 font-display text-lg font-semibold">Schedule by trade</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Pick a category to see every item across all rooms.
        </p>
        {isLoading && (
          <div className="text-muted-foreground">
            <Loader2 className="mr-2 inline h-4 w-4 animate-spin" /> Loading…
          </div>
        )}
        {data && (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {data.categories.map((c) => {
              const n = data.items.filter((i) => i.category_id === c.id && !i.is_fee && i.room_id != null).length;
              return (
                <Link
                  key={c.id}
                  to="/schedule/$categoryKey"
                  params={{ categoryKey: c.key }}
                  className="flex items-center justify-between rounded-md border bg-card px-3 py-2 text-sm hover:bg-accent"
                >
                  <span className="font-medium">{c.label}</span>
                  <span className="text-xs text-muted-foreground">{n}</span>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
