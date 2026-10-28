<script setup lang="ts">
// Карта и список живут в layout, поэтому при переходе между / и /place/:id
// они не пересоздаются — меняется только панель заведения (страница).
const route = useRoute();
const { data, status } = useEstablishments();
const { query, cuisine, minRating, sortByDistance, cuisines, distances, filtered, resetFilters } =
  useEstablishmentFilters(data);
const selectedId = useSelectedEstablishmentId();
const { location: userLocation } = useUserLocation();

const filtersActive = computed(() => !!query.value || cuisine.value !== ALL_CUISINES || minRating.value > 0);

const isLoading = computed(() => status.value === "idle" || status.value === "pending");
const isError = computed(() => status.value === "error");

function select(id: number) {
  if (id === selectedId.value) return;
  navigateTo({ path: `/place/${id}`, query: route.query });
}
</script>

<template>
  <div class="relative flex h-full min-h-0 flex-col overflow-hidden bg-surface md:flex-row">
    <div class="relative order-1 h-[50vh] min-h-[280px] min-w-0 flex-1 md:order-2 md:h-full">
      <ClientOnly>
        <!-- Lazy: тяжёлый WebGL-движок карты грузится отдельным чанком и не задерживает список. -->
        <LazyMapView
          :items="filtered"
          :selected-id="selectedId" :user-location="userLocation"
          :filters-active="filtersActive"
          @select="select"
        />
        <template #fallback>
          <div class="absolute inset-0 flex items-center justify-center bg-surface text-sm text-slate-500">
            Загрузка карты...
          </div>
        </template>
      </ClientOnly>
      <AppHeader :total-count="data.length" :visible-count="filtered.length" :hide-on-mobile="selectedId != null" />
      <slot />
    </div>

    <div
      class="relative z-10 order-2 h-[50vh] min-h-0 w-full shrink-0 md:order-1 md:h-full md:w-[min(420px,38vw)] md:max-w-md"
    >
      <div class="absolute -top-3 left-0 right-0 z-10 flex justify-center md:hidden">
        <span class="h-1 w-10 rounded-full bg-slate-600" aria-hidden="true" />
      </div>
      <EstablishmentList
        v-model:query="query"
        v-model:cuisine="cuisine"
        v-model:min-rating="minRating"
        v-model:sort-by-distance="sortByDistance"
        :items="filtered"
        :total-count="data.length"
        :cuisines="cuisines"
        :distances="distances"
        :selected-id="selectedId"
        :is-loading="isLoading"
        :is-error="isError"
        @reset="resetFilters"
      />
    </div>

    <AuthModal />
    <PhotoLightbox />
  </div>
</template>
