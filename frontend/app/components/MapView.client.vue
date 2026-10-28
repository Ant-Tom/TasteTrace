<script setup lang="ts">
import {
  LngLatBounds,
  MapLibreMap,
  Marker,
  NavigationControl,
  Popup,
  setWorkerUrl,
  type GeoJSONSource,
  type MapLayerMouseEvent
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
// MapLibre ищет воркер рядом со своим файлом, а бандлер его оттуда переносит — указываем адрес явно.
import maplibreWorkerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?url";
import type { Feature, FeatureCollection, Point } from "geojson";
import type { Establishment } from "~/types/establishment";
import type { UserLocation } from "~/composables/useUserLocation";
import type { MapBounds } from "~/composables/useMapArea";

const props = defineProps<{
  items: Establishment[];
  selectedId: number | null;
  userLocation: UserLocation | null;
  filtersActive: boolean;
}>();

const emit = defineEmits<{ select: [id: number]; userMove: [bounds: MapBounds] }>();

setWorkerUrl(maplibreWorkerUrl);

const KAZAN_BOUNDS: [[number, number], [number, number]] = [
  [48.85, 55.65],
  [49.45, 55.95]
];
const MAX_BOUNDS: [[number, number], [number, number]] = [
  [48.5, 55.45],
  [49.8, 56.15]
];

type PointFeature = Feature<Point, { id: number; color: string }>;

const container = ref<HTMLElement | null>(null);
let map: MapLibreMap | null = null;
let loaded = false;
let hoverPopup: Popup | null = null;
let pulseMarker: Marker | null = null;
let resizeObserver: ResizeObserver | null = null;
let focusedId: number | null = null;

const hasCoords = (item: Establishment) => Number.isFinite(item.latitude) && Number.isFinite(item.longitude);

function toFeature(item: Establishment): PointFeature {
  return {
    type: "Feature",
    geometry: { type: "Point", coordinates: [item.longitude, item.latitude] },
    properties: { id: item.id, color: cuisineColor(item.cuisine) }
  };
}

function collection(features: Feature[]): FeatureCollection {
  return { type: "FeatureCollection", features };
}

function source(id: string) {
  return map?.getSource<GeoJSONSource>(id);
}

// Все точки рисует WebGL и кластеризует воркер — DOM-элементов на маркеры нет,
// поэтому карта не тормозит даже на десятках тысяч заведений.
function syncPlaces() {
  if (!loaded) return;
  source("places")?.setData(collection(props.items.filter(hasCoords).map(toFeature)));
  syncSelected();
}

// После смены фильтров показываем на карте всё найденное (если ничего не выбрано).
function fitToItems() {
  if (!map || props.selectedId != null) return;
  const points = props.items.filter(hasCoords);
  if (points.length === 0) return;
  const bounds = new LngLatBounds();
  for (const item of points) bounds.extend([item.longitude, item.latitude]);
  map.fitBounds(bounds, { padding: 60, maxZoom: 16, duration: prefersReducedMotion() ? 0 : 500 });
}

function syncSelected() {
  if (!loaded) return;
  const item = props.items.find((entry) => entry.id === props.selectedId);
  const visible = item && hasCoords(item);
  source("selected")?.setData(collection(visible ? [toFeature(item)] : []));
  updatePulse(visible ? item : null);
  focusSelected();
}

// Пульсирующее кольцо вокруг выбранного места — обычный DOM-элемент с CSS-анимацией:
// её считает видеокарта, и сама карта ради неё не перерисовывается (бережёт батарею).
// При «Уменьшить движение» CSS отключает анимацию, остаётся статичный ореол слоя selected-halo.
function updatePulse(item: Establishment | null | undefined) {
  if (!map) return;
  if (!item) {
    pulseMarker?.remove();
    return;
  }
  if (!pulseMarker) {
    const wrapper = document.createElement("div");
    wrapper.setAttribute("aria-hidden", "true");
    wrapper.style.pointerEvents = "none";
    const ring = document.createElement("div");
    ring.className = "map-pulse";
    wrapper.append(ring);
    pulseMarker = new Marker({ element: wrapper });
  }
  pulseMarker.setLngLat([item.longitude, item.latitude]).addTo(map);
}

function syncUserLocation() {
  if (!loaded) return;
  const location = props.userLocation;
  source("user")?.setData(
    collection(
      location
        ? [{ type: "Feature", geometry: { type: "Point", coordinates: [location.lng, location.lat] }, properties: {} }]
        : []
    )
  );
}

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function focusSelected() {
  const id = props.selectedId;
  if (!map || id == null || id === focusedId) return;
  const item = props.items.find((entry) => entry.id === id);
  if (!item || !hasCoords(item)) return;
  focusedId = id;
  // Маркер не должен оказаться под карточкой заведения: на десктопе она слева, на телефоне — снизу.
  const offset: [number, number] = window.matchMedia("(min-width: 768px)").matches
    ? [200, 0]
    : [0, -container.value!.clientHeight * 0.36];
  map.flyTo({
    center: [item.longitude, item.latitude],
    zoom: Math.max(map.getZoom(), 16),
    offset,
    duration: prefersReducedMotion() ? 0 : 700
  });
}

function showHoverPopup(event: MapLayerMouseEvent) {
  const feature = event.features?.[0] as PointFeature | undefined;
  const item = feature && props.items.find((entry) => entry.id === feature.properties.id);
  if (!map || !item) return;

  // Только textContent: название из базы не может внедрить разметку.
  const root = document.createElement("div");
  const name = document.createElement("p");
  name.className = "map-popup__name";
  name.textContent = item.name;
  const meta = document.createElement("p");
  meta.className = "map-popup__meta";
  meta.textContent = [item.cuisine, `★ ${item.reviewCount > 0 ? item.rating.toFixed(1) : "—"}`]
    .filter(Boolean)
    .join(" · ");
  root.append(name, meta);

  hoverPopup ??= new Popup({ closeButton: false, closeOnClick: false, offset: 10, className: "map-popup" });
  hoverPopup
    .setLngLat(feature!.geometry.coordinates as [number, number])
    .setDOMContent(root)
    .addTo(map);
}

function setupLayers(m: MapLibreMap) {
  m.addSource("places", {
    type: "geojson",
    data: collection([]),
    cluster: true,
    clusterRadius: 60,
    clusterMaxZoom: 15
  });
  m.addSource("selected", { type: "geojson", data: collection([]) });
  m.addSource("user", { type: "geojson", data: collection([]) });

  m.addLayer({
    id: "clusters",
    type: "circle",
    source: "places",
    filter: ["has", "point_count"],
    paint: {
      // Чем больше мест в кластере, тем он крупнее и насыщеннее: плотность читается с первого взгляда.
      "circle-color": [
        "step",
        ["get", "point_count"],
        "rgba(20, 20, 31, 0.92)",
        25,
        "rgba(12, 52, 61, 0.95)",
        100,
        "rgba(14, 86, 102, 0.95)"
      ],
      "circle-stroke-color": "rgba(34, 211, 238, 0.6)",
      "circle-stroke-width": ["step", ["get", "point_count"], 1.5, 100, 2.5],
      "circle-radius": ["step", ["get", "point_count"], 15, 10, 19, 25, 24, 100, 31],
      "circle-radius-transition": { duration: 200 }
    }
  });
  m.addLayer({
    id: "cluster-count",
    type: "symbol",
    source: "places",
    filter: ["has", "point_count"],
    layout: {
      "text-field": ["get", "point_count_abbreviated"],
      "text-font": ["Noto Sans Bold"],
      "text-size": ["step", ["get", "point_count"], 12, 100, 14],
      "text-allow-overlap": true
    },
    paint: { "text-color": "#22d3ee" }
  });
  m.addLayer({
    id: "points",
    type: "circle",
    source: "places",
    filter: ["!", ["has", "point_count"]],
    paint: {
      "circle-color": ["get", "color"],
      "circle-radius": ["interpolate", ["linear"], ["zoom"], 11, 4, 16, 7],
      "circle-stroke-color": "#0c0c12",
      "circle-stroke-width": 1.5
    }
  });
  m.addLayer({
    id: "selected-halo",
    type: "circle",
    source: "selected",
    paint: { "circle-color": "#22d3ee", "circle-opacity": 0.25, "circle-radius": 18 }
  });
  m.addLayer({
    id: "selected-point",
    type: "circle",
    source: "selected",
    paint: {
      "circle-color": ["get", "color"],
      "circle-radius": 9,
      "circle-stroke-color": "#ffffff",
      "circle-stroke-width": 3
    }
  });
  m.addLayer({
    id: "user-location",
    type: "circle",
    source: "user",
    paint: {
      "circle-color": "#3b82f6",
      "circle-radius": 7,
      "circle-stroke-color": "#ffffff",
      "circle-stroke-width": 2.5
    }
  });

  m.on("click", "clusters", async (event) => {
    const feature = event.features?.[0];
    const clusterId = feature?.properties?.cluster_id as number | undefined;
    if (clusterId == null || feature?.geometry.type !== "Point") return;
    const zoom = await source("places")!.getClusterExpansionZoom(clusterId);
    m.easeTo({
      center: feature.geometry.coordinates as [number, number],
      zoom,
      duration: prefersReducedMotion() ? 0 : 400
    });
  });

  m.on("click", "points", (event) => {
    const id = (event.features?.[0] as PointFeature | undefined)?.properties.id;
    if (id != null) emit("select", id);
  });

  for (const layer of ["clusters", "points"]) {
    m.on("mouseenter", layer, () => (m.getCanvas().style.cursor = "pointer"));
    m.on("mouseleave", layer, () => (m.getCanvas().style.cursor = ""));
  }

  if (window.matchMedia("(hover: hover)").matches) {
    m.on("mousemove", "points", showHoverPopup);
    m.on("mouseleave", "points", () => hoverPopup?.remove());
  }
}

onMounted(async () => {
  // У .client-компонентов разметка появляется на тик позже onMounted.
  await nextTick();
  if (!container.value) return;

  const m = new MapLibreMap({
    container: container.value,
    style: useRuntimeConfig().public.mapStyleUrl,
    bounds: KAZAN_BOUNDS,
    fitBoundsOptions: { padding: 24 },
    maxBounds: MAX_BOUNDS,
    dragRotate: false,
    pitchWithRotate: false,
    attributionControl: { compact: true }
  });
  map = m;
  m.touchZoomRotate.disableRotation();
  m.addControl(new NavigationControl({ showCompass: false }), "bottom-right");

  m.on("load", () => {
    setupLayers(m);
    loaded = true;
    syncPlaces();
    syncUserLocation();
    if (props.filtersActive) fitToItems();
  });

  // Только движения пользователя (у программных flyTo/fitBounds нет originalEvent).
  m.on("moveend", (event) => {
    if (!("originalEvent" in event) || !event.originalEvent) return;
    const bounds = m.getBounds();
    emit("userMove", {
      west: bounds.getWest(),
      south: bounds.getSouth(),
      east: bounds.getEast(),
      north: bounds.getNorth()
    });
  });

  resizeObserver = new ResizeObserver(() => m.resize());
  resizeObserver.observe(container.value);
});

onBeforeUnmount(() => {
  resizeObserver?.disconnect();
  hoverPopup?.remove();
  pulseMarker?.remove();
  map?.remove();
  map = null;
  loaded = false;
});

// Подгоняем карту только когда меняется набор заведений, а не их порядок (сортировка по расстоянию).
const itemsSignature = (items: Establishment[]) => `${items.length}:${items.reduce((sum, item) => sum + item.id, 0)}`;

watch(
  () => props.items,
  (items, previous) => {
    syncPlaces();
    if (itemsSignature(items) === itemsSignature(previous)) return;
    // При первой загрузке без фильтров оставляем вид на весь город.
    if (previous.length > 0 || props.filtersActive) fitToItems();
  }
);

watch(
  () => props.selectedId,
  (id) => {
    if (id == null) focusedId = null;
    syncSelected();
  }
);

watch(
  () => props.userLocation,
  (location, previous) => {
    syncUserLocation();
    if (location && !previous && map && props.selectedId == null) {
      map.flyTo({ center: [location.lng, location.lat], zoom: 15, duration: prefersReducedMotion() ? 0 : 700 });
    }
  }
);
</script>

<template>
  <div class="map-root absolute inset-0 overflow-hidden">
    <div ref="container" class="h-full w-full" role="region" aria-label="Карта заведений Казани" />
  </div>
</template>
