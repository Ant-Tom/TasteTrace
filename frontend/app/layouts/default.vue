<script setup lang="ts">
// Карта и список живут в layout, поэтому при переходе между / и /place/:id
// они не пересоздаются — меняется только панель заведения (страница).
const route = useRoute();
const { data, status } = useEstablishments();
const { query, cuisine, minRating, sortByDistance, cuisines, distances, filtered, resetFilters } =
  useEstablishmentFilters(data);
const selectedId = useSelectedEstablishmentId();
const { location: userLocation } = useUserLocation();
const { area, pending: pendingArea, onUserMove, applyPending, clearArea } = useMapArea();

// Карта показывает всё найденное, а список можно сузить до видимой области.
const listItems = computed(() => {
  const bounds = area.value;
  return bounds ? filtered.value.filter((item) => isInBounds(item, bounds)) : filtered.value;
});

const filtersActive = computed(() => !!query.value || cuisine.value !== ALL_CUISINES || minRating.value > 0);

const isLoading = computed(() => status.value === "idle" || status.value === "pending");
const isError = computed(() => status.value === "error");

function select(id: number) {
  if (id === selectedId.value) return;
  navigateTo({ path: `/place/${id}`, query: route.query });
}
</script>

<template>
  <div class="relative h-full min-h-0 overflow-hidden bg-surface md:flex md:flex-row">
    <!-- На телефоне карта на весь экран (снизу — полоска под свёрнутую шторку, где видна атрибуция карты). -->
    <div class="absolute inset-x-0 top-0 bottom-[112px] min-w-0 md:relative md:inset-auto md:order-2 md:h-full md:flex-1">
      <ClientOnly>
        <!-- Lazy: тяжёлый WebGL-движок карты грузится отдельным чанком и не задерживает список. -->
        <LazyMapView
          :items="filtered"
          :selected-id="selectedId"
          :user-location="userLocation"
          :filters-active="filtersActive"
          @select="select"
          @user-move="onUserMove"
        />
        <template #fallback>
          <div class="absolute inset-0 flex items-center justify-center bg-surface text-sm text-slate-400">
            Загрузка карты...
          </div>
        </template>
      </ClientOnly>
      <AppHeader :total-count="data.length" :visible-count="listItems.length" :hide-on-mobile="selectedId != null" />
      <button
        v-if="pendingArea"
        type="button"
        class="absolute left-1/2 top-[76px] z-20 -translate-x-1/2 whitespace-nowrap rounded-full bg-surface-raised/95 px-4 py-2 text-sm font-medium text-accent-cyan shadow-panel ring-1 ring-accent-cyan/40 backdrop-blur transition hover:bg-surface-raised md:top-28"
        @click="applyPending"
      >
        Искать в этой области
      </button>
      <slot />
    </div>

    <ListSheet :collapsed="selectedId != null">
      <EstablishmentList
        v-model:query="query"
        v-model:cuisine="cuisine"
        v-model:min-rating="minRating"
        v-model:sort-by-distance="sortByDistance"
        :items="listItems"
        :total-count="data.length"
        :area-active="area != null"
        :cuisines="cuisines"
        :distances="distances"
        :selected-id="selectedId"
        :is-loading="isLoading"
        :is-error="isError"
        @reset="resetFilters"
        @clear-area="clearArea"
      />
    </ListSheet>

    <AuthModal />
    <PhotoLightbox />
  </div>
</template>
