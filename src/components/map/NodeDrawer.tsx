import { useEffect, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CATEGORIES, STATUSES, PRIORITIES } from "@/lib/categories";
import type { MapNode } from "@/lib/mapApi";

type Props = {
  node: MapNode | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPatch: (patch: Partial<MapNode>) => void;
};

const NONE = "__none__";

export function NodeDrawer({ node, open, onOpenChange, onPatch }: Props) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (node) {
      setTitle(node.title);
      setDescription(node.description ?? "");
    }
  }, [node?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!node) return null;

  const commitTitle = () => {
    const t = title.trim();
    if (t && t !== node.title) onPatch({ title: t });
    else if (!t) setTitle(node.title);
  };
  const commitDescription = () => {
    const d = description.trim() || null;
    if (d !== (node.description ?? null)) onPatch({ description: d });
  };

  const selValue = (v: string | null | undefined) => v ?? NONE;
  const parsedVal = (v: string) => (v === NONE ? null : v);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 sm:max-w-md">
        <SheetHeader className="border-b">
          <SheetTitle className="font-display">Edit node</SheetTitle>
          <SheetDescription>Changes save automatically.</SheetDescription>
        </SheetHeader>
        <div className="flex-1 space-y-5 overflow-auto p-6">
          <div className="space-y-2">
            <Label htmlFor="node-title">Title</Label>
            <Input
              id="node-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={commitTitle}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  (e.target as HTMLInputElement).blur();
                }
              }}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="node-desc">Description</Label>
            <Textarea
              id="node-desc"
              rows={5}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onBlur={commitDescription}
              placeholder="Notes, links, decisions…"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                value={selValue(node.category)}
                onValueChange={(v) => onPatch({ category: parsedVal(v) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select
                value={selValue(node.priority)}
                onValueChange={(v) => onPatch({ priority: parsedVal(v) })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="—" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>—</SelectItem>
                  {PRIORITIES.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={selValue(node.status)}
                onValueChange={(v) => onPatch({ status: parsedVal(v) })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="—" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>—</SelectItem>
                  {STATUSES.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="node-color">Color override</Label>
              <Input
                id="node-color"
                type="color"
                value={node.color ?? "#cccccc"}
                onChange={(e) => onPatch({ color: e.target.value })}
                className="h-10 cursor-pointer p-1"
              />
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
