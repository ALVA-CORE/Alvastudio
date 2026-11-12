import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const reviewDesk = vi.fn();
const listRecordingsPage = vi.fn();

vi.mock("@/lib/auth/context", () => ({ useAuth: () => ({ user: { id: "intern-1", role: "intern" } }) }));
vi.mock("@/lib/api/reviews", () => ({
  reviewDesk: (...args: unknown[]) => reviewDesk(...args),
}));
vi.mock("@/lib/api/recordings", () => ({
  listRecordingsPage: (...args: unknown[]) => listRecordingsPage(...args),
}));

const { useReviewHistory, useReviewQueue } = await import("../useReviewQueue");

const clip = (id: string, status = "in_review") => ({
  id,
  contributor_id: "c1",
  contributor_name: "Esther Obi",
  session_type: "prompt_read",
  prompt_text: "Read this",
  stimulus_text: null,
  status,
  created_at: "2026-11-09T09:00:00Z",
  duration_seconds: 4,
  measured_duration_seconds: 4,
  language_variety: "nigerian_english",
  device_mic: null,
  assigned_reviewer_id: "intern-1",
  reviewer_name: null,
});

describe("useReviewQueue", () => {
  beforeEach(() => {
    reviewDesk.mockReset().mockResolvedValue([clip("a"), clip("b")]);
  });

  it("reads the desk", async () => {
    const { result } = renderHook(() => useReviewQueue());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(reviewDesk).toHaveBeenCalledTimes(1);
    expect(result.current.items.map((row) => row.id)).toEqual(["a", "b"]);
    expect(result.current.items[0].contributor).toBe("Esther Obi");
    expect(result.current.error).toBeNull();
  });
});

describe("useReviewHistory", () => {
  beforeEach(() => {
    listRecordingsPage.mockReset().mockResolvedValue({ items: [clip("h", "approved")], total: 120, limit: 8, offset: 8 });
  });

  it("asks for nothing until the history is opened", () => {
    renderHook(() => useReviewHistory({ q: "", page: 1, pageSize: 8, enabled: false }));
    expect(listRecordingsPage).not.toHaveBeenCalled();
  });

  /* `judged_by` themselves is exactly their history, decided on the server. */
  it("asks for one page of what they judged", async () => {
    const { result } = renderHook(() =>
      useReviewHistory({
        q: "obi",
        sort: { key: "created_at", order: "asc" },
        page: 2,
        pageSize: 8,
        enabled: true,
      })
    );
    await waitFor(() => expect(result.current.total).toBe(120));

    expect(listRecordingsPage.mock.calls[0][0]).toEqual({
      judged_by: "intern-1",
      limit: 8,
      offset: 8,
      q: "obi",
      sort: "created_at",
      order: "asc",
    });
    expect(result.current.items[0].id).toBe("h");
  });

  it("aborts a page that is replaced", async () => {
    const { rerender } = renderHook(
      ({ page }) => useReviewHistory({ q: "", page, pageSize: 8, enabled: true }),
      { initialProps: { page: 1 } }
    );
    const first = listRecordingsPage.mock.calls[0][1] as AbortSignal;
    rerender({ page: 2 });
    expect(first.aborted).toBe(true);
    await waitFor(() => expect(listRecordingsPage).toHaveBeenCalledTimes(2));
  });
});
