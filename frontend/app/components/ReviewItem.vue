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
          class="flex items-center gap-1 rounded-lg px-2 py-1 text-xs transition"
          :class="
            review.currentUserVote === 'LIKE'
              ? 'bg-emerald-500/20 text-emerald-400'
              : 'text-slate-400 hover:bg-surface-raised hover:text-emerald-400'
          "
          @click="$emit('vote', 'LIKE')"
        >
          <span aria-hidden="true">👍</span>
          <span>{{ review.likeCount ?? 0 }}</span>
        </button>
        <button
          type="button"
          :disabled="voting"
          :aria-pressed="review.currentUserVote === 'DISLIKE'"
          :aria-label="`Не нравится: ${review.dislikeCount ?? 0}`"
          class="flex items-center gap-1 rounded-lg px-2 py-1 text-xs transition"
          :class="
            review.currentUserVote === 'DISLIKE'
              ? 'bg-red-500/20 text-red-400'
              : 'text-slate-400 hover:bg-surface-raised hover:text-red-400'
          "
          @click="$emit('vote', 'DISLIKE')"
        >
          <span aria-hidden="true">👎</span>
          <span>{{ review.dislikeCount ?? 0 }}</span>
        </button>
      </div>
    </div>
  </li>
</template>
