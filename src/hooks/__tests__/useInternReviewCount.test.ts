import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const listReviews = vi.fn();
vi.mock("@/lib/api/reviews", () => ({ listReviews: (query: unknown) => listReviews(query) }));

const { useInternReviewCount } = await import("../useInternReviewCount");

const DAY = 24 * 60 * 60 * 1000;
/* 1,000 verdicts, one a day, newest first, as the route lists them. */
const verdicts = Array.from({ length: 1000 }, (_, index) => ({
  id: `v${index}`,
  created_at: new Date(Date.now() - (index + 0.5) * DAY).toISOString(),
}));

describe("useInternReviewCount", () => {
  beforeEach(() => {
    listReviews.mockReset().mockImplementation(async ({ limit, offset }: { limit: number; offset: number }) => ({
      items: verdicts.slice(offset, offset + limit),
      total: verdicts.length,
      limit,
      offset,
    }));
  });

  /* The bug: every verdict ever given, about 35 requests, on every visit. */
  it("stops at the first page that reaches past the window", async () => {
    const { result } = renderHook(() => useInternReviewCount("intern-1", 30));
    await waitFor(() => expect(result.current).toBe(30));
    expect(listReviews).toHaveBeenCalledTimes(1);
  });

  it("reads on only as far as a long window needs", async () => {
    const { result } = renderHook(() => useInternReviewCount("intern-1", 365));
    await waitFor(() => expect(result.current).toBe(365));
    expect(listReviews).toHaveBeenCalledTimes(2);
  });
});
