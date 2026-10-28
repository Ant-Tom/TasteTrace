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
  const user = useCookie<User | null>("tt_user", COOKIE_OPTIONS);

  const isAuthenticated = computed(() => !!token.value);

  function setAuth(newToken: string, newUser: User) {
    token.value = newToken;
    user.value = newUser;
  }

  function setUser(newUser: User) {
    user.value = newUser;
  }

  function logout() {
    token.value = null;
    user.value = null;
  }

  return { token, user, isAuthenticated, setAuth, setUser, logout };
});
