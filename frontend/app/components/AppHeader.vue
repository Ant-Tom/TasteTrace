<script setup lang="ts">
defineProps<{
  /** На телефоне шапка прячется, пока открыта карточка заведения, — иначе карты почти не видно. */
  hideOnMobile?: boolean;
}>();

const auth = useAuthStore();
const authModal = useAuthModal();
const api = useApi();

function logout() {
  const refreshToken = auth.refreshToken;
  auth.logout();
  // Отзываем refresh-токен на сервере, но не заставляем пользователя ждать ответа.
  if (refreshToken) {
    api("/api/auth/logout", { method: "POST", body: { refreshToken } }).catch(() => {});
  }
}
</script>

<template>
  <header
    class="pointer-events-none absolute inset-x-0 top-0 z-20 flex justify-center p-3 md:p-5"
    :class="{ 'max-md:hidden': hideOnMobile }"
  >
    <div
      class="glass-panel pointer-events-auto flex w-full max-w-6xl items-center justify-between gap-3 rounded-2xl px-4 py-2.5 md:px-6 md:py-3"
    >
      <NuxtLink to="/" class="block" aria-label="Где поесть — на главную">
        <p class="font-display text-lg font-bold tracking-tight text-white md:text-xl">
          Где <span class="text-accent-cyan">поесть</span>
        </p>
        <p class="hidden text-xs text-slate-400 sm:block md:text-sm">в Казани</p>
      </NuxtLink>
      <div class="flex items-center gap-3">
        <ClientOnly>
          <div v-if="auth.user" class="flex items-center gap-2">
            <span class="hidden text-sm text-slate-300 sm:inline">{{ auth.user.displayName }}</span>
            <button
              type="button"
              class="min-h-9 rounded-lg border border-border-subtle px-3.5 text-sm text-slate-300 transition hover:border-slate-500 hover:text-white"
              @click="logout"
            >
              Выйти
            </button>
          </div>
          <div v-else class="flex gap-2">
            <button
              type="button"
              class="min-h-9 rounded-lg border border-border-subtle px-3.5 text-sm text-slate-300 transition hover:border-slate-500 hover:text-white"
              @click="authModal.open('login')"
            >
              Вход
            </button>
            <button
              type="button"
              class="min-h-9 rounded-lg bg-accent-cyan/20 px-3.5 text-sm font-medium text-accent-cyan transition hover:bg-accent-cyan/30"
              @click="authModal.open('register')"
            >
              Регистрация
            </button>
          </div>
        </ClientOnly>
      </div>
    </div>
  </header>
</template>
