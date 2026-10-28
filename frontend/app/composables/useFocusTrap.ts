const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([tabindex="-1"]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Держит фокус клавиатуры внутри открытого диалога (Tab и Shift+Tab ходят по кругу),
 * а после закрытия возвращает его туда, откуда диалог открыли. Без этого Tab уводит
 * на страницу под затемнением, и пользователь клавиатуры теряется.
 */
export function useFocusTrap(container: Ref<HTMLElement | null>, active: Ref<boolean>) {
  let returnFocusTo: HTMLElement | null = null;

  function focusables(): HTMLElement[] {
    return Array.from(container.value?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []).filter(
      (el) => el.offsetParent !== null || el === document.activeElement
    );
  }

  function onKeydown(event: KeyboardEvent) {
    if (!active.value || event.key !== "Tab" || !container.value) return;
    const items = focusables();
    if (items.length === 0) return;
    const first = items[0]!;
    const last = items[items.length - 1]!;
    const current = document.activeElement as HTMLElement | null;

    if (!current || !container.value.contains(current)) {
      event.preventDefault();
      first.focus();
    } else if (event.shiftKey && current === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && current === last) {
      event.preventDefault();
      first.focus();
    }
  }

  watch(active, (isActive, wasActive) => {
    if (isActive && !wasActive) {
      returnFocusTo = document.activeElement as HTMLElement | null;
    } else if (!isActive && wasActive) {
      returnFocusTo?.focus?.();
      returnFocusTo = null;
    }
  });

  onMounted(() => document.addEventListener("keydown", onKeydown));
  onBeforeUnmount(() => document.removeEventListener("keydown", onKeydown));
}
