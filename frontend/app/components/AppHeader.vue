<script setup lang="ts">
defineProps<{
  totalCount: number;
  visibleCount: number;
  /** На телефоне шапка прячется, пока открыта карточка заведения, — иначе карты почти не видно. */
  hideOnMobile?: boolean;
}>();

const auth = useAuthStore();
const authModal = useAuthModal();
</script>

<template>
  <header
    class="pointer-events-none absolute inset-x-0 top-0 z-20 flex justify-center p-3 md:p-5"
    :class="{ 'max-md:hidden': hideOnMobile }"
  >
    <div
      class="glass-panel pointer-events-auto flex w-full max-w-6xl items-center justify-between gap-3 rounded-2xl px-4 py-2.5 md:px-6 md:py-3"
    >
      <NuxtLink to="/" class="block" aria-label="TasteTrace — на главную">
        <p class="font-display text-lg font-bold tracking-tight text-white md:text-xl">
          Taste<span class="text-accent-cyan">Trace</span>
        </p>
        <p class="hidden text-xs text-slate-400 sm:block md:text-sm">Гастрокарта Казани</p>
      </NuxtLink>
      <div class="flex items-center gap-3">
        <div class="hidden text-right sm:block" aria-live="polite">
          <p class="text-xs uppercase tracking-widest text-slate-500">Заведений</p>
          <p class="font-display text-sm font-semibold text-white">
            <span class="text-accent-cyan">{{ visibleCount }}</span>
            <span class="text-slate-500"> / {{ totalCount }}</span>
          </p>
        </div>
        <ClientOnly>
          <div v-if="auth.user" class="flex items-center gap-2">
            <span class="hidden text-sm text-slate-300 sm:inline">{{ auth.user.displayName }}</span>
            <button
              type="button"
              class="rounded-lg border border-border-subtle px-3 py-1.5 text-xs text-slate-300 hover:text-white"
              @click="auth.logout()"
            >
              Выйти
            </button>
          </div>
          <div v-else class="flex gap-2">
            <button
              type="button"
              class="rounded-lg border border-border-subtle px-3 py-1.5 text-xs text-slate-300 hover:text-white"
              @click="authModal.open('login')"
            >
              Вход
            </button>
            <button
              type="button"
              class="rounded-lg bg-accent-cyan/20 px-3 py-1.5 text-xs font-medium text-accent-cyan hover:bg-accent-cyan/30"
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
