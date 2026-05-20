export const ALL_CUISINES = "Все";

const LABELS: Record<string, string> = {
  Italian: "Итальянская",
  Japanese: "Японская",
  Georgian: "Грузинская",
  Burgers: "Бургеры"
};

const COLORS: Record<string, string> = {
  Italian: "#fb923c",
  Japanese: "#38bdf8",
  Georgian: "#c084fc",
  Burgers: "#facc15"
};

export function cuisineLabel(cuisine: string): string {
  return LABELS[cuisine] ?? cuisine;
}

export function cuisineColor(cuisine: string): string {
  return COLORS[cuisine] ?? "#94a3b8";
}
