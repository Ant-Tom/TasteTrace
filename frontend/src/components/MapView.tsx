import { useEffect } from "react";
import { CircleMarker, MapContainer, Popup, TileLayer, useMap } from "react-leaflet";
import { cuisineColor, cuisineLabel } from "@/lib/cuisine";
import type { Establishment } from "@/types/establishment";

const KAZAN_CENTER: [number, number] = [55.7961, 49.1064];
/** Light tiles — readable streets; UI chrome stays dark */
const MAP_TILES =
  "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";

function MapController({
  items,
  selectedId
}: {
  items: Establishment[];
  selectedId: number | null;
}) {
  const map = useMap();

  useEffect(() => {
    const selected = items.find((item) => item.id === selectedId);
    if (selected) {
      map.flyTo([selected.latitude, selected.longitude], Math.max(map.getZoom(), 14), {
        duration: 0.6
      });
    }
  }, [items, map, selectedId]);

  return null;
}

type MapViewProps = {
  items: Establishment[];
  selectedId: number | null;
  onSelect: (id: number) => void;
};

export function MapView({ items, selectedId, onSelect }: MapViewProps) {
  return (
    <div className="relative h-full w-full">
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[5] h-12 bg-gradient-to-t from-surface/70 to-transparent md:hidden" />

      <MapContainer center={KAZAN_CENTER} zoom={14} className="h-full w-full" zoomControl>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; CARTO'
          url={MAP_TILES}
          maxZoom={20}
        />
        <MapController items={items} selectedId={selectedId} />
        {items.map((item) => {
          const color = cuisineColor(item.cuisine);
          const selected = selectedId === item.id;

          return (
            <CircleMarker
              key={item.id}
              center={[item.latitude, item.longitude]}
              radius={selected ? 13 : 10}
              pathOptions={{
                color: selected ? "#ffffff" : "#0f172a",
                weight: selected ? 3 : 2,
                fillColor: color,
                fillOpacity: 1
              }}
              eventHandlers={{
                click: () => onSelect(item.id)
              }}
            >
              <Popup>
                <div className="min-w-[140px] space-y-1 text-slate-900">
                  <p className="font-semibold">{item.name}</p>
                  <p className="text-sm text-slate-600">
                    {cuisineLabel(item.cuisine)} · {item.city}
                  </p>
                  <p className="text-sm font-medium" style={{ color }}>
                    ★ {item.rating.toFixed(1)}
                  </p>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>
    </div>
  );
}
