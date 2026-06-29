import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { StatusBadge } from "./StatusDot";
import { useCreateItem, useDeleteItem } from "@/lib/useItemsData";
import type { Category, Item, LoadedData, Room } from "@/lib/itemsApi";
import { useState } from "react";
import { Input } from "@/components/ui/input";

type Props = {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  room: Room | null;
  category: Category | null;
  items: Item[];
  data: LoadedData;
  onEdit: (item: Item) => void;
};

export function CellPanel({ open, onOpenChange, room, category, items, data, onEdit }: Props) {
  const [newTitle, setNewTitle] = useState("");
  const create = useCreateItem();
  const del = useDeleteItem();
  if (!room || !category) return null;

  const handleCreate = async () => {
    const title = newTitle.trim() || "Untitled item";
    const it = await create.mutateAsync({
      title,
      room_id: room.id,
      category_id: category.id,
      status: "to_spec",
    });
    setNewTitle("");
    onEdit(it);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="font-display text-xl">
            {room.name} <span className="text-muted-foreground">·</span> {category.label}
          </SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-2">
          {items.length === 0 && (
            <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
              No items yet for this cell.
            </div>
          )}
          {items.map((it) => (
            <div
              key={it.id}
              className="flex items-center gap-2 rounded-md border bg-card p-3 hover:bg-accent/40"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <button
                    className="truncate text-left font-medium hover:underline"
                    onClick={() => onEdit(it)}
                  >
                    {it.title}
                  </button>
                  {it.priority === "asap" && (
                    <span className="rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-rose-800">
                      ASAP
                    </span>
                  )}
                </div>
                <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                  <StatusBadge status={it.status} />
                  {it.vendor_id && <span>{data.vendorById[it.vendor_id]?.name}</span>}
                  {it.delivery_date && <span>· {it.delivery_date}</span>}
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => onEdit(it)}>
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="text-destructive"
                onClick={() => {
                  if (confirm(`Delete "${it.title}"?`)) del.mutate(it.id);
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>

        <div className="mt-6 flex gap-2 border-t pt-4">
          <Input
            placeholder="New item title…"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreate();
            }}
          />
          <Button onClick={handleCreate}>
            <Plus className="mr-1.5 h-4 w-4" /> Add
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
