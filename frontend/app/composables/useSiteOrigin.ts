/** Публичный адрес сайта без слэша на конце: из настроек, иначе из текущего запроса. */
export function useSiteOrigin(): string {
  const configured = useRuntimeConfig().public.siteUrl;
  if (configured) return configured.replace(/\/+$/, "");
  return useRequestURL({ xForwardedHost: true, xForwardedProto: true }).origin;
}
