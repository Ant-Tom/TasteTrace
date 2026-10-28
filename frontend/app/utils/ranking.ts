import type { Establishment } from "~/types/establishment";

/** How many "average" reviews every place is assumed to start with. */
const PRIOR_WEIGHT = 5;

/** Средняя оценка по всем отзывам города — «ожидаемый» рейтинг места, о котором мало что известно. */
export function cityAverageRating(items: Establishment[]): number {
  let sum = 0;
  let count = 0;
  for (const item of items) {
    sum += item.rating * item.reviewCount;
    count += item.reviewCount;
  }
  return count > 0 ? sum / count : 0;
}

/**
 * Байесовское среднее: пока отзывов мало, оценка места тянется к средней по городу.
 * Так место с одним отзывом «5.0» не обгоняет место с полусотней отзывов на 4.7.
 */
export function rankingScore(item: Establishment, cityAverage: number): number {
  return (PRIOR_WEIGHT * cityAverage + item.rating * item.reviewCount) / (PRIOR_WEIGHT + item.reviewCount);
}

/** pluralRu(5, ["отзыв", "отзыва", "отзывов"]) → "отзывов" */
export function pluralRu(n: number, forms: [string, string, string]): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return forms[0];
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return forms[1];
  return forms[2];
}

export function reviewsLabel(n: number): string {
  return `${n} ${pluralRu(n, ["отзыв", "отзыва", "отзывов"])}`;
}
