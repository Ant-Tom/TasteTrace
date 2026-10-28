import type { H3Event } from "h3";

export function siteOrigin(event: H3Event): string {
  const configured = useRuntimeConfig(event).public.siteUrl;
  if (configured) return configured.replace(/\/+$/, "");
  return getRequestURL(event, { xForwardedHost: true, xForwardedProto: true }).origin;
}

export function apiBaseUrl(event: H3Event): string {
  const config = useRuntimeConfig(event);
  return (config.apiUrlServer || config.public.apiUrl).replace(/\/+$/, "").replace(/\/api$/, "");
}
