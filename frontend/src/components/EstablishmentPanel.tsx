import { cuisineLabel } from "@/lib/cuisine";
import type { Establishment } from "@/types/establishment";
import { ReviewSection } from "@/features/reviews/ReviewSection";

type EstablishmentPanelProps = {
  establishment: Establishment | null;
  onClose: () => void;
  onNeedAuth: () => void;
};

export function EstablishmentPanel({ establishment, onClose, onNeedAuth }: EstablishmentPanelProps) {
  if (!establishment) return null;

  const ratingLabel =
    establishment.reviewCount > 0
      ? `${establishment.rating.toFixed(1)} (${establishment.reviewCount})`
      : "нет отзывов";

  return (
    <aside className="absolute bottom-0 left-0 right-0 z-30 max-h-[55vh] overflow-y-auto rounded-t-2xl border-t border-border-subtle bg-surface/95 p-4 shadow-panel backdrop-blur-xl md:bottom-4 md:left-4 md:right-auto md:max-h-[calc(100%-6rem)] md:w-[380px] md:rounded-2xl md:border">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div>
          <h2 className="font-display text-lg font-bold text-white">{establishment.name}</h2>
          <p className="text-sm text-slate-400">
            {cuisineLabel(establishment.cuisine)} · {establishment.city}
          </p>
          <p className="mt-1 text-sm text-accent-amber">★ {ratingLabel}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg px-2 py-1 text-slate-400 hover:bg-surface-raised hover:text-white"
        >
          ✕
        </button>
      </div>

      <ReviewSection establishmentId={establishment.id} onNeedAuth={onNeedAuth} />
    </aside>
  );
}
