import { forwardRef } from "react";
import { cuisineColor, cuisineLabel } from "@/lib/cuisine";
import { cn } from "@/lib/utils";
import type { Establishment } from "@/types/establishment";

type EstablishmentCardProps = {
  item: Establishment;
  selected: boolean;
  onSelect: () => void;
};

function RatingStars({ rating }: { rating: number }) {
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;

  return (
    <span className="inline-flex items-center gap-0.5 text-accent-amber" aria-hidden>
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i} className={cn("text-xs", i < full || (i === full && half) ? "opacity-100" : "opacity-25")}>
          ★
        </span>
      ))}
    </span>
  );
}

export const EstablishmentCard = forwardRef<HTMLElement, EstablishmentCardProps>(
  function EstablishmentCard({ item, selected, onSelect }, ref) {
    const accent = cuisineColor(item.cuisine);

    return (
      <article
        ref={ref}
        role="button"
        tabIndex={0}
        onClick={onSelect}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onSelect();
          }
        }}
        className={cn(
          "group cursor-pointer rounded-xl border p-3 transition duration-200",
          selected
            ? "border-accent-cyan/50 bg-accent-cyan/10 shadow-glow"
            : "border-border-subtle bg-surface-raised/50 hover:border-slate-600 hover:bg-surface-raised"
        )}
        style={
          selected
            ? { boxShadow: `0 0 20px ${accent}33, 0 8px 24px rgba(0,0,0,0.35)` }
            : undefined
        }
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h2 className="truncate font-medium text-white group-hover:text-accent-cyan">{item.name}</h2>
            <p className="mt-0.5 text-xs text-slate-400">
              {cuisineLabel(item.cuisine)} · {item.city}
            </p>
          </div>
          <span
            className="shrink-0 rounded-md px-2 py-0.5 font-display text-sm font-bold text-surface"
            style={{ backgroundColor: accent }}
          >
            {item.reviewCount > 0 ? item.rating.toFixed(1) : "—"}
          </span>
        </div>
        <div className="mt-2 flex items-center justify-between">
          {item.reviewCount > 0 ? (
            <RatingStars rating={item.rating} />
          ) : (
            <span className="text-xs text-slate-500">Нет отзывов</span>
          )}
          <span className="text-[10px] uppercase tracking-wider text-slate-500">
            {item.reviewCount > 0 ? `${item.reviewCount} отз.` : "Открыть"}
          </span>
        </div>
      </article>
    );
  }
);
