import { useMemo, useState } from "react";
import { ALL_CUISINES } from "@/lib/cuisine";
import type { Establishment } from "@/types/establishment";

export function useEstablishmentFilters(data: Establishment[]) {
  const [query, setQuery] = useState("");
  const [cuisine, setCuisine] = useState<string>(ALL_CUISINES);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const cuisines = useMemo(
    () => [ALL_CUISINES, ...new Set(data.map((item) => item.cuisine))].sort((a, b) => {
      if (a === ALL_CUISINES) return -1;
      if (b === ALL_CUISINES) return 1;
      return a.localeCompare(b);
    }),
    [data]
  );

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return data
      .filter((item) => {
        const byCuisine = cuisine === ALL_CUISINES || item.cuisine === cuisine;
        const byQuery =
          normalizedQuery.length === 0 ||
          item.name.toLowerCase().includes(normalizedQuery) ||
          item.city.toLowerCase().includes(normalizedQuery) ||
          item.cuisine.toLowerCase().includes(normalizedQuery);
        return byCuisine && byQuery;
      })
      .sort((a, b) => b.rating - a.rating || a.name.localeCompare(b.name, "ru"));
  }, [cuisine, data, query]);

  return {
    query,
    setQuery,
    cuisine,
    setCuisine,
    selectedId,
    setSelectedId,
    cuisines,
    filtered
  };
}
