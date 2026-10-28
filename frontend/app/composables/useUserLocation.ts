export type UserLocation = { lat: number; lng: number };

export function useUserLocation() {
  // Координаты держим только в памяти страницы: в URL и куки они не попадают.
  const location = useState<UserLocation | null>("user-location", () => null);
  const locating = useState("user-locating", () => false);
  const error = useState<string | null>("user-location-error", () => null);

  function locate(): Promise<UserLocation | null> {
    if (!("geolocation" in navigator)) {
      error.value = "Браузер не умеет определять местоположение";
      return Promise.resolve(null);
    }
    locating.value = true;
    error.value = null;
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          location.value = { lat: position.coords.latitude, lng: position.coords.longitude };
          locating.value = false;
          resolve(location.value);
        },
        (err) => {
          error.value =
            err.code === err.PERMISSION_DENIED
              ? "Доступ к геолокации запрещён в браузере"
              : "Не удалось определить местоположение";
          locating.value = false;
          resolve(null);
        },
        { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 }
      );
    });
  }

  return { location, locating, error, locate };
}

/** Расстояние по прямой в метрах (формула гаверсинусов). */
export function distanceMeters(a: UserLocation, lat: number, lng: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat - a.lat);
  const dLng = toRad(lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6_371_000 * Math.asin(Math.sqrt(h));
}

export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters / 10) * 10} м`;
  return `${(meters / 1000).toFixed(meters < 10_000 ? 1 : 0).replace(".", ",")} км`;
}
