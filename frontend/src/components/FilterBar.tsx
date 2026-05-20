import { ALL_CUISINES, cuisineLabel } from "@/lib/cuisine";
import { cn } from "@/lib/utils";

type FilterBarProps = {
  query: string;
  onQueryChange: (value: string) => void;
  cuisine: string;
  onCuisineChange: (value: string) => void;
  cuisines: string[];
};

export function FilterBar({
  query,
  onQueryChange,
  cuisine,
  onCuisineChange,
  cuisines
}: FilterBarProps) {
  return (
    <div className="space-y-3 border-b border-border-subtle px-4 py-4">
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
          ⌕
        </span>
        <input
          className="w-full rounded-xl border border-border-subtle bg-surface-raised/80 py-2.5 pl-9 pr-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-accent-cyan/50 focus:shadow-glow"
          placeholder="Поиск по названию, кухне, району..."
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
        />
      </div>
      <div className="scrollbar-thin flex gap-2 overflow-x-auto pb-1">
        {cuisines.map((item) => {
          const active = cuisine === item;
          return (
            <button
              key={item}
              type="button"
              onClick={() => onCuisineChange(item)}
              className={cn(
                "shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition",
                active
                  ? "border-accent-cyan/60 bg-accent-cyan/15 text-accent-cyan shadow-glow"
                  : "border-border-subtle bg-surface-raised/60 text-slate-400 hover:border-slate-600 hover:text-slate-200"
              )}
            >
              {item === ALL_CUISINES ? ALL_CUISINES : cuisineLabel(item)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
