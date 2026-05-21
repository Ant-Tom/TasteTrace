import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet.markercluster";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import { cuisineColor, cuisineLabel } from "@/lib/cuisine";
import type { Establishment } from "@/types/establishment";

const KAZAN_CENTER: [number, number] = [55.7961, 49.1064];
const KAZAN_BOUNDS: L.LatLngBoundsExpression = [
  [55.65, 48.85],
  [55.95, 49.45]
];
const MAP_TILES = "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";

function MapResizeFix() {
  const map = useMap();

  useEffect(() => {
    const fix = () => {
      map.invalidateSize({ animate: false, pan: false });
    };
    fix();
    const timers = [0, 100, 300, 600].map((ms) => window.setTimeout(fix, ms));
    window.addEventListener("resize", fix);
    const observer = new ResizeObserver(fix);
    observer.observe(map.getContainer().parentElement ?? map.getContainer());

    return () => {
      timers.forEach(clearTimeout);
      window.removeEventListener("resize", fix);
      observer.disconnect();
    };
  }, [map]);

  return null;
}

function MapController({
  items,
  selectedId
}: {
  items: Establishment[];
  selectedId: number | null;
}) {
  const map = useMap();
  const didFit = useRef(false);

  useEffect(() => {
    if (!didFit.current && items.length > 0) {
      map.fitBounds(KAZAN_BOUNDS, { padding: [24, 24] });
      didFit.current = true;
    }
  }, [items.length, map]);

  useEffect(() => {
    const selected = items.find((item) => item.id === selectedId);
    if (selected) {
      map.flyTo([selected.latitude, selected.longitude], Math.max(map.getZoom(), 15), {
        duration: 0.5
      });
    }
  }, [items, map, selectedId]);

  return null;
}

function MarkerClusterLayer({
  items,
  selectedId,
  onSelect
}: {
  items: Establishment[];
  selectedId: number | null;
  onSelect: (id: number) => void;
}) {
  const map = useMap();
  const clusterRef = useRef<L.MarkerClusterGroup | null>(null);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  useEffect(() => {
    const group = L.markerClusterGroup({
      chunkedLoading: true,
      chunkInterval: 100,
      chunkDelay: 30,
      maxClusterRadius: 60,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      disableClusteringAtZoom: 16
    });
    clusterRef.current = group;
    map.addLayer(group);

    return () => {
      map.removeLayer(group);
      clusterRef.current = null;
    };
  }, [map]);

  useEffect(() => {
    const group = clusterRef.current;
    if (!group) return;

    group.clearLayers();

    for (const item of items) {
      const color = cuisineColor(item.cuisine);
      const selected = selectedId === item.id;
      const marker = L.circleMarker([item.latitude, item.longitude], {
        radius: selected ? 10 : 6,
        color: selected ? "#ffffff" : "#1e293b",
        weight: selected ? 3 : 1.5,
        fillColor: color,
        fillOpacity: 0.95
      });

      marker.bindPopup(
        `<div style="min-width:140px">
          <p style="font-weight:600;margin:0">${item.name}</p>
          <p style="font-size:13px;color:#64748b;margin:4px 0 0">${cuisineLabel(item.cuisine)} · ${item.city}</p>
          <p style="font-size:13px;color:${color};margin:4px 0 0">★ ${item.rating > 0 ? item.rating.toFixed(1) : "—"}</p>
        </div>`
      );
      marker.on("click", () => onSelectRef.current(item.id));
      group.addLayer(marker);
    }
  }, [items, selectedId]);

  return null;
}

type MapViewProps = {
  items: Establishment[];
  selectedId: number | null;
  onSelect: (id: number) => void;
};

export function MapView({ items, selectedId, onSelect }: MapViewProps) {
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setMapReady(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <div className="map-root absolute inset-0 overflow-hidden">
      {!mapReady ? (
        <div className="flex h-full items-center justify-center bg-[#e8ecf1] text-sm text-slate-500">
          Загрузка карты...
        </div>
      ) : (
        <MapContainer
          center={KAZAN_CENTER}
          zoom={12}
          className="h-full w-full"
          style={{ height: "100%", width: "100%" }}
          zoomControl
          maxBounds={KAZAN_BOUNDS}
          maxBoundsViscosity={0.85}
          whenReady={() => {
            /* invalidateSize runs in MapResizeFix */
          }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; CARTO'
            url={MAP_TILES}
            maxZoom={19}
            updateWhenZooming={false}
            updateWhenIdle={false}
          />
          <MapResizeFix />
          <MapController items={items} selectedId={selectedId} />
          <MarkerClusterLayer items={items} selectedId={selectedId} onSelect={onSelect} />
        </MapContainer>
      )}
    </div>
  );
}
