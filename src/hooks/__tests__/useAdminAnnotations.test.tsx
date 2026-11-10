import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const listAnnotationsPage = vi.fn();
const annotationCounts = vi.fn();
const listQueue = vi.fn();
const assignSessionAnnotator = vi.fn();

vi.mock("@/lib/api/annotations", () => ({
  listAnnotationsPage: (query: unknown) => listAnnotationsPage(query),
  annotationCounts: () => annotationCounts(),
  listQueue: (query: unknown) => listQueue(query),
  assignAnnotator: vi.fn(),
  reviewAnnotation: vi.fn(),
}));
vi.mock("@/lib/api/focusGroups", () => ({
  assignSessionAnnotator: (...args: unknown[]) => assignSessionAnnotator(...args),
}));

const { useAdminAnnotations } = await import("../useAdminAnnotations");

const row = {
  id: "5d1e2f3a-0000-4000-8000-000000000000",
  session_id: "s1",
  task: "asr",
  status: "draft",
  annotator_id: "a1",
  annotator_name: "Ada Obi",
  topic: "Markets",
  duration_seconds: 90,
  segment_count: 4,
  tag_count: 7,
  revision: 1,
  is_gold: false,
  version: 1,
  created_at: "2026-11-09T09:00:00Z",
  updated_at: "2026-11-09T09:00:00Z",
};

describe("useAdminAnnotations", () => {
  beforeEach(() => {
    listAnnotationsPage.mockReset().mockResolvedValue({ items: [row], total: 41, limit: 10, offset: 20 });
    annotationCounts.mockReset().mockResolvedValue({ total: 41, by_status: {}, claimable_sessions: 3, by_annotator: [] });
    listQueue.mockReset().mockResolvedValue([{ session_id: "s9", topic: "Weddings" }]);
    assignSessionAnnotator.mockReset().mockResolvedValue({});
  });

  it("asks for one page, with the filter, search and sort", async () => {
    const { result } = renderHook(() =>
      useAdminAnnotations({
        status: "draft",
        q: "ada",
        sort: { key: "annotator", order: "asc" },
        page: 3,
        pageSize: 10,
      })
    );
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(listAnnotationsPage).toHaveBeenCalledWith({
      limit: 10,
      offset: 20,
      expand: "tags",
      status: "draft",
      q: "ada",
      sort: "annotator",
      order: "asc",
    });
    expect(result.current.total).toBe(41);
    expect(result.current.queue).toHaveLength(1);
    expect(result.current.rows[0]).toMatchObject({ code: "5d1e2f3a", annotator: "Ada Obi", topic: "Markets" });
  });

  it("reads the counts and the queue once, not with every page", async () => {
    const { result, rerender } = renderHook(
      ({ page }) => useAdminAnnotations({ q: "", page, pageSize: 10 }),
      { initialProps: { page: 1 } }
    );
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    rerender({ page: 2 });
    await waitFor(() => expect(listAnnotationsPage).toHaveBeenCalledTimes(2));
    expect(annotationCounts).toHaveBeenCalledTimes(1);
    expect(listQueue).toHaveBeenCalledTimes(1);
  });

  /* Handing out a session changes the queue and the counts. */
  it("reads everything again after a session is handed out", async () => {
    const { result } = renderHook(() => useAdminAnnotations({ q: "", page: 1, pageSize: 10 }));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await act(() => result.current.assignSession("s9", "a1"));
    expect(assignSessionAnnotator).toHaveBeenCalledWith("s9", "a1");
    await waitFor(() => expect(listQueue).toHaveBeenCalledTimes(2));
    expect(annotationCounts).toHaveBeenCalledTimes(2);
  });
});
