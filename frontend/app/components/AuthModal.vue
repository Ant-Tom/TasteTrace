<script setup lang="ts">
import type { AuthResponse } from "~/types/user";
import type { AuthMode } from "~/composables/useAuthModal";

const auth = useAuthStore();
const { state, close } = useAuthModal();
const api = useApi();

const mode = ref<AuthMode>("login");
const email = ref("");
const password = ref("");
const displayName = ref("");
const website = ref("");
const error = ref<string | null>(null);
const loading = ref(false);
const dialog = ref<HTMLElement | null>(null);
useFocusTrap(dialog, computed(() => state.value.open));

watch(
  () => state.value.open,
  async (open) => {
    if (!open) return;
    mode.value = state.value.mode;
    error.value = null;
    password.value = "";
    await nextTick();
    dialog.value?.querySelector<HTMLInputElement>("input")?.focus();
  }
);

watch(mode, () => {
  error.value = null;
});

async function handleSubmit() {
  error.value = null;
  loading.value = true;
  try {
    const response =
      mode.value === "login"
        ? await api<AuthResponse>("/api/auth/login", {
            method: "POST",
            body: { email: email.value, password: password.value }
          })
        : await api<AuthResponse>("/api/auth/register", {
            method: "POST",
            body: {
              email: email.value,
              password: password.value,
              displayName: displayName.value,
              website: website.value
            }
          });
    auth.setAuth(response.accessToken, response.refreshToken, response.user);
    password.value = "";
    close();
  } catch (err) {
    if ((err as { statusCode?: number }).statusCode === 429) {
      error.value = "Слишком много попыток. Попробуйте позже.";
    } else {
      error.value =
        mode.value === "login" && isUnauthorized(err) ? "Неверный email или пароль" : getErrorMessage(err);
    }
  } finally {
    loading.value = false;
  }
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === "Escape") close();
}

const inputClass =
  "w-full rounded-xl border border-border-subtle bg-surface-raised/80 px-3 py-2 text-sm text-white outline-none focus:border-accent-cyan/50";
</script>

<template>
  <Teleport to="body">
    <div
      v-if="state.open"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm motion-safe:animate-fade-in"
      @mousedown.self="close"
      @keydown="onKeydown"
    >
      <div
        ref="dialog"
        class="glass-panel w-full max-w-md rounded-2xl p-6 motion-safe:animate-dialog-in"
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-modal-title"
      >
        <div class="mb-4 flex items-center justify-between">
          <h2 id="auth-modal-title" class="font-display text-xl font-bold text-white">
            {{ mode === "login" ? "Вход" : "Регистрация" }}
          </h2>
          <button type="button" aria-label="Закрыть" class="text-slate-400 hover:text-white" @click="close">
            ✕
          </button>
        </div>

        <form class="space-y-3" @submit.prevent="handleSubmit">
          <input
            v-if="mode === 'register'"
            v-model="displayName"
            :class="inputClass"
            placeholder="Имя"
            aria-label="Имя"
            autocomplete="nickname"
            required
            minlength="2"
          >
          <input
            v-model="email"
            type="email"
            :class="inputClass"
            placeholder="Email"
            aria-label="Email"
            autocomplete="email"
            required
          >
          <input
            v-model="password"
            type="password"
            :class="inputClass"
            placeholder="Пароль (мин. 8 символов)"
            aria-label="Пароль"
            :autocomplete="mode === 'login' ? 'current-password' : 'new-password'"
            required
            minlength="8"
          >
          <input
            v-model="website"
            type="text"
            name="website"
            tabindex="-1"
            autocomplete="off"
            class="absolute -left-[9999px] h-0 w-0 opacity-0"
            aria-hidden="true"
          >

          <p v-if="error" class="text-sm text-red-400" role="alert">{{ error }}</p>

          <button
            type="submit"
            :disabled="loading"
            class="w-full rounded-xl bg-accent-cyan/20 py-2.5 text-sm font-semibold text-accent-cyan transition hover:bg-accent-cyan/30 disabled:opacity-50"
          >
            {{ loading ? "..." : mode === "login" ? "Войти" : "Зарегистрироваться" }}
          </button>
        </form>

        <p class="mt-4 text-center text-sm text-slate-400">
          <template v-if="mode === 'login'">
            Нет аккаунта?
            <button type="button" class="text-accent-cyan" @click="mode = 'register'">Регистрация</button>
          </template>
          <template v-else>
            Уже есть аккаунт?
            <button type="button" class="text-accent-cyan" @click="mode = 'login'">Войти</button>
          </template>
        </p>
      </div>
    </div>
  </Teleport>
</template>
