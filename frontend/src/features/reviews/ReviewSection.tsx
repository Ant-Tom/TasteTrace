import { FormEvent, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createReview, fetchReviews, updateReview } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import type { Review } from "@/types/review";
import { cn } from "@/lib/utils";

type ReviewSectionProps = {
  establishmentId: number;
  onNeedAuth: () => void;
};

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
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editDismissed, setEditDismissed] = useState(false);

  useEffect(() => {
    if (editableReview && !editDismissed) {
      setEditingId(editableReview.id);
      setRating(editableReview.rating);
      setText(editableReview.text);
    }
  }, [editableReview, editDismissed]);

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["reviews", establishmentId] });

  const createMutation = useMutation({
    mutationFn: () => createReview(establishmentId, { rating, text }),
    onSuccess: () => {
      setText("");
      setRating(5);
      setEditingId(null);
      setEditDismissed(false);
      invalidate();
      queryClient.invalidateQueries({ queryKey: ["establishments"] });
    }
  });

  const updateMutation = useMutation({
    mutationFn: (reviewId: number) => updateReview(reviewId, { rating, text }),
    onSuccess: () => {
      setEditingId(null);
      setText("");
      setRating(5);
      invalidate();
      queryClient.invalidateQueries({ queryKey: ["establishments"] });
    }
  });

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
          <ReviewItem key={review.id} review={review} />
        ))}
        {!isLoading && reviews.length === 0 && (
          <p className="text-sm text-slate-500">Пока нет отзывов. Будьте первым.</p>
        )}
      </ul>

      <form className="space-y-2" onSubmit={handleSubmit}>
        {!token ? (
          <p className="text-sm text-slate-400">
            <button type="button" className="text-accent-cyan underline" onClick={onNeedAuth}>
              Войдите
            </button>
            , чтобы оставить отзыв
          </p>
        ) : (
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
                  }}
                >
                  Отмена
                </button>
              )}
            </div>
          </>
        )}
      </form>
    </section>
  );
}

function ReviewItem({ review }: { review: Review }) {
  return (
    <li className="rounded-lg border border-border-subtle bg-surface-raised/40 px-3 py-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-white">{review.authorName}</span>
        <span className="text-xs text-accent-amber">★ {review.rating}</span>
      </div>
      <p className="mt-1 text-sm text-slate-300">{review.text}</p>
      <p className="mt-1 text-[10px] text-slate-500">
        {formatDate(review.createdAt)}
        {review.ownedByCurrentUser && review.canEdit && (
          <span className="ml-2 text-accent-cyan">· можно редактировать</span>
        )}
        {review.ownedByCurrentUser && !review.canEdit && (
          <span className="ml-2 text-slate-600">· только новый отзыв</span>
        )}
      </p>
    </li>
  );
}
