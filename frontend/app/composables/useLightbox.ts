export function useLightbox() {
  const state = useState("lightbox", () => ({ open: false, photos: [] as string[], index: 0, caption: "" }));

  function open(photos: string[], index = 0, caption = "") {
    state.value = { open: true, photos, index, caption };
  }

  function close() {
    state.value = { ...state.value, open: false };
  }

  function step(delta: number) {
    const count = state.value.photos.length;
    if (count === 0) return;
    state.value = { ...state.value, index: (state.value.index + delta + count) % count };
  }

  return { state, open, close, step };
}
