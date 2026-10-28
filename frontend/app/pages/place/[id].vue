<script setup lang="ts">
import type { Establishment } from "~/types/establishment";

const route = useRoute();
const api = useApi();
const id = computed(() => Number(route.params.id));

// Карточка заведения рендерится на сервере — у каждого места своя индексируемая страница.
const { data: establishment, error } = await useAsyncData(
  () => `establishment-${id.value}`,
  () => api<Establishment>(`/api/establishments/${id.value}`)
);

if (import.meta.server && error.value) {
  setResponseStatus(useRequestEvent()!, error.value.statusCode === 404 ? 404 : 502);
}

const ratingText = computed(() => {
  const item = establishment.value;
  if (!item || item.reviewCount === 0) return "пока без отзывов";
  return `рейтинг ${item.rating.toFixed(1)} по ${item.reviewCount} отзывам`;
});

useSeoMeta({
  title: () => {
    const item = establishment.value;
    if (!item) return "Заведение не найдено | TasteTrace";
    return `${item.name} — ${[item.cuisine, item.city].filter(Boolean).join(", ")} | TasteTrace`;
  },
  ogTitle: () => establishment.value?.name ?? "TasteTrace",
  description: () => {
    const item = establishment.value;
    if (!item) return "Заведение не найдено на гастрокарте Казани.";
    const details = [item.cuisine.toLowerCase(), item.address].filter(Boolean).join(", ");
    return `${item.name}${details ? ` (${details})` : ""}: ${ratingText.value}. Отзывы и фото на TasteTrace.`;
  },
  ogDescription: () => (establishment.value ? `${establishment.value.cuisine} · ${ratingText.value}` : undefined),
  robots: () => (establishment.value ? undefined : "noindex")
});

useHead(() => {
  const item = establishment.value;
  if (!item) return {};
  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "FoodEstablishment",
    name: item.name,
    servesCuisine: item.cuisine,
    address: {
      "@type": "PostalAddress",
      addressLocality: item.city,
      ...(item.address ? { streetAddress: item.address } : {})
    },
    geo: { "@type": "GeoCoordinates", latitude: item.latitude, longitude: item.longitude }
  };
  if (item.reviewCount > 0) {
    jsonLd.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: item.rating.toFixed(1),
      reviewCount: item.reviewCount
    };
  }
  return {
    script: [{ type: "application/ld+json", innerHTML: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }]
  };
});
</script>

<template>
  <EstablishmentPanel v-if="establishment" :establishment="establishment" />
  <aside
    v-else-if="error"
    class="absolute bottom-0 left-0 right-0 z-30 rounded-t-2xl border-t border-border-subtle bg-surface/95 p-4 shadow-panel backdrop-blur-xl md:bottom-4 md:left-4 md:right-auto md:w-[380px] md:rounded-2xl md:border"
  >
    <p class="text-sm text-slate-300">
      {{ error.statusCode === 404 ? "Такого заведения нет на карте." : "Не удалось загрузить заведение." }}
    </p>
    <NuxtLink to="/" class="mt-2 inline-block text-sm text-accent-cyan underline">Вернуться к карте</NuxtLink>
  </aside>
</template>
