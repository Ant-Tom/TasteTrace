<script setup lang="ts">
import type { Establishment } from "~/types/establishment";

const props = defineProps<{
  item: Establishment;
  selected: boolean;
  distance?: number;
}>();

const route = useRoute();

const accent = computed(() => cuisineColor(props.item.cuisine));
</script>

<template>
  <NuxtLink
    :to="{ path: `/place/${item.id}`, query: route.query }"
    :aria-current="selected ? 'true' : undefined"
    class="group block rounded-xl border p-3 transition duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent-cyan"
    :class="
      selected
        ? 'border-accent-cyan/50 bg-accent-cyan/10'
        : 'border-border-subtle bg-surface-raised/50 hover:border-slate-600 hover:bg-surface-raised'
    "
    :style="selected ? { boxShadow: `0 0 20px ${accent}33, 0 8px 24px rgba(0,0,0,0.35)` } : undefined"
  >
    <div class="flex items-start justify-between gap-2">
      <div class="min-w-0 flex-1">
        <h2 class="truncate font-medium text-white group-hover:text-accent-cyan">{{ item.name }}</h2>
        <p class="mt-0.5 truncate text-xs text-slate-400">
          {{ [item.cuisine, item.address || item.city].filter(Boolean).join(" · ") }}
        </p>
      </div>
      <span
        class="shrink-0 rounded-md px-2 py-0.5 font-display text-sm font-bold text-surface"
        :style="{ backgroundColor: accent }"
        :aria-label="item.reviewCount > 0 ? `Рейтинг ${item.rating.toFixed(1)}` : 'Нет рейтинга'"
      >
        {{ item.reviewCount > 0 ? item.rating.toFixed(1) : "—" }}
      </span>
    </div>
    <div class="mt-2 flex items-center justify-between">
      <RatingStars v-if="item.reviewCount > 0" :rating="item.rating" />
      <span v-else class="text-xs text-slate-400">Нет отзывов</span>
      <span class="text-xs text-slate-400">
        <span v-if="distance != null" class="mr-2 normal-case tracking-normal text-accent-cyan">
          {{ formatDistance(distance) }}
        </span>
        {{ item.reviewCount > 0 ? reviewsLabel(item.reviewCount) : "Открыть" }}
      </span>
    </div>
  </NuxtLink>
</template>
