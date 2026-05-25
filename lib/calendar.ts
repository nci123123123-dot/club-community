/**
 * Build a Sunday-first 6x7 month grid (42 cells) covering the target month.
 * Leading/trailing cells belong to the adjacent months.
 *
 * @param year full year, e.g. 2026
 * @param month zero-based month index (0 = January)
 */
export function buildMonthGrid(year: number, month: number): Date[] {
  const firstOfMonth = new Date(year, month, 1);
  const start = new Date(firstOfMonth);
  start.setDate(1 - firstOfMonth.getDay());

  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

export function weekdayLabels(): string[] {
  return WEEKDAY_LABELS;
}
