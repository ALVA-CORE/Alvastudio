import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const listSessionsPage = vi.fn();
const sessionCounts = vi.fn();

vi.mock("@/lib/api/focusGroups", () => ({
  listSessionsPage: (query: unknown) => listSessionsPage(query),
  sessionCounts: () => sessionCounts(),
}));

const { useAdminSessions } = await import("../useAdminSessions");

const row = {
  id: "9a8b7c6d-0000-4000-8000-000000000000",
  intern_id: "i1",
  intern_name: "Esther Obi",
  topic: "Markets",
  language_variety: "nigerian_pidgin",
  state: "Lagos",
  duration_seconds: 1800,
  has_audio: true,
  participant_count: 6,
  turn_count: 40,
  created_at: "2026-11-09T09:00:00Z",
};

describe("useAdminSessions", () => {
  beforeEach(() => {
    listSessionsPage.mockReset().mockResolvedValue({ items: [row], total: 12, limit: 10, offset: 0 });
    sessionCounts.mockReset().mockResolvedValue({ sessions: 12, missing_audio: 2 });
  });

  it("asks for one page, with the tab, state, search and sort", async () => {
    const { result } = renderHook(() =>
      useAdminSessions({
        hasAudio: false,
        state: "FCT",
        q: "market",
        sort: { key: "intern", order: "asc" },
        page: 2,
        pageSize: 25,
      })
    );
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(listSessionsPage).toHaveBeenCalledWith({
      limit: 25,
      offset: 25,
      has_audio: false,
      state: "FCT",
      q: "market",
      sort: "intern",
      order: "asc",
    });
    expect(result.current.total).toBe(12);
    expect(result.current.rows[0]).toMatchObject({ code: "9a8b7c6d", intern: "Esther Obi", state: "Lagos" });
  });

  it("reads the counts once, not with every page", async () => {
    const { result, rerender } = renderHook(
      ({ page }) => useAdminSessions({ q: "", page, pageSize: 10 }),
      { initialProps: { page: 1 } }
    );
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    rerender({ page: 2 });
    await waitFor(() => expect(listSessionsPage).toHaveBeenCalledTimes(2));
    expect(sessionCounts).toHaveBeenCalledTimes(1);
  });
});
