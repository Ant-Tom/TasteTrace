<script setup lang="ts">
const route = useRoute();
const origin = useSiteOrigin();

// Каноническая ссылка без параметров фильтров: для поисковика /place/12?q=суши и /place/12 — одна страница.
const canonical = computed(() => `${origin}${route.path === "/" ? "/" : route.path}`);

useHead(() => ({
  link: [{ rel: "canonical", href: canonical.value }]
}));

// Превью ссылки в Telegram, WhatsApp и VK.
useSeoMeta({
  ogSiteName: "Где поесть",
  ogType: "website",
  ogLocale: "ru_RU",
  ogUrl: () => canonical.value,
  ogImage: `${origin}/og.png`,
  ogImageWidth: 1200,
  ogImageHeight: 630,
  ogImageAlt: "Где поесть — карта кафе и ресторанов Казани",
  twitterCard: "summary_large_image"
});
</script>

<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>
