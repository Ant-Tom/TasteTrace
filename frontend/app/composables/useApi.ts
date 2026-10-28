import type { FetchError } from "ofetch";
import type { AuthResponse } from "~/types/user";

type FetchOptions = NonNullable<Parameters<typeof $fetch>[1]>;

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
  const nuxtApp = useNuxtApp();

  const raw = $fetch.create({
    baseURL: useRequestApiUrl(),
    onRequest({ options }) {
      if (auth.token) {
        options.headers.set("Authorization", `Bearer ${auth.token}`);
      }
    }
  });

  // Один запрос продления на всё приложение: если сразу несколько вызовов получили 401,
  // они дождутся общего результата, а не потратят refresh-токен несколько раз.
  // Промис хранится в nuxtApp, а не в модуле, чтобы при SSR не смешивались разные пользователи.
  function refreshSession(): Promise<boolean> {
    const state = nuxtApp as typeof nuxtApp & { _ttRefresh?: Promise<boolean> };
    state._ttRefresh ??= (async () => {
      const usedToken = auth.refreshToken;
      if (!usedToken) return false;
      try {
        const response = await raw<AuthResponse>("/api/auth/refresh", {
          method: "POST",
          body: { refreshToken: usedToken }
        });
        auth.setAuth(response.accessToken, response.refreshToken, response.user);
        return true;
      } catch {
        if (import.meta.client) {
          auth.reloadFromCookies();
          if (auth.refreshToken && auth.refreshToken !== usedToken) return true;
        }
        return false;
      }
    })().finally(() => {
      state._ttRefresh = undefined;
    });
    return state._ttRefresh;
  }

  return async function api<T>(url: string, options: FetchOptions = {}): Promise<T> {
    const hadToken = !!auth.token;
    try {
      return (await raw<T>(url, options as never)) as T;
    } catch (error) {
      // Access-токен истёк — тихо продлеваем сессию и повторяем запрос один раз.
      if (!hadToken || !isUnauthorized(error)) throw error;
      if (await refreshSession()) {
        return (await raw<T>(url, options as never)) as T;
      }
      auth.logout();
      throw error;
    }
  };
}

export function useResolvePhotoUrl() {
  const base = usePublicApiUrl();
  return (path: string, size: "full" | "thumb" = "full") => {
    const url = /^https?:\/\//.test(path) ? path : `${base}${path}`;
    return size === "thumb" ? `${url}/thumb` : url;
  };
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
