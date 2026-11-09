import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const listRecordingsPage = vi.fn();
const recordingsSummary = vi.fn();

vi.mock("@/lib/api/recordings", () => ({
  listRecordingsPage: (query: unknown) => listRecordingsPage(query),
  recordingsSummary: () => recordingsSummary(),
  assignReviewer: vi.fn(),
}));

const { useAdminReviews } = await import("../useAdminReviews");

const verdict = (verdict: string, reason: string | null, notes: string) => ({
  id: `v-${verdict}`,
  reviewer_id: "r1",
  reviewer_name: "Ada Obi",
  verdict,
  q_noise_free: reason === "background_noise" ? "no" : "yes",
  q_clear_audible: "yes",
  q_matches_prompt: "yes",
  q_natural_intelligible: "yes",
  notes,
  rejection_reason: reason,
  created_at: "2026-11-06T10:00:00Z",
});

const clip = {
  id: "8f2c1a9e-0000-4000-8000-000000000000",
  contributor_id: "c1",
  contributor_name: "Esther Obi",
  session_type: "prompt_read",
  prompt_text: "Read this",
  stimulus_text: null,
  status: "rejected",
  created_at: "2026-11-06T09:00:00Z",
  reviewed_at: "2026-11-06T10:00:00Z",
  reviewer_name: "Ada Obi",
  assigned_reviewer_id: "r1",
  duration_seconds: 4,
  measured_duration_seconds: 4,
  language_variety: "nigerian_english",
  /* Flagged, then rejected: newest first, so the rejection is the status. */
  verdicts: [verdict("reject", "background_noise", "Generator"), verdict("flag", null, "Unsure")],
};

describe("useAdminReviews", () => {
  beforeEach(() => {
    listRecordingsPage.mockReset().mockResolvedValue({ items: [clip], total: 41, limit: 10, offset: 20 });
    recordingsSummary.mockReset().mockResolvedValue({ total: 6000 });
  });

  it("asks for one page, with the filters, search and sort", async () => {
    const { result } = renderHook(() =>
      useAdminReviews({
        status: "rejected",
        q: "esther",
        sort: { key: "contributor", order: "asc" },
        page: 3,
        pageSize: 10,
      })
    );
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(listRecordingsPage).toHaveBeenCalledWith({
      limit: 10,
      offset: 20,
      expand: "verdicts",
      status: "rejected",
      q: "esther",
      sort: "contributor",
      order: "asc",
    });
    expect(result.current.total).toBe(41);
    expect(result.current.summary).toEqual({ total: 6000 });
  });

  /* The bug: the oldest verdict was kept, so a flag hid the rejection. */
  it("reads the newest verdict, and names the clip by its id", async () => {
    const { result } = renderHook(() => useAdminReviews({ q: "", page: 1, pageSize: 10 }));
    await waitFor(() => expect(result.current.rows).toHaveLength(1));

    const row = result.current.rows[0];
    expect(row.code).toBe("8f2c1a9e");
    expect(row.rejectionReason).toBe("Background noise");
    expect(row.reviewNotes).toBe("Generator");
    expect(row.rubric?.[0]).toMatchObject({ id: "noiseFree", answer: "no" });
  });

  it("reads the counts once, not with every page", async () => {
    const { result, rerender } = renderHook(
      ({ page }) => useAdminReviews({ q: "", page, pageSize: 10 }),
      { initialProps: { page: 1 } }
    );
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    rerender({ page: 2 });
    await waitFor(() => expect(listRecordingsPage).toHaveBeenCalledTimes(2));
    expect(recordingsSummary).toHaveBeenCalledTimes(1);
  });

  /* From an intern's panel: only what they judged, and whose clip it is. */
  it("narrows to one reviewer, and carries the people's ids", async () => {
    const { result } = renderHook(() =>
      useAdminReviews({ q: "", judgedBy: "r1", page: 1, pageSize: 10 })
    );
    await waitFor(() => expect(result.current.rows).toHaveLength(1));
    expect(listRecordingsPage.mock.calls[0][0]).toMatchObject({ judged_by: "r1" });
    expect(result.current.rows[0]).toMatchObject({ contributorId: "c1", reviewerId: "r1" });
  });
});

