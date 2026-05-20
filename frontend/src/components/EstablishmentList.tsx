import { useEffect, useRef } from "react";
import { EstablishmentCard } from "@/components/EstablishmentCard";
import { FilterBar } from "@/components/FilterBar";
import type { Establishment } from "@/types/establishment";

type EstablishmentListProps = {
  items: Establishment[];
  allItems: Establishment[];
  query: string;
  onQueryChange: (value: string) => void;
  cuisine: string;
  onCuisineChange: (value: string) => void;
  cuisines: string[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  isLoading: boolean;
  isError: boolean;
};

export function EstablishmentList({
  items,
  allItems,
  query,
  onQueryChange,
  cuisine,
  onCuisineChange,
  cuisines,
  selectedId,
  onSelect,
  isLoading,
  isError
}: EstablishmentListProps) {
  const selectedRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    selectedRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [selectedId]);

  return (
    <aside className="glass-panel flex h-full min-h-0 flex-col rounded-none border-y-0 border-l-0 md:rounded-r-2xl md:border md:border-l-0">
      <FilterBar
        query={query}
        onQueryChange={onQueryChange}
        cuisine={cuisine}
        onCuisineChange={onCuisineChange}
        cuisines={cuisines}
      />

      <div className="flex items-center justify-between px-4 py-2">
        <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
          Список · Казань
        </p>
        <p className="text-xs text-slate-400">{items.length} из {allItems.length}</p>
      </div>

      <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto px-3 pb-4">
        {isLoading && (
          <div className="space-y-2 p-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="h-[72px] animate-pulse rounded-xl border border-border-subtle bg-surface-raised/60"
              />
            ))}
          </div>
        )}

        {isError && (
          <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-4 text-sm text-red-300">
            Не удалось загрузить заведения. Проверьте backend.
          </p>
        )}

        {!isLoading && !isError && items.length === 0 && (
          <p className="rounded-xl border border-dashed border-border-subtle px-3 py-8 text-center text-sm text-slate-500">
            По фильтрам ничего не найдено.
          </p>
        )}

        {!isLoading && !isError && (
          <ul className="space-y-2">
            {items.map((item) => (
              <li key={item.id}>
                <EstablishmentCard
                  ref={selectedId === item.id ? selectedRef : undefined}
                  item={item}
                  selected={selectedId === item.id}
                  onSelect={() => onSelect(item.id)}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}
