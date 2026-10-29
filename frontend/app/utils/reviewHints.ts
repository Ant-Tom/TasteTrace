const SHORT_MAX = 80;
const MEDIUM_MAX = 200;
export const MIN_RECOMMENDED_PHOTOS = 3;

export function getTextHint(text: string): string | null {
  const len = text.trim().length;
  if (len === 0) return null;
  if (len < SHORT_MAX) {
    return "Мало, ваш отзыв может быть не интересен остальным";
  }
  if (len < MEDIUM_MAX) {
    return "Уже хорошо, может есть еще детали, которые вы хотели бы уточнить";
  }
  return "Отлично! Фото сделают отзыв ещё полезнее — лучше три и больше";
}

export function getPhotoHint(photoCount: number): string | null {
  if (photoCount > 0 && photoCount < MIN_RECOMMENDED_PHOTOS) {
    return "Хорошо, может еще добавите парочку фото?";
  }
  return null;
}
