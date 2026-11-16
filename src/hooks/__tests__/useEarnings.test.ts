import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const apiFetch = vi.fn();
vi.mock("@/lib/api/client", () => ({
  apiFetch: (...args: unknown[]) => apiFetch(...args),
}));

const { useEarnings } = await import("../useEarnings");

const apiRow = (id: string) => ({
  contributor_id: id,
  full_name: `Person ${id}`,
  role: "contributor",
  recordings: 1,
  minutes: 1,
  currency: "NGN",
  held_kobo: 0,
  payable_kobo: 0,
  in_flight_kobo: 500,
  paid_kobo: 0,
  earned_kobo: 500,
  payout_status: "pending",
  last_activity_at: null,
});

/* The route serves 200 rows a request; the page showed only the first 200. */
describe("useEarnings", () => {
  it("reads every page, and takes the status from the buckets", async () => {
    apiFetch.mockImplementation(async (_path: string, { query }: { query: { offset: number } }) => {
      const ids = query.offset === 0 ? Array.from({ length: 200 }, (_, i) => `a${i}`) : ["b0", "b1"];
      return { items: ids.map(apiRow), total: 202, limit: 200, offset: query.offset };
    });

    const { result } = renderHook(() => useEarnings());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.rows).toHaveLength(202);
    expect(apiFetch.mock.calls.map(([, init]) => init.query.offset)).toEqual([0, 200]);
    /* The API said "pending"; the buckets say it is on its way. */
    expect(result.current.rows[0].status).toBe("in_flight");
  });
});
