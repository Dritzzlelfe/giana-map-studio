import { CATEGORIES, categoryColorVar } from "@/lib/categories";

export function CategoryLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px] text-muted-foreground">
      {CATEGORIES.map((c) => (
        <div key={c.id} className="flex items-center gap-1.5">
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: categoryColorVar(c.id) }}
          />
          <span>{c.label}</span>
        </div>
      ))}
    </div>
  );
}
