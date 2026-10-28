import type { Establishment } from "~/types/establishment";

export type MapBounds = { west: number; south: number; east: number; north: number };

/**
 * «Искать в этой области»: пользователь двигает карту — появляется кнопка, по нажатию
 * список сужается до видимой области. Как в Яндекс.Картах и Airbnb: сам список
 * не прыгает от каждого движения карты, решает пользователь.
 */
export function useMapArea() {
  /** Область, по которой сейчас отфильтрован список (null — весь город). */
  const area = useState<MapBounds | null>("map-area", () => null);
  /** Куда пользователь сдвинул карту, но ещё не нажал «Искать здесь». */
  const pending = useState<MapBounds | null>("map-area-pending", () => null);

  function onUserMove(bounds: MapBounds) {
    pending.value = bounds;
  }

  function applyPending() {
    if (!pending.value) return;
    area.value = pending.value;
    pending.value = null;
  }

  function clearArea() {
    area.value = null;
    pending.value = null;
  }

  return { area, pending, onUserMove, applyPending, clearArea };
}

export function isInBounds(item: Establishment, bounds: MapBounds): boolean {
  return (
    item.latitude >= bounds.south &&
    item.latitude <= bounds.north &&
    item.longitude >= bounds.west &&
    item.longitude <= bounds.east
  );
}
