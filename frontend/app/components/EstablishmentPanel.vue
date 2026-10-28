<script setup lang="ts">
import type { Establishment } from "~/types/establishment";

const props = defineProps<{ establishment: Establishment }>();

const ratingLabel = computed(() =>
  props.establishment.reviewCount > 0
    ? `${props.establishment.rating.toFixed(1)} · ${reviewsLabel(props.establishment.reviewCount)}`
    : "нет отзывов"
);

const routeUrl = computed(
  () =>
    `https://yandex.ru/maps/?rtext=~${props.establishment.latitude},${props.establishment.longitude}&rtt=auto`
);

const authModal = useAuthModal();

// На телефоне — системное меню «Поделиться», на компьютере — копирование ссылки.
const shareStatus = ref<string | null>(null);
let shareStatusTimer: ReturnType<typeof setTimeout> | undefined;

async function share() {
  const url = `${window.location.origin}/place/${props.establishment.id}`;
  const title = props.establishment.name;
  try {
    if (navigator.share) {
      await navigator.share({ title, text: `${title} — «Где поесть»`, url });
      return;
    }
    await navigator.clipboard.writeText(url);
    shareStatus.value = "Ссылка скопирована";
  } catch (error) {
    if ((error as DOMException).name === "AbortError") return;
    shareStatus.value = "Не удалось поделиться";
  }
  clearTimeout(shareStatusTimer);
  shareStatusTimer = setTimeout(() => (shareStatus.value = null), 2500);
}

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
onBeforeUnmount(() => {
  window.removeEventListener("keydown", onKeydown);
  clearTimeout(shareStatusTimer);
});
</script>

<template>
  <aside
    class="absolute bottom-0 left-0 right-0 z-30 max-h-[66%] overflow-y-auto rounded-t-2xl motion-safe:animate-panel-in border-t border-border-subtle bg-surface/95 p-4 shadow-panel backdrop-blur-xl scrollbar-thin md:bottom-4 md:left-4 md:right-auto md:max-h-[calc(100%-7rem)] md:w-[380px] md:rounded-2xl md:border"
    :aria-label="`Заведение ${establishment.name}`"
  >
    <div class="mb-2 flex items-start justify-between gap-2">
      <div>
        <h1 class="font-display text-lg font-bold text-white">{{ establishment.name }}</h1>
        <p class="text-sm text-slate-400">{{ [establishment.cuisine, establishment.city].filter(Boolean).join(" · ") }}</p>
        <p v-if="establishment.address" class="mt-1 text-xs text-slate-400">{{ establishment.address }}</p>
        <div class="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
          <p v-if="establishment.reviewCount > 0" class="text-slate-200">
            <span class="text-accent-amber" aria-hidden="true">★</span> {{ ratingLabel }}
          </p>
          <p v-else class="text-slate-400">Пока без отзывов — станьте первым</p>
          <ClientOnly>
            <p v-if="distanceLabel" class="text-accent-cyan">{{ distanceLabel }}</p>
          </ClientOnly>
        </div>
        <div class="mt-3 flex flex-wrap items-center gap-2">
          <a
            :href="routeUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-border-subtle bg-surface-raised px-3.5 text-sm text-slate-200 transition hover:border-accent-cyan/50 hover:text-accent-cyan active:scale-95"
          >
            <svg class="h-4 w-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
              <path d="M10 18s6-5.2 6-10a6 6 0 1 0-12 0c0 4.8 6 10 6 10Z" stroke-linejoin="round" />
              <circle cx="10" cy="8" r="2.2" />
            </svg>
            Маршрут
          </a>
          <button
            type="button"
            class="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-border-subtle bg-surface-raised px-3.5 text-sm text-slate-200 transition hover:border-accent-cyan/50 hover:text-accent-cyan active:scale-95"
            @click="share"
          >
            <svg class="h-4 w-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
              <path d="M10 13V3m0 0L6.5 6.5M10 3l3.5 3.5" stroke-linecap="round" stroke-linejoin="round" />
              <path d="M5 10H4v7h12v-7h-1" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
            Поделиться
          </button>
          <span v-if="shareStatus" class="text-sm text-slate-300 motion-safe:animate-fade-in" role="status">
            {{ shareStatus }}
          </span>
        </div>
      </div>
      <button
        type="button"
        aria-label="Закрыть карточку заведения"
        class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-surface-raised hover:text-white"
        @click="close"
      >
        ✕
      </button>
    </div>

    <ReviewSection :establishment-id="establishment.id" />
  </aside>
</template>
