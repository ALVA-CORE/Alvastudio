import { describe, expect, it } from "vitest";
import { fetchAllPages } from "../fetchAll";

const rows = Array.from({ length: 1050 }, (_, index) => ({ id: `r${index}` }));

describe("fetchAllPages", () => {
  /* Side by side, but in the server's order, and every row once. */
  it("reads every page, in order, past the old 5,000 when asked", async () => {
    const many = Array.from({ length: 6200 }, (_, index) => ({ id: `m${index}` }));
    let inFlight = 0;
    let most = 0;
    const result = await fetchAllPages(
      async ({ limit, offset }) => {
        inFlight += 1;
        most = Math.max(most, inFlight);
        await new Promise((resolve) => setTimeout(resolve, Math.random() * 5));
        inFlight -= 1;
        return { items: many.slice(offset, offset + limit), total: many.length, limit, offset };
      },
      { cap: 50_000 }
    );
    expect(result.items.map((row) => row.id)).toEqual(many.map((row) => row.id));
    expect(result.complete).toBe(true);
    expect(most).toBeGreaterThan(1);
    expect(most).toBeLessThanOrEqual(6);
  });

  it("keeps a row that shifted between pages once", async () => {
    const result = await fetchAllPages(async ({ limit, offset }) => ({
      /* Every later page repeats the last row of the one before. */
      items: rows.slice(Math.max(0, offset - (offset ? 1 : 0)), offset + limit),
      total: rows.length,
      limit,
      offset,
    }));
    expect(new Set(result.items.map((row) => row.id)).size).toBe(result.items.length);
  });

  it("stops at an empty page whatever the total says", async () => {
    const result = await fetchAllPages(async ({ limit, offset }) => ({
      items: offset >= 400 ? [] : rows.slice(offset, offset + limit),
      total: 10_000,
      limit,
      offset,
    }));
    expect(result.items).toHaveLength(400);
    expect(result.complete).toBe(false);
  });
});
