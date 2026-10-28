<script setup lang="ts">
import type { Review, ReviewVote } from "~/types/review";

const props = defineProps<{
  review: Review;
  voting: boolean;
}>();

defineEmits<{ vote: [value: ReviewVote] }>();

const resolvePhotoUrl = useResolvePhotoUrl();
const lightbox = useLightbox();

const photos = computed(() => props.review.photoUrls ?? []);

// Короткий «пульс» иконки, когда голос засчитан.
const popped = ref<ReviewVote | null>(null);
let popTimer: ReturnType<typeof setTimeout> | undefined;
watch(
  () => props.review.currentUserVote,
  (vote) => {
    if (!vote) return;
    popped.value = vote;
    clearTimeout(popTimer);
    popTimer = setTimeout(() => (popped.value = null), 320);
  }
);
onBeforeUnmount(() => clearTimeout(popTimer));

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("ru-RU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Moscow"
  });
}
</script>

<template>
  <li class="rounded-lg border border-border-subtle bg-surface-raised/40 px-3 py-2">
    <div class="flex items-center justify-between gap-2">
      <span class="text-sm font-medium text-white">{{ review.authorName }}</span>
      <span class="text-xs text-accent-amber" :aria-label="`Оценка ${review.rating} из 5`">★ {{ review.rating }}</span>
    </div>
    <p class="mt-1 whitespace-pre-line break-words text-sm text-slate-300">{{ review.text }}</p>
    <div v-if="photos.length > 0" class="mt-2 flex flex-wrap gap-1.5">
      <a
        v-for="(url, index) in photos"
        :key="url"
        :href="resolvePhotoUrl(url)"
        target="_blank"
        rel="noopener noreferrer"
        :aria-label="`Открыть фото ${index + 1} из ${photos.length}`"
        class="block rounded-md transition hover:opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent-cyan"
        @click.exact.prevent="lightbox.open(photos, index, review.authorName)"
      >
        <img
          :src="resolvePhotoUrl(url, 'thumb')"
          :alt="`Фото от ${review.authorName}`"
          loading="lazy"
          class="h-14 w-14 rounded-md object-cover"
        >
      </a>
    </div>
    <div class="mt-2 flex items-center justify-between gap-2">
      <p class="text-xs text-slate-400">
        <time :datetime="review.createdAt">{{ formatDate(review.createdAt) }}</time>
        <span v-if="review.ownedByCurrentUser && review.canEdit" class="ml-2 text-accent-cyan">· можно редактировать</span>
        <span v-if="review.ownedByCurrentUser && !review.canEdit" class="ml-2 text-slate-500">· только новый отзыв</span>
      </p>
      <div v-if="!review.ownedByCurrentUser" class="flex shrink-0 items-center gap-1">
        <button
          type="button"
          :disabled="voting"
          :aria-pressed="review.currentUserVote === 'LIKE'"
          :aria-label="`Нравится: ${review.likeCount ?? 0}`"
          class="flex min-h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs transition active:scale-95"
          :class="
            review.currentUserVote === 'LIKE'
              ? 'bg-emerald-500/20 text-emerald-400'
              : 'text-slate-400 hover:bg-surface-raised hover:text-emerald-400'
          "
          @click="$emit('vote', 'LIKE')"
        >
          <svg
            class="h-4 w-4"
            :class="{ 'motion-safe:animate-pop': popped === 'LIKE' }"
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            stroke-width="1.7"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="M7 9v8H4V9h3Zm0 0 3.2-5.6a1.6 1.6 0 0 1 3 .9L12.6 8H16a1.6 1.6 0 0 1 1.6 1.9l-1.1 5.6A1.9 1.9 0 0 1 14.6 17H7" />
          </svg>
          <span>{{ review.likeCount ?? 0 }}</span>
        </button>
        <button
          type="button"
          :disabled="voting"
          :aria-pressed="review.currentUserVote === 'DISLIKE'"
          :aria-label="`Не нравится: ${review.dislikeCount ?? 0}`"
          class="flex min-h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs transition active:scale-95"
          :class="
            review.currentUserVote === 'DISLIKE'
              ? 'bg-red-500/20 text-red-400'
              : 'text-slate-400 hover:bg-surface-raised hover:text-red-400'
          "
          @click="$emit('vote', 'DISLIKE')"
        >
          <svg
            class="h-4 w-4 rotate-180"
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            stroke-width="1.7"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path
              :class="{ 'motion-safe:animate-pop': popped === 'DISLIKE' }"
              style="transform-origin: center; transform-box: fill-box"
              d="M7 9v8H4V9h3Zm0 0 3.2-5.6a1.6 1.6 0 0 1 3 .9L12.6 8H16a1.6 1.6 0 0 1 1.6 1.9l-1.1 5.6A1.9 1.9 0 0 1 14.6 17H7"
            />
          </svg>
          <span>{{ review.dislikeCount ?? 0 }}</span>
        </button>
      </div>
    </div>
  </li>
</template>
