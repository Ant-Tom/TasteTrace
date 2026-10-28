import type { User } from "~/types/user";

// При старте проверяем сохранённый токен: если он истёк, useApi сам разлогинит пользователя.
export default defineNuxtPlugin(() => {
  const auth = useAuthStore();
  if (!auth.token) return;

  const api = useApi();
  api<User>("/api/auth/me")
    .then((user) => auth.setUser(user))
    .catch(() => {
      /* 401 уже обработан в useApi, сетевые ошибки не критичны */
    });
});
