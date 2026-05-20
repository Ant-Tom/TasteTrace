export const ALL_CUISINES = "Все";

const COLORS: Record<string, string> = {
  Кафе: "#38bdf8",
  Фастфуд: "#facc15",
  Ресторан: "#fb923c",
  Бар: "#c084fc",
  Паб: "#a78bfa",
  Фудкорт: "#4ade80",
  Italian: "#fb923c",
  Japanese: "#38bdf8",
  Georgian: "#c084fc",
  Burgers: "#facc15"
};

export function cuisineLabel(cuisine: string): string {
  return cuisine;
}

export function cuisineColor(cuisine: string): string {
  return COLORS[cuisine] ?? "#94a3b8";
}
