const SHORT_MAX = 80;
const MEDIUM_MAX = 200;
export const MIN_RECOMMENDED_PHOTOS = 3;

export type TextHintKind = "short" | "medium" | "long" | null;

export function getTextHint(text: string): string | null {
  const len = text.trim().length;
  if (len === 0) return null;
  if (len < SHORT_MAX) {
    return "Мало, ваш отзыв может быть не интересен остальным";
  }
  if (len < MEDIUM_MAX) {
    return "Уже хорошо, может есть еще детали, которые вы хотели бы уточнить";
  }
  return "Отлично, теперь можете оставить фото, лучше не менее трёх";
}

export function canAddPhotos(text: string): boolean {
  return text.trim().length >= MEDIUM_MAX;
}

export function getPhotoHint(text: string, photoCount: number): string | null {
  if (!canAddPhotos(text)) return null;
  if (photoCount > 0 && photoCount < MIN_RECOMMENDED_PHOTOS) {
    return "Хорошо, может еще добавите парочку фото?";
  }
  return null;
}
