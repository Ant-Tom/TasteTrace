import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createReview,
  fetchReviews,
  resolvePhotoUrl,
  setReviewReaction,
  updateReview,
  uploadReviewPhotos
} from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import type { Review, ReviewVote } from "@/types/review";
import { cn } from "@/lib/utils";
import { canAddPhotos, getPhotoHint, getTextHint, MIN_RECOMMENDED_PHOTOS } from "./reviewHints";

type ReviewSectionProps = {
  establishmentId: number;
  onNeedAuth: () => void;
};

const MAX_PHOTOS = 6;

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("ru-RU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

export function ReviewSection({ establishmentId, onNeedAuth }: ReviewSectionProps) {
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: reviews = [], isLoading } = useQuery({
    queryKey: ["reviews", establishmentId],
    queryFn: () => fetchReviews(establishmentId)
  });

  const editableReview = useMemo(
    () => reviews.find((r) => r.ownedByCurrentUser && r.canEdit),
    [reviews]
  );

  const [rating, setRating] = useState(5);
  const [text, setText] = useState("");
  const [pendingPhotos, setPendingPhotos] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editDismissed, setEditDismissed] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    setSubmitted(false);
    setEditDismissed(false);
  }, [establishmentId]);

  useEffect(() => {
    if (submitted || !editableReview || editDismissed) return;
    setEditingId(editableReview.id);
    setRating(editableReview.rating);
    setText(editableReview.text);
    setPendingPhotos([]);
    setPhotoPreviews([]);
  }, [editableReview, editDismissed, submitted]);

  useEffect(() => {
    const urls = pendingPhotos.map((f) => URL.createObjectURL(f));
    setPhotoPreviews(urls);
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [pendingPhotos]);

  const existingPhotoCount =
    editingId != null ? (reviews.find((r) => r.id === editingId)?.photoUrls.length ?? 0) : 0;
  const totalPhotoCount = existingPhotoCount + pendingPhotos.length;

  const textHint = getTextHint(text);
  const photoHint = getPhotoHint(text, totalPhotoCount);
  const showPhotoPicker = canAddPhotos(text) && totalPhotoCount < MAX_PHOTOS;

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["reviews", establishmentId] });

  async function uploadPhotosForReview(reviewId: number) {
    if (pendingPhotos.length === 0) return;
    await uploadReviewPhotos(reviewId, pendingPhotos);
    setPendingPhotos([]);
  }

  const createMutation = useMutation({
    mutationFn: async () => {
      const review = await createReview(establishmentId, { rating, text });
      await uploadPhotosForReview(review.id);
      return review;
    },
    onSuccess: () => {
      setText("");
      setRating(5);
      setPendingPhotos([]);
      setEditingId(null);
      setEditDismissed(true);
      setSubmitted(true);
      invalidate();
      queryClient.invalidateQueries({ queryKey: ["establishments"] });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async (reviewId: number) => {
      const review = await updateReview(reviewId, { rating, text });
      await uploadPhotosForReview(reviewId);
      return review;
    },
    onSuccess: () => {
      setEditingId(null);
      setText("");
      setRating(5);
      setPendingPhotos([]);
      setEditDismissed(true);
      setSubmitted(true);
      invalidate();
      queryClient.invalidateQueries({ queryKey: ["establishments"] });
    }
  });

  function openEditForm() {
    setSubmitted(false);
    setEditDismissed(false);
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!token) {
      onNeedAuth();
      return;
    }
    if (editingId != null) {
      updateMutation.mutate(editingId);
    } else {
      createMutation.mutate();
    }
  }

  function handlePhotoSelect(files: FileList | null) {
    if (!files?.length) return;
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    const picked = Array.from(files).filter((f) => allowed.includes(f.type));
    const slotsLeft = MAX_PHOTOS - totalPhotoCount;
    if (slotsLeft <= 0) return;
    setPendingPhotos((prev) => [...prev, ...picked].slice(0, slotsLeft));
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function removePendingPhoto(index: number) {
    setPendingPhotos((prev) => prev.filter((_, i) => i !== index));
  }

  const isPending = createMutation.isPending || updateMutation.isPending;
  const formError = createMutation.error ?? updateMutation.error;

  return (
    <section className="mt-4 space-y-4 border-t border-border-subtle pt-4">
      <h3 className="font-display text-sm font-semibold uppercase tracking-wider text-slate-400">
        Отзывы ({reviews.length})
      </h3>

      {isLoading && <p className="text-sm text-slate-500">Загрузка отзывов...</p>}

      <ul className="max-h-48 space-y-2 overflow-y-auto scrollbar-thin">
        {reviews.map((review) => (
          <ReviewItem
            key={review.id}
            review={review}
            establishmentId={establishmentId}
            hasToken={!!token}
            onNeedAuth={onNeedAuth}
          />
        ))}
        {!isLoading && reviews.length === 0 && (
          <p className="text-sm text-slate-500">Пока нет отзывов. Будьте первым.</p>
        )}
      </ul>

      {!token ? (
        <p className="text-sm text-slate-400">
          <button type="button" className="text-accent-cyan underline" onClick={onNeedAuth}>
            Войдите
          </button>
          , чтобы оставить отзыв
        </p>
      ) : submitted ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-border-subtle bg-surface-raised/40 py-6 text-center">
          <div
            className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/20 text-2xl text-emerald-400"
            aria-hidden
          >
            ✓
          </div>
          <p className="max-w-xs text-sm text-slate-200">
            Спасибо! Ваш отзыв отправлен на модерацию
          </p>
          {editableReview && (
            <button
              type="button"
              onClick={openEditForm}
              className="text-xs text-accent-cyan underline hover:text-accent-cyan/80"
            >
              Изменить отзыв
            </button>
          )}
        </div>
      ) : (
        <form className="space-y-2" onSubmit={handleSubmit}>
          <>
            <p className="text-xs text-slate-500">
              {editingId != null
                ? `Редактирование (осталось до 24 ч с момента публикации). Вы: ${user?.displayName}`
                : `Новый отзыв от ${user?.displayName}. После 24 ч правки закрыты — можно только добавить новый.`}
            </p>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  className={cn(
                    "text-lg transition",
                    star <= rating ? "text-accent-amber" : "text-slate-600"
                  )}
                >
                  ★
                </button>
              ))}
            </div>
            <textarea
              className="w-full rounded-xl border border-border-subtle bg-surface-raised/80 px-3 py-2 text-sm text-white outline-none focus:border-accent-cyan/50"
              rows={3}
              minLength={10}
              maxLength={2000}
              placeholder="Ваш отзыв (мин. 10 символов)"
              value={text}
              onChange={(e) => setText(e.target.value)}
              required
            />
            {textHint && (
              <p className="text-xs text-accent-amber/90">{textHint}</p>
            )}
            {showPhotoPicker && (
              <div className="space-y-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  className="hidden"
                  onChange={(e) => handlePhotoSelect(e.target.files)}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="rounded-lg border border-dashed border-border-subtle px-3 py-2 text-xs text-slate-400 hover:border-accent-cyan/40 hover:text-accent-cyan"
                >
                  + Добавить фото ({totalPhotoCount}/{MAX_PHOTOS}, лучше ≥{MIN_RECOMMENDED_PHOTOS})
                </button>
                {(photoPreviews.length > 0 || existingPhotoCount > 0) && (
                  <div className="flex flex-wrap gap-2">
                    {editingId != null &&
                      reviews
                        .find((r) => r.id === editingId)
                        ?.photoUrls.map((url) => (
                          <img
                            key={url}
                            src={resolvePhotoUrl(url)}
                            alt=""
                            className="h-14 w-14 rounded-lg object-cover"
                          />
                        ))}
                    {photoPreviews.map((src, i) => (
                      <div key={src} className="relative">
                        <img src={src} alt="" className="h-14 w-14 rounded-lg object-cover" />
                        <button
                          type="button"
                          onClick={() => removePendingPhoto(i)}
                          className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-slate-800 text-xs text-white"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {photoHint && <p className="text-xs text-accent-cyan/90">{photoHint}</p>}
              </div>
            )}
            {formError && (
              <p className="text-sm text-red-400">
                {formError instanceof Error ? formError.message : "Ошибка"}
              </p>
            )}
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={isPending}
                className="rounded-xl bg-accent-cyan/20 px-4 py-2 text-sm font-medium text-accent-cyan hover:bg-accent-cyan/30 disabled:opacity-50"
              >
                {editingId != null ? "Сохранить" : "Опубликовать"}
              </button>
              {editingId != null && (
                <button
                  type="button"
                  className="rounded-xl px-4 py-2 text-sm text-slate-400 hover:text-white"
                  onClick={() => {
                    setEditingId(null);
                    setEditDismissed(true);
                    setText("");
                    setRating(5);
                    setPendingPhotos([]);
                  }}
                >
                  Отмена
                </button>
              )}
            </div>
          </>
        </form>
      )}
    </section>
  );
}

function ReviewItem({
  review,
  establishmentId,
  hasToken,
  onNeedAuth
}: {
  review: Review;
  establishmentId: number;
  hasToken: boolean;
  onNeedAuth: () => void;
}) {
  const queryClient = useQueryClient();
  const photos = review.photoUrls ?? [];
  const likeCount = review.likeCount ?? 0;
  const dislikeCount = review.dislikeCount ?? 0;
  const userVote = review.currentUserVote ?? null;

  const voteMutation = useMutation({
    mutationFn: (vote: ReviewVote) => setReviewReaction(review.id, vote),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reviews", establishmentId] });
    }
  });

  function handleVote(vote: ReviewVote) {
    if (!hasToken) {
      onNeedAuth();
      return;
    }
    if (review.ownedByCurrentUser) return;
    voteMutation.mutate(vote);
  }

  return (
    <li className="rounded-lg border border-border-subtle bg-surface-raised/40 px-3 py-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-white">{review.authorName}</span>
        <span className="text-xs text-accent-amber">★ {review.rating}</span>
      </div>
      <p className="mt-1 text-sm text-slate-300">{review.text}</p>
      {photos.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {photos.map((url) => (
            <a key={url} href={resolvePhotoUrl(url)} target="_blank" rel="noreferrer">
              <img
                src={resolvePhotoUrl(url)}
                alt=""
                className="h-12 w-12 rounded-md object-cover"
              />
            </a>
          ))}
        </div>
      )}
      <div className="mt-2 flex items-center justify-between gap-2">
        <p className="text-[10px] text-slate-500">
          {formatDate(review.createdAt)}
          {review.ownedByCurrentUser && review.canEdit && (
            <span className="ml-2 text-accent-cyan">· можно редактировать</span>
          )}
          {review.ownedByCurrentUser && !review.canEdit && (
            <span className="ml-2 text-slate-600">· только новый отзыв</span>
          )}
        </p>
        {!review.ownedByCurrentUser && (
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              disabled={voteMutation.isPending}
              onClick={() => handleVote("LIKE")}
              className={cn(
                "flex items-center gap-1 rounded-lg px-2 py-1 text-xs transition",
                userVote === "LIKE"
                  ? "bg-emerald-500/20 text-emerald-400"
                  : "text-slate-500 hover:bg-surface-raised hover:text-emerald-400"
              )}
              title="Нравится"
            >
              <span aria-hidden>👍</span>
              <span>{likeCount}</span>
            </button>
            <button
              type="button"
              disabled={voteMutation.isPending}
              onClick={() => handleVote("DISLIKE")}
              className={cn(
                "flex items-center gap-1 rounded-lg px-2 py-1 text-xs transition",
                userVote === "DISLIKE"
                  ? "bg-red-500/20 text-red-400"
                  : "text-slate-500 hover:bg-surface-raised hover:text-red-400"
              )}
              title="Не нравится"
            >
              <span aria-hidden>👎</span>
              <span>{dislikeCount}</span>
            </button>
          </div>
        )}
      </div>
    </li>
  );
}
