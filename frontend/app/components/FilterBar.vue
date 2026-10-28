<script setup lang="ts">
defineProps<{ cuisines: string[] }>();

const query = defineModel<string>("query", { required: true });
const cuisine = defineModel<string>("cuisine", { required: true });
const minRating = defineModel<number>("minRating", { required: true });
const sortByDistance = defineModel<boolean>("sortByDistance", { required: true });

const { location, locating, error: locationError, locate } = useUserLocation();

// Поле ввода откликается мгновенно, а фильтрация и запись в URL — после паузы в наборе.
const draft = ref(query.value);
let debounceTimer: ReturnType<typeof setTimeout> | undefined;

watch(draft, (value) => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    query.value = value;
  }, 250);
});

watch(query, (value) => {
  if (value !== draft.value.trim()) draft.value = value;
});

onBeforeUnmount(() => clearTimeout(debounceTimer));

async function toggleNearby() {
  if (sortByDistance.value) {
    sortByDistance.value = false;
    return;
  }
  if (location.value || (await locate())) sortByDistance.value = true;
}

const chipClass = (active: boolean) =>
  active
    ? "border-accent-cyan/60 bg-accent-cyan/15 text-accent-cyan shadow-glow"
    : "border-border-subtle bg-surface-raised/60 text-slate-400 hover:border-slate-600 hover:text-slate-200";
</script>

<template>
  <div class="space-y-3 border-b border-border-subtle px-4 py-4">
    <div class="relative">
      <svg
        class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
        viewBox="0 0 20 20"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        aria-hidden="true"
      >
        <circle cx="9" cy="9" r="6" />
        <path d="m14 14 4 4" stroke-linecap="round" />
      </svg>
      <input
        v-model="draft"
        type="search"
        aria-label="Поиск заведений"
        class="w-full rounded-xl border border-border-subtle bg-surface-raised/80 py-2.5 pl-9 pr-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-accent-cyan/50 focus:shadow-glow"
        placeholder="Поиск по названию, кухне, адресу..."
      >
    </div>

    <div class="flex flex-wrap gap-2">
      <button
        type="button"
        :aria-pressed="sortByDistance"
        :disabled="locating"
        class="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition disabled:opacity-60"
        :class="chipClass(sortByDistance)"
        @click="toggleNearby"
      >
        <svg class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path d="M10 2a6 6 0 0 0-6 6c0 4.5 6 10 6 10s6-5.5 6-10a6 6 0 0 0-6-6Zm0 8.5A2.5 2.5 0 1 1 10 5.5a2.5 2.5 0 0 1 0 5Z" />
        </svg>
        {{ locating ? "Определяем..." : "Рядом со мной" }}
      </button>
      <button
        type="button"
        :aria-pressed="minRating === MIN_RATING_OPTION"
        class="rounded-full border px-3 py-1.5 text-xs font-medium transition"
        :class="chipClass(minRating === MIN_RATING_OPTION)"
        @click="minRating = minRating === MIN_RATING_OPTION ? 0 : MIN_RATING_OPTION"
      >
        ★ {{ MIN_RATING_OPTION }}+
      </button>
    </div>
    <p v-if="locationError" class="text-xs text-red-400" role="alert">{{ locationError }}</p>

    <div class="scrollbar-thin flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Тип заведения">
      <button
        v-for="item in cuisines"
        :key="item"
        type="button"
        :aria-pressed="cuisine === item"
        class="shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition"
        :class="chipClass(cuisine === item)"
        @click="cuisine = item"
      >
        {{ item }}
      </button>
    </div>
  </div>
</template>
