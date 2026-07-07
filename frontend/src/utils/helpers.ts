export const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const formatDate = (iso?: string | null) => {
  if (!iso) return "Sin fecha";
  return new Intl.DateTimeFormat("es-PE", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(iso));
};

export const progressPercent = (done: number, total: number) => {
  if (total === 0) return 0;
  return Math.round((done / total) * 100);
};
