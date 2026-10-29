<script setup lang="ts">
import type { Establishment } from "~/types/establishment";

const props = defineProps<{
  items: Establishment[];
  totalCount: number;
  /** Список сужен до области карты. */
  areaActive: boolean;
  cuisines: string[];
  distances: Map<number, number>;
  selectedId: number | null;
  isLoading: boolean;
  isError: boolean;
}>();

const emit = defineEmits<{ reset: []; clearArea: [] }>();

const query = defineModel<string>("query", { required: true });
const cuisine = defineModel<string>("cuisine", { required: true });
const minRating = defineModel<number>("minRating", { required: true });
const sortByDistance = defineModel<boolean>("sortByDistance", { required: true });

// 1300+ карточек сразу — заметная нагрузка на мобильных, поэтому показываем порциями.
const PAGE_SIZE = 60;
const limit = ref(PAGE_SIZE);
const visibleItems = computed(() => props.items.slice(0, limit.value));

const scroller = ref<HTMLElement | null>(null);

watch([query, cuisine, minRating, sortByDistance], () => {
  limit.value = PAGE_SIZE;
  scroller.value?.scrollTo({ top: 0 });
});

function onScroll() {
  const el = scroller.value;
  if (!el || limit.value >= props.items.length) return;
  if (el.scrollTop + el.clientHeight > el.scrollHeight - 400) {
    limit.value += PAGE_SIZE;
  }
}

// Прокручиваем к выбранному заведению только когда меняется сам выбор (или список впервые загрузился),
// а не на каждое обновление данных — иначе список «прыгает» после отправки отзыва.
let scrolledToId: number | null = null;
watch(
  () => [props.selectedId, props.items.length > 0] as const,
  async ([id]) => {
    if (id == null) {
      scrolledToId = null;
      return;
    }
    if (id === scrolledToId) return;
    const index = props.items.findIndex((item) => item.id === id);
    if (index === -1) return;
    scrolledToId = id;
    if (index >= limit.value) limit.value = index + PAGE_SIZE;
    await nextTick();
    scroller.value?.querySelector(`[data-id="${id}"]`)?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  },
  { immediate: true }
);
</script>

<template>
  <aside
    class="glass-panel flex h-full min-h-0 flex-col rounded-none border-x-0 border-b-0 md:rounded-r-2xl md:border md:border-l-0"
    aria-label="Список заведений"
  >
    <FilterBar
      v-model:query="query"
      v-model:cuisine="cuisine"
      v-model:min-rating="minRating"
      v-model:sort-by-distance="sortByDistance"
      :cuisines="cuisines"
    />

    <div class="flex items-center justify-between px-4 py-2">
      <button
        v-if="areaActive"
        type="button"
        class="flex items-center gap-1.5 rounded-full border border-accent-cyan/50 bg-accent-cyan/10 px-3 py-1 text-xs font-medium text-accent-cyan hover:bg-accent-cyan/20"
        aria-label="Показать весь город"
        @click="emit('clearArea')"
      >
        В области карты <span aria-hidden="true">✕</span>
      </button>
      <p v-else class="text-xs font-medium uppercase tracking-wider text-slate-400">
        {{ sortByDistance ? "Ближайшие" : "Список · Казань" }}
      </p>
      <p class="text-xs text-slate-400">{{ items.length }} из {{ totalCount }}</p>
    </div>

    <div ref="scroller" class="scrollbar-thin min-h-0 flex-1 overflow-y-auto px-3 pb-4" @scroll.passive="onScroll">
      <div v-if="isLoading" class="space-y-2 p-1">
        <div
          v-for="i in 5"
          :key="i"
          class="h-[72px] motion-safe:animate-pulse rounded-xl border border-border-subtle bg-surface-raised/60"
        />
      </div>

      <p
        v-else-if="isError"
        class="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-4 text-sm text-red-300"
      >
        Не удалось загрузить заведения. Попробуйте обновить страницу.
      </p>

      <div
        v-else-if="items.length === 0"
        class="rounded-xl border border-dashed border-border-subtle px-3 py-8 text-center text-sm text-slate-400"
      >
        <p>По фильтрам ничего не найдено.</p>
        <button type="button" class="mt-2 text-accent-cyan underline" @click="emit('reset')">Сбросить фильтры</button>
      </div>

      <ul v-else class="space-y-2">
        <li v-for="(item, index) in visibleItems" :key="item.id" :data-id="item.id">
          <EstablishmentCard
            :item="item"
            :index="index % PAGE_SIZE"
            :selected="selectedId === item.id"
            :distance="distances.get(item.id)"
          />
        </li>
      </ul>
    </div>
  </aside>
</template>
