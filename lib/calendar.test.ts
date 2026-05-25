import { describe, it, expect } from "vitest";
import { buildMonthGrid } from "./calendar";

describe("buildMonthGrid", () => {
  it("builds a 6-week (42 cell) grid", () => {
    const grid = buildMonthGrid(2026, 4); // May 2026
    expect(grid).toHaveLength(42);
  });

  it("starts on a Sunday", () => {
    const grid = buildMonthGrid(2026, 4);
    expect(grid[0].getDay()).toBe(0);
  });

  it("includes every day of the target month", () => {
    const grid = buildMonthGrid(2026, 4); // May has 31 days
    const mayDays = grid.filter((d) => d.getMonth() === 4);
    expect(mayDays).toHaveLength(31);
  });

  it("first day of the month appears in the first week", () => {
    // May 1 2026 is a Friday -> index 5 in a Sunday-first grid
    const grid = buildMonthGrid(2026, 4);
    const firstOfMonth = grid.findIndex(
      (d) => d.getMonth() === 4 && d.getDate() === 1
    );
    expect(firstOfMonth).toBe(5);
  });
});
