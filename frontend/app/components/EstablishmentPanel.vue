<script setup lang="ts">
import type { Establishment } from "~/types/establishment";

const props = defineProps<{ establishment: Establishment }>();

const ratingLabel = computed(() =>
  props.establishment.reviewCount > 0
    ? `${props.establishment.rating.toFixed(1)} (${props.establishment.reviewCount})`
    : "нет отзывов"
);

const routeUrl = computed(
  () =>
    `https://yandex.ru/maps/?rtext=~${props.establishment.latitude},${props.establishment.longitude}&rtt=auto`
);

const authModal = useAuthModal();

const route = useRoute();
const { location: userLocation } = useUserLocation();
const distanceLabel = computed(() => {
  const location = userLocation.value;
  const { latitude, longitude } = props.establishment;
  if (!location || !Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  return `${formatDistance(distanceMeters(location, latitude, longitude))} от вас`;
});
const lightbox = useLightbox();

function close() {
  navigateTo({ path: "/", query: route.query });
}

function onKeydown(event: KeyboardEvent) {
  if (event.key !== "Escape" || authModal.state.value.open || lightbox.state.value.open) return;
  const target = event.target as HTMLElement | null;
  if (target?.closest("input, textarea")) return;
  close();
}

onMounted(() => window.addEventListener("keydown", onKeydown));
onBeforeUnmount(() => window.removeEventListener("keydown", onKeydown));
</script>

<template>
  <aside
    class="absolute bottom-0 left-0 right-0 z-30 max-h-[66%] overflow-y-auto rounded-t-2xl border-t border-border-subtle bg-surface/95 p-4 shadow-panel backdrop-blur-xl scrollbar-thin md:bottom-4 md:left-4 md:right-auto md:max-h-[calc(100%-7rem)] md:w-[380px] md:rounded-2xl md:border"
    :aria-label="`Заведение ${establishment.name}`"
  >
    <div class="mb-2 flex items-start justify-between gap-2">
      <div>
        <h1 class="font-display text-lg font-bold text-white">{{ establishment.name }}</h1>
        <p class="text-sm text-slate-400">{{ [establishment.cuisine, establishment.city].filter(Boolean).join(" · ") }}</p>
        <p v-if="establishment.address" class="mt-1 text-xs text-slate-500">{{ establishment.address }}</p>
        <div class="mt-1 flex items-center gap-3">
          <p class="text-sm text-accent-amber">★ {{ ratingLabel }}</p>
          <ClientOnly>
            <p v-if="distanceLabel" class="text-xs text-accent-cyan">{{ distanceLabel }}</p>
          </ClientOnly>
          <a
            :href="routeUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="text-xs text-accent-cyan underline hover:text-accent-cyan/80"
          >
            Маршрут
          </a>
        </div>
      </div>
      <button
        type="button"
        aria-label="Закрыть карточку заведения"
        class="rounded-lg px-2 py-1 text-slate-400 hover:bg-surface-raised hover:text-white"
        @click="close"
      >
        ✕
      </button>
    </div>

    <ReviewSection :establishment-id="establishment.id" />
  </aside>
</template>
