<script setup lang="ts">
// На телефоне список — выдвижная шторка поверх карты (как в Яндекс.Картах и 2ГИС):
// свёрнута, наполовину или на весь экран. На десктопе это обычная боковая колонка.
type Snap = "peek" | "half" | "full";

const props = defineProps<{
  /** Открыта карточка заведения — шторка уходит вниз, чтобы не спорить с ней за место. */
  collapsed: boolean;
}>();

// Синхронно с bottom-[128px] у области карты в layouts/default.vue.
const PEEK = 128;
const TOP_GAP = 72;
const TAP_THRESHOLD = 6;

const snap = ref<Snap>("half");
const viewportHeight = ref(0);
const dragHeight = ref<number | null>(null);

const heights = computed(() => ({
  peek: PEEK,
  half: Math.round(viewportHeight.value * 0.5),
  full: Math.max(PEEK, viewportHeight.value - TOP_GAP)
}));

// До монтирования высота экрана неизвестна — SSR отдаёт половину экрана через CSS.
const sheetHeight = computed(() => {
  if (!viewportHeight.value) return "50vh";
  return `${dragHeight.value ?? heights.value[snap.value]}px`;
});

let startY = 0;
let startHeight = 0;
let moved = 0;

function onPointerDown(event: PointerEvent) {
  try {
    // Палец может уйти с ручки во время свайпа — продолжаем получать его движения.
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  } catch {
    /* указатель уже отпущен — не критично */
  }
  startY = event.clientY;
  startHeight = heights.value[snap.value];
  moved = 0;
  dragHeight.value = startHeight;
}

function onPointerMove(event: PointerEvent) {
  if (dragHeight.value == null) return;
  const delta = startY - event.clientY;
  moved = Math.max(moved, Math.abs(delta));
  dragHeight.value = Math.min(heights.value.full, Math.max(PEEK, startHeight + delta));
}

function onPointerUp() {
  if (dragHeight.value == null) return;
  if (moved < TAP_THRESHOLD) {
    snap.value = snap.value === "peek" ? "half" : "peek";
  } else {
    const current = dragHeight.value;
    snap.value = (Object.keys(heights.value) as Snap[]).reduce((best, key) =>
      Math.abs(heights.value[key] - current) < Math.abs(heights.value[best] - current) ? key : best
    );
  }
  dragHeight.value = null;
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === "ArrowUp") snap.value = snap.value === "peek" ? "half" : "full";
  else if (event.key === "ArrowDown") snap.value = snap.value === "full" ? "half" : "peek";
  else return;
  event.preventDefault();
}

// Поиск открывает шторку целиком: клавиатура иначе закроет и поле, и результаты.
function onFocusIn(event: FocusEvent) {
  if (window.innerWidth < 768 && (event.target as HTMLElement).matches("input")) {
    snap.value = "full";
  }
}

function updateViewport() {
  viewportHeight.value = window.innerHeight;
}

watch(
  () => props.collapsed,
  (collapsed) => {
    if (collapsed) snap.value = "peek";
  }
);

onMounted(() => {
  updateViewport();
  if (props.collapsed) snap.value = "peek";
  window.addEventListener("resize", updateViewport);
});
onBeforeUnmount(() => window.removeEventListener("resize", updateViewport));

const handleLabel = computed(() =>
  snap.value === "peek" ? "Развернуть список заведений" : "Свернуть список заведений"
);
</script>

<template>
  <div
    class="absolute inset-x-0 bottom-0 z-20 flex flex-col overflow-hidden rounded-t-2xl shadow-panel max-md:h-[var(--sheet-h)] md:relative md:order-1 md:h-full md:w-[min(420px,38vw)] md:max-w-md md:shrink-0 md:rounded-none md:shadow-none"
    :class="{ 'transition-[height] duration-300 ease-out': dragHeight == null }"
    :style="{ '--sheet-h': sheetHeight }"
    @focusin="onFocusIn"
  >
    <button
      type="button"
      class="flex h-6 shrink-0 touch-none cursor-grab items-center justify-center bg-surface-overlay backdrop-blur-xl md:hidden"
      :aria-label="handleLabel"
      :aria-expanded="snap !== 'peek'"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointercancel="onPointerUp"
      @keydown="onKeydown"
    >
      <span class="h-1 w-10 rounded-full bg-slate-500" aria-hidden="true" />
    </button>
    <div class="min-h-0 flex-1">
      <slot />
    </div>
  </div>
</template>
