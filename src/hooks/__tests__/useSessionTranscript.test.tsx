import { describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";

const getSession = vi.fn();

vi.mock("@/lib/api/annotations", () => ({
  getAnnotation: vi.fn(async () => ({
    id: "a1",
    kind: "narration",
    session_id: null,
    recording_id: "r1",
    status: "draft",
    version: 1,
    difficulty_flags: [],
    speech_present: true,
    tokens: [],
    segments: [],
  })),
  getAnnotationSource: vi.fn(async () => ({
    kind: "narration",
    session_id: null,
    recording_id: "r1",
    topic: "Your first day at school",
    language_variety: "nigerian_pidgin",
    duration_seconds: 84,
    waveform_peaks: null,
    participants: [],
  })),
  annotationAudioUrl: vi.fn(async () => "https://audio.example/a1"),
  listMine: vi.fn(async () => [{ id: "a1", session_id: "s1", kind: "session", status: "draft" }]),
  listQueue: vi.fn(),
}));
vi.mock("@/lib/api/focusGroups", () => ({ getSession: (id: string) => getSession(id) }));

const { useSessionTranscript } = await import("../useSessionTranscript");

describe("useSessionTranscript on a narration", () => {
  /* A narration has no session: opened by its annotation, never by
     `/focus-groups/{session_id}`. */
  it("opens by annotation id, with the stimulus as its topic", async () => {
    const { result } = renderHook(() => useSessionTranscript(undefined, "a1"));
    await waitFor(() => expect(result.current.resource.status).toBe("ready"));

    const { resource } = result.current;
    if (resource.status !== "ready") return;
    expect(resource.session).toMatchObject({
      kind: "narration",
      topic: "Your first day at school",
      durationSec: 84,
      status: "in-progress",
    });
    expect(resource.doc.speakers).toHaveLength(1);
    expect(getSession).not.toHaveBeenCalled();
  });
});

/* An annotator may not read `/focus-groups/{id}` (interns' and admins'):
   asking for it was the "Requires role: intern, admin" screen. */
describe("useSessionTranscript on a session", () => {
  it("opens from the annotation's own routes", async () => {
    const { result } = renderHook(() => useSessionTranscript("s1"));
    await waitFor(() => expect(result.current.resource.status).toBe("ready"));
    expect(getSession).not.toHaveBeenCalled();
  });
});
