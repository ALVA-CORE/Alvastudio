import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api/client";

const submitReview = vi.fn();

vi.mock("@/lib/api/recordings", () => ({
  getRecording: vi.fn(async (id: string) => ({
    id,
    contributor_id: "c1",
    contributor_name: "Esther Obi",
    session_type: "prompt_read",
    prompt_text: "Read this",
    stimulus_text: null,
    status: "in_review",
    created_at: "2026-11-12T09:00:00Z",
    duration_seconds: 4,
    language_variety: "nigerian_english",
    device_mic: null,
    assigned_reviewer_id: "intern-1",
    reviewer_name: null,
  })),
  recordingAudioUrl: vi.fn(async () => "https://api.test/media/1"),
}));
vi.mock("@/lib/api/reviews", () => ({
  submitReview: (...args: unknown[]) => submitReview(...args),
  reviewsForRecording: vi.fn(async () => []),
}));

const { useReviewItem } = await import("../useReviewItem");

const answers = {
  noiseFree: "yes",
  audible: "yes",
  matchesPrompt: "yes",
  natural: "yes",
  verdict: "approve",
} as const;

async function submitted() {
  const { result } = renderHook(() => useReviewItem("clip-1"));
  await waitFor(() => expect(result.current.isLoading).toBe(false));
  let outcome: Awaited<ReturnType<typeof result.current.submit>> | undefined;
  await act(async () => {
    outcome = await result.current.submit(answers, "approve");
  });
  return outcome;
}

/* The verdict answer names the clip to open next (12 Nov). */
describe("useReviewItem submit", () => {
  beforeEach(() => {
    submitReview.mockReset();
  });

  it("hands back the next clip's id", async () => {
    submitReview.mockResolvedValue({ next_recording: { id: "clip-2" } });
    expect(await submitted()).toEqual({ ok: true, nextId: "clip-2" });
  });

  it("hands back null when nothing is left", async () => {
    submitReview.mockResolvedValue({ next_recording: null });
    expect(await submitted()).toEqual({ ok: true, nextId: null });
  });

  it("hands back the reason when the verdict is refused", async () => {
    submitReview.mockRejectedValue(new ApiError(403, "This recording is assigned to Amaka Nwosu"));
    expect(await submitted()).toEqual({
      ok: false,
      refusal: "This recording is assigned to Amaka Nwosu",
    });
  });
});
