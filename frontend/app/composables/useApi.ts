import type { FetchError } from "ofetch";

function trimBaseUrl(raw: string): string {
  return raw.replace(/\/+$/, "").replace(/\/api$/, "");
}

/** Публичный адрес бэкенда — для ссылок, которые открывает браузер (фото и т.п.). */
function usePublicApiUrl(): string {
  return trimBaseUrl(useRuntimeConfig().public.apiUrl);
}

/** Адрес бэкенда для запросов: на сервере можно ходить по внутреннему адресу Docker-сети. */
function useRequestApiUrl(): string {
  const config = useRuntimeConfig();
  if (import.meta.server && config.apiUrlServer) {
    return trimBaseUrl(config.apiUrlServer);
  }
  return usePublicApiUrl();
}

export function useApi() {
  const auth = useAuthStore();

  return $fetch.create({
    baseURL: useRequestApiUrl(),
    onRequest({ options }) {
      if (auth.token) {
        options.headers.set("Authorization", `Bearer ${auth.token}`);
      }
    },
    onResponseError({ response, options }) {
      // Токен истёк или отозван — выходим, чтобы интерфейс не застревал в «полузалогиненном» состоянии.
      if (response.status === 401 && options.headers.has("Authorization")) {
        auth.logout();
      }
    }
  });
}

export function useResolvePhotoUrl() {
  const base = usePublicApiUrl();
  return (path: string) => (/^https?:\/\//.test(path) ? path : `${base}${path}`);
}

export function isUnauthorized(error: unknown): boolean {
  return (error as FetchError | null)?.statusCode === 401;
}

export function getErrorMessage(error: unknown, fallback = "Что-то пошло не так"): string {
  if (!error) return fallback;
  const fetchError = error as FetchError<{ detail?: string; title?: string }>;
  if (fetchError.statusCode === 401) return "Сессия истекла — войдите снова";
  if (fetchError.data?.detail) return fetchError.data.detail;
  if (fetchError.data?.title) return fetchError.data.title;
  if (fetchError.statusCode) return `Ошибка сервера (${fetchError.statusCode})`;
  if (error instanceof Error && error.message) return "Нет связи с сервером";
  return fallback;
}
