<script setup lang="ts">
import type { Establishment } from "~/types/establishment";

const props = defineProps<{
  item: Establishment;
  selected: boolean;
  distance?: number;
  /** Позиция в списке — для лёгкой каскадной анимации появления. */
  index?: number;
}>();

const route = useRoute();

// Цвет — это тип заведения (как точка на карте), а не оценка: поэтому он у маркера типа,
// а плашка рейтинга нейтральная и одинаковая для всех.
const typeColor = computed(() => cuisineColor(props.item.cuisine));
const hasReviews = computed(() => props.item.reviewCount > 0);
const enterDelay = computed(() => `${Math.min(props.index ?? 0, 10) * 30}ms`);
</script>

<template>
  <NuxtLink
    :to="{ path: `/place/${item.id}`, query: route.query }"
    :aria-current="selected ? 'true' : undefined"
    class="group block rounded-xl border p-3 transition duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent-cyan active:scale-[0.99] motion-safe:animate-card-in motion-safe:hover:-translate-y-0.5"
    :class="
      selected
        ? 'border-accent-cyan/60 bg-accent-cyan/10 shadow-glow'
        : 'border-border-subtle bg-surface-raised/50 hover:border-slate-600 hover:bg-surface-raised'
    "
    :style="{ animationDelay: enterDelay }"
  >
    <div class="flex items-start justify-between gap-3">
      <div class="min-w-0 flex-1">
        <h2 class="truncate font-medium text-white group-hover:text-accent-cyan">{{ item.name }}</h2>
        <p class="mt-1 flex min-w-0 items-center gap-1.5 text-xs text-slate-400">
          <span class="h-2 w-2 shrink-0 rounded-full" :style="{ backgroundColor: typeColor }" aria-hidden="true" />
          <span class="truncate">{{ [item.cuisine, item.address || item.city].filter(Boolean).join(" · ") }}</span>
        </p>
      </div>
      <p
        v-if="hasReviews"
        class="shrink-0 rounded-lg bg-surface px-2 py-1 font-display text-sm font-bold text-white"
        :aria-label="`Рейтинг ${item.rating.toFixed(1)} из 5`"
      >
        <span class="text-accent-amber" aria-hidden="true">★</span> {{ item.rating.toFixed(1) }}
      </p>
    </div>
    <div class="mt-2 flex items-center justify-between gap-2 text-xs">
      <span :class="hasReviews ? 'text-slate-300' : 'text-slate-400'">
        {{ hasReviews ? reviewsLabel(item.reviewCount) : "Пока без отзывов" }}
      </span>
      <span v-if="distance != null" class="shrink-0 font-medium text-accent-cyan">{{ formatDistance(distance) }}</span>
    </div>
  </NuxtLink>
</template>
