import { defineStore } from "pinia";
import type { User } from "~/types/user";

const COOKIE_OPTIONS = {
  maxAge: 60 * 60 * 24 * 14,
  sameSite: "lax" as const,
  default: () => null
};

export const useAuthStore = defineStore("auth", () => {
  // Куки вместо localStorage: токен доступен и при SSR, поэтому отзывы
  // приходят с сервера уже с учётом голосов и прав текущего пользователя.
  const token = useCookie<string | null>("tt_token", COOKIE_OPTIONS);
  // Короткоживущий access-токен (30 мин) продлевается по refresh-токену без повторного входа.
  const refreshToken = useCookie<string | null>("tt_refresh", COOKIE_OPTIONS);
  const user = useCookie<User | null>("tt_user", COOKIE_OPTIONS);

  const isAuthenticated = computed(() => !!token.value);

  function setAuth(newToken: string, newRefreshToken: string, newUser: User) {
    token.value = newToken;
    refreshToken.value = newRefreshToken;
    user.value = newUser;
  }

  function setUser(newUser: User) {
    user.value = newUser;
  }

  /** Другая вкладка могла уже продлить сессию — перечитываем куки из браузера. */
  function reloadFromCookies() {
    refreshCookie("tt_token");
    refreshCookie("tt_refresh");
    refreshCookie("tt_user");
  }

  function logout() {
    token.value = null;
    refreshToken.value = null;
    user.value = null;
  }

  return { token, refreshToken, user, isAuthenticated, setAuth, setUser, reloadFromCookies, logout };
});
