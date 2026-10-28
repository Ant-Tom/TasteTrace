export const ALL_CUISINES = "Все";

const COLORS: Record<string, string> = {
  Кафе: "#38bdf8",
  "Кафе, бар": "#c084fc",
  Бар: "#c084fc",
  Ресторан: "#fb923c",
  Столовая: "#4ade80",
  Киоск: "#facc15",
  "Торговый павильон": "#facc15"
};

export function cuisineColor(cuisine: string): string {
  return COLORS[cuisine] ?? "#94a3b8";
}
