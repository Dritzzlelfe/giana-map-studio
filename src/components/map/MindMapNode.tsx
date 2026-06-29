import { Handle, Position, type NodeProps } from "reactflow";
import { Plus, Pencil, Trash2, ChevronDown, ChevronRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { categoryColorVar, categoryLabel } from "@/lib/categories";
import { cn } from "@/lib/utils";

export type MindNodeData = {
  id: string;
  title: string;
  category: string | null;
  priority: string | null;
  isRoot: boolean;
  hasChildren: boolean;
  collapsed: boolean;
  highlighted: boolean;
  dimmed: boolean;
  autoEdit: boolean;
  onSelect: (id: string) => void;
  onAddChild: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onToggleCollapse: (id: string) => void;
  onCommitTitle: (id: string, title: string) => void;
  onEditingChange: (id: string, editing: boolean) => void;
};

export function MindMapNode({ data, selected }: NodeProps<MindNodeData>) {
  const color = categoryColorVar(data.category);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(data.title);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const autoEditedRef = useRef(false);

  useEffect(() => {
    if (data.autoEdit && !autoEditedRef.current) {
      autoEditedRef.current = true;
      setDraft(data.title);
      setEditing(true);
    }
  }, [data.autoEdit, data.title]);

  useEffect(() => {
    if (!editing) setDraft(data.title);
  }, [data.title, editing]);

  useEffect(() => {
    data.onEditingChange(data.id, editing);
    if (editing) {
      requestAnimationFrame(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      });
    }
  }, [editing, data]);

  const startEdit = () => {
    setDraft(data.title);
    setEditing(true);
  };

  const commit = () => {
    const next = draft.trim();
    if (next && next !== data.title) {
      data.onCommitTitle(data.id, next);
    }
    setEditing(false);
  };
  const cancel = () => {
    setDraft(data.title);
    setEditing(false);
  };

  return (
    <div
      className={cn(
        "group relative rounded-2xl bg-card text-card-foreground border transition-all",
        "shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-12px_rgba(20,30,60,0.12)]",
        data.isRoot ? "px-5 py-4 min-w-[240px]" : "px-3.5 py-2.5 min-w-[180px]",
        selected ? "ring-2 ring-primary border-primary/30" : "border-border/70 hover:border-border",
        data.dimmed && "opacity-30",
        data.highlighted && "ring-2 ring-amber-400 border-amber-400/40",
      )}
      style={data.isRoot ? { background: `linear-gradient(135deg, ${color} 0%, oklch(0.28 0.06 280) 100%)` } : undefined}
      onClick={() => data.onSelect(data.id)}
      onDoubleClick={(e) => {
        e.stopPropagation();
        startEdit();
      }}
      onKeyDown={(e) => {
        if (!editing && selected && (e.key === "Enter" || e.key === "F2")) {
          e.preventDefault();
          startEdit();
        }
      }}
      tabIndex={selected ? 0 : -1}
    >
      <Handle type="target" position={Position.Left} className="!opacity-0" />
      <Handle type="source" position={Position.Right} className="!opacity-0" />

      <div className="flex items-start gap-2">
        {!data.isRoot && (
          <span
            className="mt-1.5 inline-block h-2 w-2 shrink-0 rounded-full"
            style={{ backgroundColor: color }}
            title={categoryLabel(data.category)}
          />
        )}
        <div className="min-w-0 flex-1">
          {editing ? (
            <input
              ref={inputRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              onDoubleClick={(e) => e.stopPropagation()}
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
                "w-full bg-transparent leading-snug outline-none border-b border-dashed",
                data.isRoot
                  ? "font-display text-lg font-semibold text-white border-white/40 placeholder:text-white/50"
                  : "text-sm font-medium border-border",
              )}
            />
          ) : (
            <div
              className={cn(
                "leading-snug cursor-text",
                data.isRoot ? "font-display text-lg font-semibold text-white" : "text-sm font-medium",
              )}
            >
              {data.title}
            </div>
          )}
          {data.priority === "asap" && !editing && (
            <span className="mt-1 inline-flex items-center rounded-full bg-destructive/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-destructive">
              ASAP
            </span>
          )}
        </div>
        {data.hasChildren && !editing && (
          <button
            type="button"
            className={cn(
              "shrink-0 rounded-md p-0.5 transition-colors",
              data.isRoot ? "text-white/80 hover:bg-white/10" : "text-muted-foreground hover:bg-muted",
            )}
            onClick={(e) => {
              e.stopPropagation();
              data.onToggleCollapse(data.id);
            }}
            aria-label={data.collapsed ? "Expand" : "Collapse"}
          >
            {data.collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
        )}
      </div>

      {/* Hover toolbar — sits fully above the card so it never overlaps the title */}
      {!editing && (
        <div
          className={cn(
            "absolute right-2 bottom-full mb-1.5 hidden gap-1 rounded-full border border-border bg-card px-1.5 py-1 shadow-md z-10 group-hover:flex",
            selected && "flex",
          )}
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            className="rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            onClick={() => data.onAddChild(data.id)}
            aria-label="Add child"
            title="Add child (N)"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            className="rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            onClick={() => data.onEdit(data.id)}
            aria-label="Edit details"
            title="Edit details"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          {!data.isRoot && (
            <button
              type="button"
              className="rounded-full p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              onClick={() => data.onDelete(data.id)}
              aria-label="Delete"
              title="Delete"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

