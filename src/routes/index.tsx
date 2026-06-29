import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Loader2, Network, List, Search, Download, Plus } from "lucide-react";
import { Toaster } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MindMapView } from "@/components/map/MindMapView";
import { OutlineView } from "@/components/map/OutlineView";
import { NodeDrawer } from "@/components/map/NodeDrawer";
import { DeleteNodeDialog } from "@/components/map/DeleteNodeDialog";
import { CategoryLegend } from "@/components/map/CategoryLegend";
import {
  useMap,
  useAddChild,
  useAddSibling,
  useUpdateNode,
  useDeleteNode,
} from "@/lib/useMapData";
import { descendantCount, type MapNode } from "@/lib/mapApi";
import { treeToJson, treeToMarkdown, downloadText } from "@/lib/exportMap";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Giana Allen Design — Project Map" },
      { name: "description", content: "Visual functional map of the GAD interior design project management tool." },
      { property: "og:title", content: "Giana Allen Design — Project Map" },
      { property: "og:description", content: "Visual functional map of the GAD interior design project management tool." },
    ],
  }),
  component: Index,
});

type ViewMode = "map" | "outline";

function Index() {
  const { data, isLoading, error } = useMap();
  const addChild = useAddChild();
  const addSibling = useAddSibling();
  const updateNode = useUpdateNode();
  const deleteNode = useDeleteNode();

  const [view, setView] = useState<ViewMode>("map");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const searchMatches = useMemo(() => {
    const set = new Set<string>();
    if (!data || !search.trim()) return set;
    const q = search.trim().toLowerCase();
    for (const n of data.nodes) {
      if (n.title.toLowerCase().includes(q) || (n.description ?? "").toLowerCase().includes(q)) {
        set.add(n.id);
        // bubble matches up so ancestors stay visible
        let p = n.parent_id;
        while (p) {
          set.add(p);
          p = data.byId[p]?.parent_id ?? null;
        }
      }
    }
    return set;
  }, [data, search]);

  const selected: MapNode | null = selectedId && data ? data.byId[selectedId] ?? null : null;
  const deleteNodeRow: MapNode | null = deleteTarget && data ? data.byId[deleteTarget] ?? null : null;
  const deleteCount = data && deleteTarget ? descendantCount(data, deleteTarget) : 0;

  const handleSelect = (id: string) => setSelectedId(id);
  const handleEdit = (id: string) => {
    setSelectedId(id);
    setDrawerOpen(true);
  };
  const handleAddChild = async (parentId: string) => {
    const n = await addChild.mutateAsync({ parentId, title: "New node" });
    setSelectedId(n.id);
    setEditingId(n.id);
  };
  const handleAddChildAt = async (parentId: string | null, pos: { x: number; y: number }) => {
    const n = await addChild.mutateAsync({ parentId, title: "New node", pos_x: pos.x, pos_y: pos.y });
    setSelectedId(n.id);
    setEditingId(n.id);
  };
  const handleAddSibling = async (siblingId: string) => {
    const n = await addSibling.mutateAsync({ siblingId, title: "New node" });
    setSelectedId(n.id);
    setEditingId(n.id);
  };
  const handleToggleCollapse = (id: string) => {
    if (!data) return;
    const n = data.byId[id];
    if (!n) return;
    updateNode.mutate({ id, patch: { collapsed: !n.collapsed } });
  };
  const handlePatch = (patch: Partial<MapNode>) => {
    if (!selected) return;
    updateNode.mutate({ id: selected.id, patch });
  };
  const handleDelete = (id: string) => setDeleteTarget(id);
  const confirmDelete = () => {
    if (!deleteTarget) return;
    deleteNode.mutate(deleteTarget);
    if (selectedId === deleteTarget) {
      setSelectedId(null);
      setDrawerOpen(false);
    }
    setDeleteTarget(null);
  };

  const handleExport = (kind: "json" | "md") => {
    if (!data?.tree) return;
    if (kind === "json") {
      downloadText("gad-project-map.json", treeToJson(data.tree), "application/json");
    } else {
      downloadText("gad-project-map.md", treeToMarkdown(data.tree), "text/markdown");
    }
  };

  const handleAddTopLevel = () => {
    if (!data?.rootId) return;
    handleAddChild(data.rootId);
  };

  const handleCommitTitle = (id: string, title: string) => {
    updateNode.mutate({ id, patch: { title } });
    setEditingId((cur) => (cur === id ? null : cur));
  };
  const handleEditingChange = (id: string, editing: boolean) => {
    if (!editing) setEditingId((cur) => (cur === id ? null : cur));
  };

  // Keyboard shortcut: "N" adds a child to the selected node (or top-level if none).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "n" && e.key !== "N") return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      const tag = t?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || t?.isContentEditable) return;
      if (deleteTarget || drawerOpen) return;
      if (!data) return;
      e.preventDefault();
      const parentId = selectedId ?? data.rootId;
      if (parentId) handleAddChild(parentId);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, data, deleteTarget, drawerOpen]);

  return (
    <div className="flex h-screen flex-col bg-background">
      <Toaster richColors position="top-right" />

      <header className="shrink-0 border-b bg-card/60 backdrop-blur">
        <div className="flex flex-wrap items-center gap-3 px-5 py-3">
          <div className="min-w-0">
            <h1 className="font-display text-xl font-semibold tracking-tight">
              Giana Allen Design <span className="text-muted-foreground">— Project Map</span>
            </h1>
            {data?.map.name && (
              <p className="truncate text-xs text-muted-foreground">{data.map.name}</p>
            )}
          </div>

          <div className="flex-1" />

          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search nodes…"
              className="h-9 w-56 pl-8"
            />
          </div>

          <ToggleGroup
            type="single"
            value={view}
            onValueChange={(v) => v && setView(v as ViewMode)}
            className="rounded-md border bg-card lg:hidden"
          >
            <ToggleGroupItem value="map" className="h-9 px-3">
              <Network className="mr-1.5 h-4 w-4" /> Map
            </ToggleGroupItem>
            <ToggleGroupItem value="outline" className="h-9 px-3">
              <List className="mr-1.5 h-4 w-4" /> Outline
            </ToggleGroupItem>
          </ToggleGroup>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-9">
                <Download className="mr-1.5 h-4 w-4" /> Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleExport("md")}>Markdown outline</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport("json")}>JSON</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button size="sm" className="h-9" onClick={handleAddTopLevel} disabled={!data?.rootId}>
            <Plus className="mr-1.5 h-4 w-4" /> Add node
          </Button>
        </div>
        <div className="border-t bg-background/50 px-5 py-2">
          <CategoryLegend />
        </div>
      </header>

      <main className="relative flex flex-1 min-h-0 flex-col lg:flex-row">
        {isLoading && (
          <div className="absolute inset-0 z-50 flex h-full items-center justify-center bg-background/80 text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading map…
          </div>
        )}
        {error && (
          <div className="absolute inset-0 z-50 flex h-full items-center justify-center bg-background/80 text-destructive">
            Failed to load map: {(error as Error).message}
          </div>
        )}
        {data && !data.tree && (
          <div className="absolute inset-0 z-50 flex h-full items-center justify-center bg-background/80 text-muted-foreground">
            Map is empty.
          </div>
        )}
        {data?.tree && (
          <>
            <div className={cn("flex-1 min-h-0", view === "outline" && "hidden lg:block")}>
              <MindMapView
                data={data}
                selectedId={selectedId}
                editingId={editingId}
                searchMatches={searchMatches}
                searchActive={search.trim().length > 0}
                onSelect={handleSelect}
                onAddChild={handleAddChild}
                onAddChildAt={handleAddChildAt}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onToggleCollapse={handleToggleCollapse}
                onCommitTitle={handleCommitTitle}
                onEditingChange={handleEditingChange}
              />
            </div>
            <div className={cn("border-l bg-background overflow-auto", view === "map" && "hidden lg:block", "lg:w-[35%] lg:max-w-[420px] lg:min-w-[300px]")}>
              <OutlineView
                data={data}
                selectedId={selectedId}
                editingId={editingId}
                searchMatches={searchMatches}
                searchActive={search.trim().length > 0}
                onSelect={handleSelect}
                onAddChild={handleAddChild}
                onAddSibling={handleAddSibling}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onToggleCollapse={handleToggleCollapse}
                onCommitTitle={handleCommitTitle}
                onEditingChange={handleEditingChange}
              />
            </div>
          </>
        )}
      </main>

      <NodeDrawer
        node={selected}
        open={drawerOpen && !!selected}
        onOpenChange={setDrawerOpen}
        onPatch={handlePatch}
      />

      <DeleteNodeDialog
        open={!!deleteNodeRow}
        title={deleteNodeRow?.title ?? ""}
        descendantCount={deleteCount}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
