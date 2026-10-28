import type { LocationQuery } from "vue-router";
import type { Establishment } from "~/types/establishment";

export const ESTABLISHMENTS_KEY = "establishments";
export const MIN_RATING_OPTION = 4;

export function useEstablishments() {
  const api = useApi();
  // Полный список (~1300 точек) нужен только карте и списку, поэтому грузим его в браузере,
  // а не тащим в HTML каждой страницы.
  return useAsyncData(ESTABLISHMENTS_KEY, () => api<Establishment[]>("/api/establishments"), {
    server: false,
    lazy: true,
    default: () => []
  });
}

export function useSelectedEstablishmentId() {
  const route = useRoute();
  return computed(() => {
    if (route.name !== "place-id") return null;
    const id = Number(route.params.id);
    return Number.isFinite(id) ? id : null;
  });
}

function queryString(query: LocationQuery, key: string): string {
  const value = query[key];
  return typeof value === "string" ? value : "";
}

/**
 * Фильтры живут в адресе страницы (?q=…&type=…&rating=4), поэтому ими можно поделиться ссылкой,
 * и они переживают переход между заведениями и перезагрузку.
 */
export function useEstablishmentFilters(data: Ref<Establishment[]>) {
  const route = useRoute();
  const router = useRouter();
  const { location: userLocation } = useUserLocation();
  const sortByDistance = useState("sort-by-distance", () => false);

  function setQueryParam(key: string, value: string | null) {
    const next = { ...route.query };
    if (value) next[key] = value;
    else delete next[key];
    router.replace({ query: next });
  }

  const query = computed({
    get: () => queryString(route.query, "q"),
    set: (value: string) => setQueryParam("q", value.trim() ? value : null)
  });

  const cuisine = computed({
    get: () => queryString(route.query, "type") || ALL_CUISINES,
    set: (value: string) => setQueryParam("type", value === ALL_CUISINES ? null : value)
  });

  const minRating = computed({
    get: () => Number(queryString(route.query, "rating")) || 0,
    set: (value: number) => setQueryParam("rating", value > 0 ? String(value) : null)
  });

  function resetFilters() {
    const next = { ...route.query };
    delete next.q;
    delete next.type;
    delete next.rating;
    router.replace({ query: next });
  }

  const cuisines = computed(() =>
    [ALL_CUISINES, ...new Set(data.value.map((item) => item.cuisine).filter(Boolean))].sort((a, b) => {
      if (a === ALL_CUISINES) return -1;
      if (b === ALL_CUISINES) return 1;
      return a.localeCompare(b, "ru");
    })
  );

  const distances = computed(() => {
    const location = userLocation.value;
    const result = new Map<number, number>();
    if (!location) return result;
    for (const item of data.value) {
      if (Number.isFinite(item.latitude) && Number.isFinite(item.longitude)) {
        result.set(item.id, distanceMeters(location, item.latitude, item.longitude));
      }
    }
    return result;
  });

  const cityAverage = computed(() => cityAverageRating(data.value));

  const filtered = computed(() => {
    const normalizedQuery = query.value.trim().toLowerCase();
    const byDistance = sortByDistance.value && distances.value.size > 0;

    return data.value
      .filter((item) => {
        const byCuisine = cuisine.value === ALL_CUISINES || item.cuisine === cuisine.value;
        const byRating = minRating.value === 0 || (item.reviewCount > 0 && item.rating >= minRating.value);
        const byQuery =
          normalizedQuery.length === 0 ||
          item.name.toLowerCase().includes(normalizedQuery) ||
          item.city.toLowerCase().includes(normalizedQuery) ||
          item.cuisine.toLowerCase().includes(normalizedQuery) ||
          (item.address?.toLowerCase().includes(normalizedQuery) ?? false);
        return byCuisine && byRating && byQuery;
      })
      .sort((a, b) => {
        if (byDistance) {
          const delta = (distances.value.get(a.id) ?? Infinity) - (distances.value.get(b.id) ?? Infinity);
          if (delta !== 0) return delta;
        }
        // Места с отзывами — выше, между собой по байесовскому рейтингу; без отзывов — по алфавиту.
        if ((a.reviewCount > 0) !== (b.reviewCount > 0)) return a.reviewCount > 0 ? -1 : 1;
        const scoreDelta = rankingScore(b, cityAverage.value) - rankingScore(a, cityAverage.value);
        return scoreDelta || a.name.localeCompare(b.name, "ru");
      });
  });

  return { query, cuisine, minRating, sortByDistance, cuisines, distances, filtered, resetFilters };
}
