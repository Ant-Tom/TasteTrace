import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CircleMarker, MapContainer, Popup, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";

type Establishment = {
  id: number;
  name: string;
  cuisine: string;
  city: string;
  rating: number;
  latitude: number;
  longitude: number;
};

const KAZAN_CENTER: [number, number] = [55.7961, 49.1064];
const API_URL = import.meta.env.VITE_API_URL;
const ALL_CUISINES = "Все";

function cuisineLabel(cuisine: string): string {
  const labels: Record<string, string> = {
    Italian: "Итальянская",
    Japanese: "Японская",
    Georgian: "Грузинская",
    Burgers: "Бургеры"
  };
  return labels[cuisine] ?? cuisine;
}

async function fetchEstablishments(): Promise<Establishment[]> {
  const candidates = [API_URL, "http://localhost:8080"].filter(Boolean) as string[];
  let lastError: unknown;

  for (const baseUrl of candidates) {
    try {
      const response = await fetch(`${baseUrl}/api/establishments`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      return response.json();
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError ?? new Error("Failed to load establishments");
}

function App() {
  const [query, setQuery] = useState("");
  const [cuisine, setCuisine] = useState<string>(ALL_CUISINES);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const { data = [], isLoading, isError } = useQuery({
    queryKey: ["establishments"],
    queryFn: fetchEstablishments
  });

  const cuisines = useMemo(
    () => [ALL_CUISINES, ...new Set(data.map((item) => item.cuisine))],
    [data]
  );

  const filtered = useMemo(() => {
    return data.filter((item) => {
      const byCuisine = cuisine === ALL_CUISINES || item.cuisine === cuisine;
      const byQuery =
        query.trim().length === 0 ||
        item.name.toLowerCase().includes(query.toLowerCase()) ||
        item.city.toLowerCase().includes(query.toLowerCase());
      return byCuisine && byQuery;
    });
  }, [cuisine, data, query]);

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-8">
      <header>
        <h1 className="text-3xl font-bold">TasteTrace MVP</h1>
        <p className="mt-2 text-slate-600">Выбор заведения по карте Казани.</p>
      </header>

      <section className="grid gap-3 rounded-xl bg-white p-4 shadow-sm md:grid-cols-2">
        <input
          className="rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-slate-500"
          placeholder="Поиск по названию или городу"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select
          className="rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-slate-500"
          value={cuisine}
          onChange={(e) => setCuisine(e.target.value)}
        >
          {cuisines.map((item) => (
            <option key={item} value={item}>
              {item === ALL_CUISINES ? ALL_CUISINES : cuisineLabel(item)}
            </option>
          ))}
        </select>
      </section>

      {isLoading && <p className="text-sm text-slate-600">Загружаем заведения...</p>}
      {isError && <p className="text-sm text-red-600">Не удалось загрузить заведения.</p>}

      <section className="grid gap-4 lg:grid-cols-[1fr_1.15fr]">
        <div className="grid gap-3">
          {filtered.map((item) => (
            <article
              key={item.id}
              className={`cursor-pointer rounded-xl bg-white p-4 shadow-sm transition ${
                selectedId === item.id ? "ring-2 ring-sky-500" : ""
              }`}
              onClick={() => setSelectedId(item.id)}
            >
              <h2 className="text-lg font-semibold">{item.name}</h2>
              <p className="text-sm text-slate-600">
                {cuisineLabel(item.cuisine)} · {item.city}
              </p>
              <p className="mt-2 text-sm">Рейтинг: {item.rating.toFixed(1)}</p>
            </article>
          ))}
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <MapContainer center={KAZAN_CENTER} zoom={13} className="h-[420px] w-full">
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {filtered.map((item) => (
              <CircleMarker
                key={item.id}
                center={[item.latitude, item.longitude]}
                radius={selectedId === item.id ? 10 : 8}
                pathOptions={{
                  color: selectedId === item.id ? "#0284c7" : "#0f172a",
                  fillColor: selectedId === item.id ? "#38bdf8" : "#334155",
                  fillOpacity: 0.9
                }}
                eventHandlers={{
                  click: () => setSelectedId(item.id)
                }}
              >
                <Popup>
                  <div className="space-y-1">
                    <p className="font-semibold">{item.name}</p>
                    <p className="text-sm">
                      {cuisineLabel(item.cuisine)} · {item.city}
                    </p>
                    <p className="text-sm">Рейтинг: {item.rating.toFixed(1)}</p>
                  </div>
                </Popup>
              </CircleMarker>
            ))}
          </MapContainer>
        </div>
      </section>

      {!isLoading && !isError && filtered.length === 0 && (
        <p className="text-sm text-slate-600">По вашему запросу ничего не найдено.</p>
      )}
    </main>
  );
}

export default App;
