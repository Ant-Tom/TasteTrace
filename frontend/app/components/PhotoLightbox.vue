<script setup lang="ts">
const { state, close, step } = useLightbox();
const resolvePhotoUrl = useResolvePhotoUrl();

const closeButton = ref<HTMLButtonElement | null>(null);
const current = computed(() => state.value.photos[state.value.index]);
const hasMany = computed(() => state.value.photos.length > 1);

let touchStartX: number | null = null;

function onKeydown(event: KeyboardEvent) {
  if (!state.value.open) return;
  if (event.key === "Escape") close();
  else if (event.key === "ArrowLeft") step(-1);
  else if (event.key === "ArrowRight") step(1);
  else return;
  event.preventDefault();
}

function onTouchStart(event: TouchEvent) {
  touchStartX = event.touches[0]?.clientX ?? null;
}

function onTouchEnd(event: TouchEvent) {
  const endX = event.changedTouches[0]?.clientX;
  if (touchStartX == null || endX == null) return;
  const dx = endX - touchStartX;
  if (Math.abs(dx) > 50) step(dx < 0 ? 1 : -1);
  touchStartX = null;
}

watch(
  () => state.value.open,
  async (open) => {
    if (!open) return;
    await nextTick();
    closeButton.value?.focus();
  }
);

onMounted(() => window.addEventListener("keydown", onKeydown));
onBeforeUnmount(() => window.removeEventListener("keydown", onKeydown));
</script>

<template>
  <Teleport to="body">
    <div
      v-if="state.open && current"
      class="fixed inset-0 z-[60] flex flex-col bg-black/90 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      :aria-label="state.caption || 'Фото'"
      @touchstart.passive="onTouchStart"
      @touchend.passive="onTouchEnd"
    >
      <div class="flex items-center justify-between px-4 py-3 text-sm text-slate-300">
        <span>
          <template v-if="state.caption">{{ state.caption }} · </template>{{ state.index + 1 }} / {{ state.photos.length }}
        </span>
        <button
          ref="closeButton"
          type="button"
          aria-label="Закрыть просмотр фото"
          class="rounded-lg px-3 py-1.5 text-lg text-slate-300 hover:bg-white/10 hover:text-white"
          @click="close"
        >
          ✕
        </button>
      </div>

      <div class="relative flex min-h-0 flex-1 items-center justify-center px-4 pb-6" @click.self="close">
        <button
          v-if="hasMany"
          type="button"
          aria-label="Предыдущее фото"
          class="absolute left-2 top-1/2 hidden -translate-y-1/2 rounded-full bg-white/10 px-3 py-2 text-2xl text-white hover:bg-white/20 sm:block"
          @click="step(-1)"
        >
          ‹
        </button>
        <img
          :key="current"
          :src="resolvePhotoUrl(current)"
          :alt="state.caption ? `Фото: ${state.caption}` : 'Фото из отзыва'"
          class="max-h-full max-w-full select-none rounded-lg object-contain shadow-panel"
          draggable="false"
        >
        <button
          v-if="hasMany"
          type="button"
          aria-label="Следующее фото"
          class="absolute right-2 top-1/2 hidden -translate-y-1/2 rounded-full bg-white/10 px-3 py-2 text-2xl text-white hover:bg-white/20 sm:block"
          @click="step(1)"
        >
          ›
        </button>
      </div>
    </div>
  </Teleport>
</template>
