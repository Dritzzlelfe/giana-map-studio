import { CATEGORIES, categoryColorVar, type CategoryId } from "@/lib/categories";
import { cn } from "@/lib/utils";

interface Props {
  activeCategory?: CategoryId | null;
  onSelect?: (id: CategoryId | null) => void;
  counts?: Partial<Record<CategoryId, number>>;
}

export function CategoryLegend({ activeCategory, onSelect, counts }: Props) {
  const clickable = !!onSelect;
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 text-[11px]">
      {clickable && (
        <button
          type="button"
          onClick={() => onSelect?.(null)}
          className={cn(
            "rounded-full border px-2 py-0.5 transition-colors",
            !activeCategory
              ? "border-foreground bg-foreground text-background"
              : "border-border text-muted-foreground hover:bg-accent",
          )}
        >
          All
        </button>
      )}
      {CATEGORIES.map((c) => {
        const active = activeCategory === c.id;
        const count = counts?.[c.id];
        const content = (
          <>
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: categoryColorVar(c.id) }}
            />
            <span>{c.label}</span>
            {count !== undefined && count > 0 && (
              <span className="text-muted-foreground/70">{count}</span>
            )}
          </>
        );
        if (!clickable) {
          return (
            <div key={c.id} className="flex items-center gap-1.5 text-muted-foreground">
              {content}
            </div>
          );
        }
        return (
          <button
            key={c.id}
            type="button"
            onClick={() => onSelect?.(active ? null : c.id)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 transition-colors",
              active
                ? "border-foreground bg-accent text-foreground"
                : "border-border text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
          >
            {content}
          </button>
        );
      })}
    </div>
  );
}
