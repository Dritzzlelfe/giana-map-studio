import { ChevronDown, ChevronRight, Plus, Pencil, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { categoryColorVar } from "@/lib/categories";
import { cn } from "@/lib/utils";
import type { LoadedMap, TreeNode } from "@/lib/mapApi";

type Props = {
  data: LoadedMap;
  selectedId: string | null;
  editingId: string | null;
  searchMatches: Set<string>;
  searchActive: boolean;
  onSelect: (id: string) => void;
  onAddChild: (id: string) => void;
  onAddSibling: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onToggleCollapse: (id: string) => void;
  onCommitTitle: (id: string, title: string) => void;
  onEditingChange: (id: string, editing: boolean) => void;
};

export function OutlineView(props: Props) {
  if (!props.data.tree) return null;

  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => {
    const all = new Set<string>();
    const walk = (n: TreeNode) => {
      all.add(n.id);
      n.children.forEach(walk);
    };
    walk(props.data.tree!);
    return all;
  });

  // Auto-expand ancestors when selectedId changes so the selected row is visible.
  useEffect(() => {
    const sid = props.selectedId;
    if (!sid || !props.data) return;
    setExpandedIds((prev) => {
      const next = new Set(prev);
      let current = props.data.byId[sid];
      while (current?.parent_id) {
        next.add(current.parent_id);
        current = props.data.byId[current.parent_id];
      }
      return next;
    });
  }, [props.selectedId]);

  // Scroll selected row into view.
  useEffect(() => {
    if (!props.selectedId) return;
    const el = document.getElementById("outline-" + props.selectedId);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [props.selectedId]);

  return (
    <div className="h-full overflow-auto p-6">
      <div className="mx-auto max-w-3xl">
        <OutlineRow node={props.data.tree} depth={0} {...props} expandedIds={expandedIds} setExpandedIds={setExpandedIds} />
      </div>
    </div>
  );
}

function OutlineRow({
  node,
  depth,
  data,
  selectedId,
  editingId,
  searchMatches,
  searchActive,
  onSelect,
  onAddChild,
  onAddSibling,
  onEdit,
  onDelete,
  onToggleCollapse,
  onCommitTitle,
  onEditingChange,
  expandedIds,
  setExpandedIds,
}: Props & { node: TreeNode; depth: number; expandedIds: Set<string>; setExpandedIds: React.Dispatch<React.SetStateAction<Set<string>>> }) {
  const [hover, setHover] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(node.title);
  const autoEditedRef = useRef(false);
  const collapsed = !expandedIds.has(node.id);
  const hasChildren = node.children.length > 0;
  const isRoot = depth === 0;
  const dim = searchActive && !searchMatches.has(node.id);
  const highlight = searchActive && searchMatches.has(node.id);

  useEffect(() => {
    if (editingId === node.id && !autoEditedRef.current) {
      autoEditedRef.current = true;
      setDraft(node.title);
      setEditing(true);
    }
    if (editingId !== node.id) autoEditedRef.current = false;
  }, [editingId, node.id, node.title]);

  useEffect(() => {
    if (!editing) setDraft(node.title);
  }, [node.title, editing]);

  useEffect(() => {
    onEditingChange(node.id, editing);
    if (editing) {
      requestAnimationFrame(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      });
    }
  }, [editing, node.id, onEditingChange]);

  const startEdit = () => {
    setDraft(node.title);
    setEditing(true);
  };
  const commit = () => {
    const next = draft.trim();
    if (next && next !== node.title) onCommitTitle(node.id, next);
    setEditing(false);
  };
  const cancel = () => {
    setDraft(node.title);
    setEditing(false);
  };

  const toggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!hasChildren) return;
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(node.id)) next.delete(node.id);
      else next.add(node.id);
      return next;
    });
    // Also propagate to the map's collapse state for consistency.
    onToggleCollapse(node.id);
  };

  return (
    <div>
      <div
        id={"outline-" + node.id}
        className={cn(
          "group flex items-center gap-1.5 rounded-lg px-2 py-1.5 transition-colors",
          selectedId === node.id && "bg-secondary",
          highlight && "bg-amber-100/60",
          dim && "opacity-40",
          !selectedId && "hover:bg-secondary/60"
        )}
        style={{ marginLeft: depth * 18 }}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        onClick={() => onSelect(node.id)}
        onDoubleClick={(e) => {
          e.stopPropagation();
          startEdit();
        }}
        onKeyDown={(e) => {
          if (!editing && selectedId === node.id && (e.key === "Enter" || e.key === "F2")) {
            e.preventDefault();
            startEdit();
          }
        }}
        tabIndex={selectedId === node.id ? 0 : -1}
      >
        <button
          type="button"
          className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30"
          onClick={toggleExpand}
          disabled={!hasChildren}
          aria-label={collapsed ? "Expand" : "Collapse"}
        >
          {hasChildren ? (
            collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />
          ) : (
            <span className="h-1 w-1 rounded-full bg-muted-foreground/40" />
          )}
        </button>
        <span
          className="h-2 w-2 shrink-0 rounded-full"
          style={{ backgroundColor: categoryColorVar(node.category) }}
        />
        {editing ? (
          <input
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            onBlur={commit}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === "Enter") {
                e.preventDefault();
                commit();
              } else if (e.key === "Escape") {
                e.preventDefault();
                cancel();
              }
            }}
            className={cn(
              "min-w-0 flex-1 bg-transparent outline-none border-b border-dashed border-border",
              isRoot ? "font-display text-base font-semibold" : "text-sm"
            )}
          />
        ) : (
          <span className={cn("min-w-0 flex-1 truncate cursor-text", isRoot ? "font-display text-base font-semibold" : "text-sm")}>
            {node.title}
          </span>
        )}
        {node.priority === "asap" && !editing && (
          <span className="rounded-full bg-destructive/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-destructive">
            ASAP
          </span>
        )}
        {!editing && (
          <div className={cn("flex shrink-0 items-center gap-0.5", !(hover || selectedId === node.id) && "invisible")}>
            <IconBtn label="Add child" onClick={(e) => { e.stopPropagation(); onAddChild(node.id); }}>
              <Plus className="h-3.5 w-3.5" />
            </IconBtn>
            {!isRoot && (
              <IconBtn label="Add sibling" onClick={(e) => { e.stopPropagation(); onAddSibling(node.id); }}>
                <Plus className="h-3.5 w-3.5 rotate-45" />
              </IconBtn>
            )}
            <IconBtn label="Edit details" onClick={(e) => { e.stopPropagation(); onEdit(node.id); }}>
              <Pencil className="h-3.5 w-3.5" />
            </IconBtn>
            {!isRoot && (
              <IconBtn label="Delete" danger onClick={(e) => { e.stopPropagation(); onDelete(node.id); }}>
                <Trash2 className="h-3.5 w-3.5" />
              </IconBtn>
            )}
          </div>
        )}
      </div>
      {!collapsed && hasChildren && (
        <div>
          {node.children.map((c) => (
            <OutlineRow
              key={c.id}
              node={c}
              depth={depth + 1}
              data={data}
              selectedId={selectedId}
              editingId={editingId}
              searchMatches={searchMatches}
              searchActive={searchActive}
              onSelect={onSelect}
              onAddChild={onAddChild}
              onAddSibling={onAddSibling}
              onEdit={onEdit}
              onDelete={onDelete}
              onToggleCollapse={onToggleCollapse}
              onCommitTitle={onCommitTitle}
              onEditingChange={onEditingChange}
              expandedIds={expandedIds}
              setExpandedIds={setExpandedIds}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function IconBtn({
  children,
  label,
  onClick,
  danger,
}: {
  children: React.ReactNode;
  label: string;
  onClick: (e: React.MouseEvent) => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className={cn(
        "rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground",
        danger && "hover:bg-destructive/10 hover:text-destructive"
      )}
    >
      {children}
    </button>
  );
}
