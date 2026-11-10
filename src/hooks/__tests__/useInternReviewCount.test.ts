import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const listReviews = vi.fn();
vi.mock("@/lib/api/reviews", () => ({ listReviews: (query: unknown) => listReviews(query) }));

const { useInternReviewCount } = await import("../useInternReviewCount");

const DAY = 24 * 60 * 60 * 1000;

describe("useInternReviewCount", () => {
  beforeEach(() => {
    listReviews.mockReset().mockResolvedValue({ items: [], total: 30, limit: 1, offset: 0 });
  });

  /* The bug: every verdict ever given, about 35 requests, on every visit. */
  it("asks once, for the count inside the window", async () => {
    const before = Date.now();
    const { result } = renderHook(() => useInternReviewCount("intern-1", 30));
    await waitFor(() => expect(result.current).toBe(30));

    expect(listReviews).toHaveBeenCalledTimes(1);
    const query = listReviews.mock.calls[0][0];
    expect(query).toMatchObject({ reviewer_id: "intern-1", limit: 1 });
    expect(Math.abs(new Date(query.created_after).getTime() - (before - 30 * DAY))).toBeLessThan(5000);
  });

  it("shows nothing rather than a false zero when it fails", async () => {
    listReviews.mockRejectedValue(new Error("down"));
    const { result } = renderHook(() => useInternReviewCount("intern-1", 7));
    await waitFor(() => expect(listReviews).toHaveBeenCalled());
    expect(result.current).toBeNull();
  });
});
