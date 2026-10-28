<script setup lang="ts">
import type { Review, ReviewReactionStats, ReviewVote } from "~/types/review";

const props = defineProps<{ establishmentId: number }>();

const MAX_PHOTOS = 6;
const ALLOWED_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];

const auth = useAuthStore();
const authModal = useAuthModal();
const api = useApi();
const resolvePhotoUrl = useResolvePhotoUrl();

const reviewsKey = computed(() => `reviews-${props.establishmentId}`);
const {
  data: reviews,
  status,
  refresh
} = await useAsyncData(reviewsKey, () => api<Review[]>(`/api/establishments/${props.establishmentId}/reviews`), {
  default: () => []
});

// Список отзывов зависит от того, кто смотрит (голоса, права на правку).
watch(
  () => auth.token,
  () => refresh()
);

const editableReview = computed(() => reviews.value.find((r) => r.ownedByCurrentUser && r.canEdit));

const rating = ref(5);
const text = ref("");
const pendingPhotos = ref<File[]>([]);
const photoPreviews = ref<string[]>([]);
const editingId = ref<number | null>(null);
const editDismissed = ref(false);
const submitted = ref(false);
const isPending = ref(false);
const formError = ref<string | null>(null);
const fileInput = ref<HTMLInputElement | null>(null);

function resetForm() {
  editingId.value = null;
  rating.value = 5;
  text.value = "";
  pendingPhotos.value = [];
  formError.value = null;
}

watch(
  () => props.establishmentId,
  () => {
    resetForm();
    submitted.value = false;
    editDismissed.value = false;
  }
);

watch(
  [editableReview, editDismissed, submitted],
  ([review, dismissed, isSubmitted]) => {
    if (isSubmitted || !review || dismissed) return;
    editingId.value = review.id;
    rating.value = review.rating;
    text.value = review.text;
    pendingPhotos.value = [];
  },
  { immediate: true }
);

watch(pendingPhotos, (files, _, onCleanup) => {
  const urls = files.map((file) => URL.createObjectURL(file));
  photoPreviews.value = urls;
  onCleanup(() => urls.forEach((url) => URL.revokeObjectURL(url)));
});

const editingReview = computed(() =>
  editingId.value != null ? reviews.value.find((r) => r.id === editingId.value) : undefined
);
const existingPhotoCount = computed(() => editingReview.value?.photoUrls.length ?? 0);
const totalPhotoCount = computed(() => existingPhotoCount.value + pendingPhotos.value.length);

const textHint = computed(() => getTextHint(text.value));
const photoHint = computed(() => getPhotoHint(text.value, totalPhotoCount.value));
const showPhotoPicker = computed(() => canAddPhotos(text.value) && totalPhotoCount.value < MAX_PHOTOS);

async function uploadPendingPhotos(reviewId: number) {
  if (pendingPhotos.value.length === 0) return;
  const form = new FormData();
  for (const file of pendingPhotos.value) form.append("files", file);
  await api<string[]>(`/api/reviews/${reviewId}/photos`, { method: "POST", body: form });
  pendingPhotos.value = [];
}

async function handleSubmit() {
  if (!auth.token) {
    authModal.open("login");
    return;
  }
  isPending.value = true;
  formError.value = null;
  try {
    const body = { rating: rating.value, text: text.value };
    if (editingId.value != null) {
      await api<Review>(`/api/reviews/${editingId.value}`, { method: "PUT", body });
    } else {
      const review = await api<Review>(`/api/establishments/${props.establishmentId}/reviews`, {
        method: "POST",
        body
      });
      // Отзыв уже создан: если загрузка фото упадёт, повторная отправка обновит его, а не создаст дубль.
      editingId.value = review.id;
    }
    await uploadPendingPhotos(editingId.value!);

    resetForm();
    editDismissed.value = true;
    submitted.value = true;
    await Promise.all([refresh(), refreshNuxtData([ESTABLISHMENTS_KEY, `establishment-${props.establishmentId}`])]);
  } catch (err) {
    formError.value = getErrorMessage(err);
    if (isUnauthorized(err)) authModal.open("login");
  } finally {
    isPending.value = false;
  }
}

function cancelEdit() {
  resetForm();
  editDismissed.value = true;
}

function openEditForm() {
  submitted.value = false;
  editDismissed.value = false;
}

function handlePhotoSelect(event: Event) {
  const input = event.target as HTMLInputElement;
  const files = Array.from(input.files ?? []).filter((file) => ALLOWED_PHOTO_TYPES.includes(file.type));
  const slotsLeft = MAX_PHOTOS - existingPhotoCount.value;
  pendingPhotos.value = [...pendingPhotos.value, ...files].slice(0, Math.max(slotsLeft, 0));
  input.value = "";
}

function removePendingPhoto(index: number) {
  pendingPhotos.value = pendingPhotos.value.filter((_, i) => i !== index);
}

const votingId = ref<number | null>(null);

async function vote(review: Review, value: ReviewVote) {
  if (!auth.token) {
    authModal.open("login");
    return;
  }
  if (review.ownedByCurrentUser || votingId.value != null) return;
  votingId.value = review.id;
  try {
    const stats = await api<ReviewReactionStats>(`/api/reviews/${review.id}/reaction`, {
      method: "PUT",
      body: { vote: value }
    });
    review.likeCount = stats.likeCount;
    review.dislikeCount = stats.dislikeCount;
    review.currentUserVote = stats.currentUserVote;
  } catch (err) {
    if (isUnauthorized(err)) authModal.open("login");
  } finally {
    votingId.value = null;
  }
}
</script>

<template>
  <section class="mt-4 space-y-4 border-t border-border-subtle pt-4">
    <h2 class="font-display text-sm font-semibold uppercase tracking-wider text-slate-400">
      Отзывы ({{ reviews.length }})
    </h2>

    <p v-if="status === 'pending' && reviews.length === 0" class="text-sm text-slate-500">Загрузка отзывов...</p>
    <p v-else-if="status === 'error'" class="text-sm text-red-400">Не удалось загрузить отзывы.</p>

    <ul class="space-y-2">
      <ReviewItem
        v-for="review in reviews"
        :key="review.id"
        :review="review"
        :voting="votingId === review.id"
        @vote="(value) => vote(review, value)"
      />
    </ul>
    <p v-if="status === 'success' && reviews.length === 0" class="text-sm text-slate-500">
      Пока нет отзывов. Будьте первым.
    </p>

    <ClientOnly>
      <p v-if="!auth.isAuthenticated" class="text-sm text-slate-400">
        <button type="button" class="text-accent-cyan underline" @click="authModal.open('login')">Войдите</button>,
        чтобы оставить отзыв
      </p>

      <div
        v-else-if="submitted"
        class="flex flex-col items-center gap-3 rounded-xl border border-border-subtle bg-surface-raised/40 py-6 text-center"
        role="status"
      >
        <div
          class="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/20 text-2xl text-emerald-400"
          aria-hidden="true"
        >
          ✓
        </div>
        <p class="max-w-xs text-sm text-slate-200">Спасибо! Ваш отзыв отправлен на модерацию</p>
        <button
          v-if="editableReview"
          type="button"
          class="text-xs text-accent-cyan underline hover:text-accent-cyan/80"
          @click="openEditForm"
        >
          Изменить отзыв
        </button>
      </div>

      <form v-else class="space-y-2" @submit.prevent="handleSubmit">
        <p class="text-xs text-slate-500">
          {{
            editingId != null
              ? `Редактирование (доступно 24 ч с момента публикации). Вы: ${auth.user?.displayName}`
              : `Новый отзыв от ${auth.user?.displayName}. После 24 ч правки закрыты — можно только добавить новый.`
          }}
        </p>
        <div class="flex gap-1" role="radiogroup" aria-label="Оценка">
          <button
            v-for="star in 5"
            :key="star"
            type="button"
            role="radio"
            :aria-checked="rating === star"
            :aria-label="`${star} из 5`"
            class="text-lg transition"
            :class="star <= rating ? 'text-accent-amber' : 'text-slate-600'"
            @click="rating = star"
          >
            ★
          </button>
        </div>
        <textarea
          v-model="text"
          class="w-full rounded-xl border border-border-subtle bg-surface-raised/80 px-3 py-2 text-sm text-white outline-none focus:border-accent-cyan/50"
          rows="3"
          minlength="10"
          maxlength="2000"
          placeholder="Ваш отзыв (мин. 10 символов)"
          aria-label="Текст отзыва"
          required
        />
        <div class="flex justify-between gap-2 text-xs">
          <p v-if="textHint" class="text-accent-amber/90">{{ textHint }}</p>
          <span class="ml-auto shrink-0 text-slate-600">{{ text.length }}/2000</span>
        </div>

        <div v-if="showPhotoPicker || totalPhotoCount > 0" class="space-y-2">
          <input
            ref="fileInput"
            type="file"
            :accept="ALLOWED_PHOTO_TYPES.join(',')"
            multiple
            class="hidden"
            @change="handlePhotoSelect"
          >
          <button
            v-if="showPhotoPicker"
            type="button"
            class="rounded-lg border border-dashed border-border-subtle px-3 py-2 text-xs text-slate-400 hover:border-accent-cyan/40 hover:text-accent-cyan"
            @click="fileInput?.click()"
          >
            + Добавить фото ({{ totalPhotoCount }}/{{ MAX_PHOTOS }}, лучше ≥{{ MIN_RECOMMENDED_PHOTOS }})
          </button>
          <div v-if="totalPhotoCount > 0" class="flex flex-wrap gap-2">
            <img
              v-for="url in editingReview?.photoUrls ?? []"
              :key="url"
              :src="resolvePhotoUrl(url)"
              alt="Фото из отзыва"
              class="h-14 w-14 rounded-lg object-cover"
            >
            <div v-for="(src, i) in photoPreviews" :key="src" class="relative">
              <img :src="src" alt="Новое фото" class="h-14 w-14 rounded-lg object-cover">
              <button
                type="button"
                aria-label="Убрать фото"
                class="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-slate-800 text-xs text-white"
                @click="removePendingPhoto(i)"
              >
                ×
              </button>
            </div>
          </div>
          <p v-if="photoHint" class="text-xs text-accent-cyan/90">{{ photoHint }}</p>
        </div>

        <p v-if="formError" class="text-sm text-red-400" role="alert">{{ formError }}</p>

        <div class="flex gap-2">
          <button
            type="submit"
            :disabled="isPending"
            class="rounded-xl bg-accent-cyan/20 px-4 py-2 text-sm font-medium text-accent-cyan hover:bg-accent-cyan/30 disabled:opacity-50"
          >
            {{ isPending ? "Отправка..." : editingId != null ? "Сохранить" : "Опубликовать" }}
          </button>
          <button
            v-if="editingId != null"
            type="button"
            class="rounded-xl px-4 py-2 text-sm text-slate-400 hover:text-white"
            @click="cancelEdit"
          >
            Отмена
          </button>
        </div>
      </form>
    </ClientOnly>
  </section>
</template>
