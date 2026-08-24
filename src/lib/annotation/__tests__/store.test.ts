import { beforeEach, describe, expect, it } from "vitest";

import {
  __resetSegmentIdCounter,
  findActiveSegmentIndex,
  findActiveSegmentIndexForSpeaker,
} from "../segments";
import {
  DEFAULT_ZOOM,
  MAX_ZOOM,
  MIN_ZOOM,
  PLAYBACK_RATES,
  createAnnotationStore,
  isSegmentDimmed,
  selectCanRedo,
  selectCanUndo,
  selectSegmentById,
  selectSegments,
  selectDoc,
  selectSpeakerById,
  selectSpeakers,
  type AnnotationStore,
} from "../store";
import {
  MIN_SEGMENT_DURATION,
  MIN_SEGMENT_GAP,
  emptyAnnotationState,
  speakerColorAt,
  type Segment,
  type TranscriptDoc,
} from "../types";

/**
 * The store is `zustand/vanilla`, so every test here drives it directly — no
 * renderer, no act(), no context. That is the whole reason the store was built
 * this way, and it keeps these assertions about state transitions rather than
 * about React.
 */

const ORIGINAL_TEXT = {
  c1: "Good afternoon everybody.",
  c2: "For me, e be like say the thing dey work.",
  c3: "Can you say more about that?",
} as const;

function makeDoc(): TranscriptDoc {
  return {
    sessionId: "sess-lag-01",
    speakers: [
      { id: "spk-0", label: "Speaker A", role: "moderator", color: speakerColorAt(0) },
      { id: "spk-1", label: "Speaker B", role: "participant", color: speakerColorAt(1) },
    ],
    segments: [
      { id: "c1", start: 0, end: 2, speakerId: "spk-0", text: ORIGINAL_TEXT.c1 },
      { id: "c2", start: 3, end: 6, speakerId: "spk-1", text: ORIGINAL_TEXT.c2 },
      { id: "c3", start: 8, end: 11, speakerId: "spk-0", text: ORIGINAL_TEXT.c3 },
    ],
    ...emptyAnnotationState(),
  };
}

function makeStore(doc: TranscriptDoc = makeDoc(), duration = 60): AnnotationStore {
  return createAnnotationStore(doc, { duration });
}

/** Terse accessors — these appear in nearly every assertion. */
const act = (store: AnnotationStore) => store.getState();
const segments = (store: AnnotationStore): Segment[] => selectSegments(store.getState());
const segment = (store: AnnotationStore, id: string) => selectSegmentById(id)(store.getState());
const textOf = (store: AnnotationStore, id: string) => segment(store, id)?.text;

beforeEach(() => {
  __resetSegmentIdCounter();
});

/* ------------------------------------------------------------------ *
 * Initial state
 * ------------------------------------------------------------------ */

describe("createAnnotationStore", () => {
  it("seeds the document and the transient defaults", () => {
    const store = makeStore();
    const state = store.getState();

    expect(selectDoc(state).sessionId).toBe("sess-lag-01");
    expect(segments(store)).toHaveLength(3);
    expect(selectSpeakers(state)).toHaveLength(2);
    expect(state.revision).toBe(0);
    expect(state.currentTime).toBe(0);
    expect(state.duration).toBe(60);
    expect(state.isPlaying).toBe(false);
    expect(state.playbackRate).toBe(1);
    expect(state.zoom).toBe(DEFAULT_ZOOM);
    expect(state.followPlayhead).toBe(true);
    expect(state.selectedSegmentId).toBeNull();
    expect(state.activeSpeakerId).toBeNull();
    expect(state.saveStatus).toBe("idle");
    expect(state.lastSavedAt).toBeNull();
    expect(state.saveError).toBeNull();
    expect(selectCanUndo(state)).toBe(false);
    expect(selectCanRedo(state)).toBe(false);
  });

  it("defaults duration to 0 when the audio length is not yet known", () => {
    expect(createAnnotationStore(makeDoc()).getState().duration).toBe(0);
  });

  it("gives each store its own state", () => {
    const a = makeStore();
    const b = makeStore();

    act(a).setSegmentText("c1", "changed in a");

    expect(textOf(b, "c1")).toBe(ORIGINAL_TEXT.c1);
    expect(b.getState().revision).toBe(0);
  });
});

/* ------------------------------------------------------------------ *
 * Text editing + coalescing
 * ------------------------------------------------------------------ */

describe("setSegmentText", () => {
  it("updates the segment and bumps revision", () => {
    const store = makeStore();

    act(store).setSegmentText("c1", "Good afternoon everyone.");

    expect(textOf(store, "c1")).toBe("Good afternoon everyone.");
    expect(store.getState().revision).toBe(1);
    expect(selectCanUndo(store.getState())).toBe(true);
  });

  it("leaves every other segment untouched by reference", () => {
    const store = makeStore();
    const before = segment(store, "c2");

    act(store).setSegmentText("c1", "edited");

    // Structural sharing is what makes memo'd segment rows worth having.
    expect(segment(store, "c2")).toBe(before);
  });

  it("collapses a burst of typing into ONE undo step", () => {
    const store = makeStore();

    act(store).setSegmentText("c1", "G");
    act(store).setSegmentText("c1", "Go");
    act(store).setSegmentText("c1", "Goo");
    act(store).setSegmentText("c1", "Good");

    expect(textOf(store, "c1")).toBe("Good");
    // Every keystroke still bumps revision — autosave must see them all.
    expect(store.getState().revision).toBe(4);

    act(store).undo();

    expect(textOf(store, "c1")).toBe(ORIGINAL_TEXT.c1);
    expect(selectCanUndo(store.getState())).toBe(false);
  });

  it("starts a new undo step when typing moves to a different segment", () => {
    const store = makeStore();

    act(store).setSegmentText("c1", "first edit");
    act(store).setSegmentText("c2", "second edit");

    act(store).undo();
    expect(textOf(store, "c2")).toBe(ORIGINAL_TEXT.c2);
    expect(textOf(store, "c1")).toBe("first edit");

    act(store).undo();
    expect(textOf(store, "c1")).toBe(ORIGINAL_TEXT.c1);
  });

  it("re-opens a step when typing returns to the first segment", () => {
    const store = makeStore();

    act(store).setSegmentText("c1", "a");
    act(store).setSegmentText("c2", "b");
    act(store).setSegmentText("c1", "c");

    // Three distinct steps: c1, c2, c1 again — the key changed each time.
    act(store).undo();
    expect(textOf(store, "c1")).toBe("a");
    act(store).undo();
    expect(textOf(store, "c2")).toBe(ORIGINAL_TEXT.c2);
    act(store).undo();
    expect(textOf(store, "c1")).toBe(ORIGINAL_TEXT.c1);
  });
});

describe("endInteraction", () => {
  it("closes the coalescing group so the next edit is its own step", () => {
    const store = makeStore();

    act(store).setSegmentText("c1", "first");
    act(store).endInteraction();
    act(store).setSegmentText("c1", "second");

    act(store).undo();
    expect(textOf(store, "c1")).toBe("first");

    act(store).undo();
    expect(textOf(store, "c1")).toBe(ORIGINAL_TEXT.c1);
    expect(selectCanUndo(store.getState())).toBe(false);
  });

  it("is a no-op when no group is open", () => {
    const store = makeStore();
    const before = store.getState().history;

    act(store).endInteraction();

    // Same object — an idle pointer-up must not churn subscribers.
    expect(store.getState().history).toBe(before);
    expect(store.getState().revision).toBe(0);
  });
});

/* ------------------------------------------------------------------ *
 * The core invariant
 * ------------------------------------------------------------------ */

describe("undo / redo isolation", () => {
  it("NEVER touches playback, zoom or selection", () => {
    const store = makeStore();

    act(store).setCurrentTime(12.5);
    act(store).setZoom(120);
    act(store).setPlaybackRate(1.5);
    act(store).setPlaying(true);
    act(store).setFollowPlayhead(false);
    act(store).selectSegment("c2");
    act(store).setActiveSpeaker("spk-1");

    act(store).setSegmentText("c1", "edited");
    act(store).endInteraction();

    const transientBefore = {
      currentTime: store.getState().currentTime,
      zoom: store.getState().zoom,
      playbackRate: store.getState().playbackRate,
      isPlaying: store.getState().isPlaying,
      followPlayhead: store.getState().followPlayhead,
      selectedSegmentId: store.getState().selectedSegmentId,
      activeSpeakerId: store.getState().activeSpeakerId,
    };

    act(store).undo();

    expect(textOf(store, "c1")).toBe(ORIGINAL_TEXT.c1);
    expect(store.getState()).toMatchObject(transientBefore);

    act(store).redo();

    expect(textOf(store, "c1")).toBe("edited");
    expect(store.getState()).toMatchObject(transientBefore);
  });

  it("bumps revision so autosave fires for undo and redo", () => {
    const store = makeStore();

    act(store).setSegmentText("c1", "edited");
    expect(store.getState().revision).toBe(1);

    act(store).undo();
    expect(store.getState().revision).toBe(2);

    act(store).redo();
    expect(store.getState().revision).toBe(3);
  });

  it("does not bump revision when there is nothing to undo or redo", () => {
    const store = makeStore();

    act(store).undo();
    act(store).redo();

    expect(store.getState().revision).toBe(0);
    expect(segments(store)).toEqual(makeDoc().segments);
  });

  it("drops the redo stack once a new edit lands", () => {
    const store = makeStore();

    act(store).setSegmentText("c1", "one");
    act(store).endInteraction();
    act(store).undo();
    expect(selectCanRedo(store.getState())).toBe(true);

    act(store).setSegmentText("c2", "two");

    expect(selectCanRedo(store.getState())).toBe(false);
  });
});

/* ------------------------------------------------------------------ *
 * Timing
 * ------------------------------------------------------------------ */

describe("retime", () => {
  it("respects the gap against a neighbour on the SAME row", () => {
    const store = makeStore();

    // c1 and c3 are both spk-0; c1 ends at 2.
    act(store).retime("c3", { start: 1, end: 11 });

    expect(segment(store, "c3")!.start).toBeCloseTo(2 + MIN_SEGMENT_GAP, 10);
    expect(store.getState().revision).toBe(1);
  });

  it("ignores segments on OTHER rows — two speakers may overlap", () => {
    const store = makeStore();

    // c2 is spk-1; c1 (spk-0, 0–2) must not constrain it.
    act(store).retime("c2", { start: 1, end: 6 });

    expect(segment(store, "c2")!.start).toBe(1);
    expect(segment(store, "c1")!.end).toBe(2);
  });

  it("clamps against the store's duration", () => {
    const store = makeStore(makeDoc(), 12);

    act(store).retime("c3", { start: 8, end: 99 });

    expect(segment(store, "c3")!.end).toBe(12);
  });

  it("collapses a live drag into ONE undo step", () => {
    const store = makeStore();

    // A pointer drag emits continuously; 10 frames stand in for the real ~60.
    for (let frame = 1; frame <= 10; frame += 1) {
      act(store).retime("c2", { start: 3 + frame * 0.05, end: 6 }, { live: true });
    }

    expect(segment(store, "c2")!.start).toBeCloseTo(3.5, 10);
    expect(store.getState().revision).toBe(10);

    act(store).undo();

    expect(segment(store, "c2")!.start).toBe(3);
    expect(selectCanUndo(store.getState())).toBe(false);
  });

  it("keeps a live drag on one segment separate from a live drag on another", () => {
    const store = makeStore();

    act(store).retime("c1", { start: 0.5, end: 2 }, { live: true });
    act(store).retime("c3", { start: 8.5, end: 11 }, { live: true });

    act(store).undo();
    expect(segment(store, "c3")!.start).toBe(8);
    expect(segment(store, "c1")!.start).toBe(0.5);

    act(store).undo();
    expect(segment(store, "c1")!.start).toBe(0);
  });

  it("records a discrete step per call when not live", () => {
    const store = makeStore();

    act(store).retime("c2", { start: 3.2, end: 6 });
    act(store).retime("c2", { start: 3.4, end: 6 });

    act(store).undo();
    expect(segment(store, "c2")!.start).toBeCloseTo(3.2, 10);

    act(store).undo();
    expect(segment(store, "c2")!.start).toBe(3);
  });

  it("is closed by endInteraction, so the next drag is a new step", () => {
    const store = makeStore();

    act(store).retime("c2", { start: 3.2, end: 6 }, { live: true });
    act(store).endInteraction();
    act(store).retime("c2", { start: 3.4, end: 6 }, { live: true });

    act(store).undo();
    expect(segment(store, "c2")!.start).toBeCloseTo(3.2, 10);
  });
});

/* ------------------------------------------------------------------ *
 * Structural edits
 * ------------------------------------------------------------------ */

describe("splitSegment", () => {
  it("replaces one segment with two in place", () => {
    const store = makeStore();

    act(store).splitSegment("c2", 4.5);

    const after = segments(store);
    expect(after).toHaveLength(4);
    expect(after.map((c) => c.id)).toEqual(["c1", "c2", "segment-1", "c3"]);
    expect(after[1]).toMatchObject({ start: 3, end: 4.5, speakerId: "spk-1" });
    expect(after[2]).toMatchObject({ start: 4.5, end: 6, speakerId: "spk-1" });
    expect(store.getState().revision).toBe(1);
  });

  it("is undoable as a single step", () => {
    const store = makeStore();

    act(store).splitSegment("c2", 4.5);
    act(store).undo();

    expect(segments(store)).toEqual(makeDoc().segments);
  });

  it("does nothing when the split is rejected or the id is unknown", () => {
    const store = makeStore();

    act(store).splitSegment("c2", 3.1); // first half under MIN_SEGMENT_DURATION
    act(store).splitSegment("c2", 99); // outside the segment
    act(store).splitSegment("nope", 4.5); // unknown id

    expect(segments(store)).toHaveLength(3);
    expect(store.getState().revision).toBe(0);
    expect(selectCanUndo(store.getState())).toBe(false);
  });
});

describe("mergeWithNext", () => {
  it("folds the following SAME-ROW segment into this one, skipping other rows", () => {
    const store = makeStore();

    act(store).mergeWithNext("c1");

    // c2 belongs to spk-1 and is passed over: merging across voices would
    // silently attribute one person's words to another.
    const after = segments(store);
    expect(after).toHaveLength(2);
    expect(after.find((c) => c.id === "c1")).toMatchObject({
      id: "c1",
      start: 0,
      end: 11,
      speakerId: "spk-0",
      text: `${ORIGINAL_TEXT.c1} ${ORIGINAL_TEXT.c3}`,
    });
  });

  it("refuses on the last segment and on an unknown id", () => {
    const store = makeStore();

    act(store).mergeWithNext("c3");
    act(store).mergeWithNext("nope");

    expect(segments(store)).toHaveLength(3);
    expect(store.getState().revision).toBe(0);
  });

  it("is undoable as a single step", () => {
    const store = makeStore();

    act(store).mergeWithNext("c1");
    act(store).undo();

    expect(segments(store)).toEqual(makeDoc().segments);
  });
});

describe("deleteSegment", () => {
  it("removes the segment", () => {
    const store = makeStore();

    act(store).deleteSegment("c2");

    expect(segments(store).map((c) => c.id)).toEqual(["c1", "c3"]);
    expect(store.getState().revision).toBe(1);
  });

  it("clears the selection when the deleted segment was selected", () => {
    const store = makeStore();

    act(store).selectSegment("c2");
    act(store).deleteSegment("c2");

    expect(store.getState().selectedSegmentId).toBeNull();
  });

  it("leaves an unrelated selection alone", () => {
    const store = makeStore();

    act(store).selectSegment("c1");
    act(store).deleteSegment("c2");

    expect(store.getState().selectedSegmentId).toBe("c1");
  });

  it("is undoable, though the selection does not come back", () => {
    const store = makeStore();

    act(store).selectSegment("c2");
    act(store).deleteSegment("c2");
    act(store).undo();

    expect(segments(store)).toEqual(makeDoc().segments);
    // Selection is transient state and deliberately outside history — the
    // caller re-selects if it wants to.
    expect(store.getState().selectedSegmentId).toBeNull();
  });
});

describe("insertSegmentAt", () => {
  it("fits a new segment into the gap under the playhead", () => {
    const store = makeStore();

    act(store).insertSegmentAt(2);

    // Only spk-0's own row constrains the insert: c1 ends at 2 and c3 starts at
    // 8, so there is room for the full two seconds even though spk-1 is talking.
    const inserted = segment(store, "segment-1")!;
    expect(inserted).toMatchObject({ start: 2, end: 4, text: "", speakerId: "spk-0" });
    expect(segments(store).map((c) => c.id)).toEqual(["c1", "segment-1", "c2", "c3"]);
  });

  it("caps at two seconds when the gap is wide", () => {
    const store = makeStore();

    act(store).insertSegmentAt(20);

    expect(segment(store, "segment-1")).toMatchObject({ start: 20, end: 22 });
  });

  it("clamps to the timeline end when there is no following segment", () => {
    const store = makeStore(makeDoc(), 21);

    act(store).insertSegmentAt(20);

    expect(segment(store, "segment-1")).toMatchObject({ start: 20, end: 21 });
  });

  it("uses the given speaker, falling back to the first speaker", () => {
    const store = makeStore();

    act(store).insertSegmentAt(2, "spk-1");

    expect(segment(store, "segment-1")!.speakerId).toBe("spk-1");
  });

  it("refuses when the gap is narrower than MIN_SEGMENT_DURATION", () => {
    const tight: TranscriptDoc = {
      ...makeDoc(),
      segments: [
        // Both on the SAME row — a cross-row pair would not constrain at all.
        { id: "a", start: 0, end: 2, speakerId: "spk-0", text: "one" },
        { id: "b", start: 2.5, end: 5, speakerId: "spk-0", text: "two" },
      ],
      ...emptyAnnotationState(),
    };
    const store = makeStore(tight);

    act(store).insertSegmentAt(2.1);

    expect(segments(store)).toHaveLength(2);
    expect(store.getState().revision).toBe(0);
    expect(selectCanUndo(store.getState())).toBe(false);
  });

  it("keeps the document sorted", () => {
    const store = makeStore();

    act(store).insertSegmentAt(6.5);

    const starts = segments(store).map((c) => c.start);
    expect(starts).toEqual([...starts].sort((a, b) => a - b));
  });

  it("inserts into an empty document using the timeline length", () => {
    const store = makeStore({ ...makeDoc(), segments: [] }, 60);

    act(store).insertSegmentAt(4);

    expect(segments(store)).toHaveLength(1);
    expect(segment(store, "segment-1")).toMatchObject({ start: 4, end: 6, speakerId: "spk-0" });
  });

  it("falls back to a synthetic speaker id when the document has no speakers", () => {
    const store = makeStore({ ...makeDoc(), segments: [], speakers: [] }, 60);

    act(store).insertSegmentAt(4);

    expect(segment(store, "segment-1")!.speakerId).toBe("spk-0");
  });
});

/* ------------------------------------------------------------------ *
 * Speakers
 * ------------------------------------------------------------------ */

describe("setSegmentSpeaker", () => {
  it("reassigns the segment as a discrete undo step", () => {
    const store = makeStore();

    act(store).setSegmentSpeaker("c1", "spk-1");
    act(store).setSegmentSpeaker("c3", "spk-1");

    expect(segment(store, "c1")!.speakerId).toBe("spk-1");

    act(store).undo();
    expect(segment(store, "c3")!.speakerId).toBe("spk-0");
    expect(segment(store, "c1")!.speakerId).toBe("spk-1");
  });
});

describe("renameSpeaker", () => {
  it("sets the display name and collapses typing into one step", () => {
    const store = makeStore();

    act(store).renameSpeaker("spk-1", "A");
    act(store).renameSpeaker("spk-1", "Ad");
    act(store).renameSpeaker("spk-1", "Ada");

    expect(selectSpeakerById("spk-1")(store.getState())!.name).toBe("Ada");
    expect(store.getState().revision).toBe(3);

    act(store).undo();

    expect(selectSpeakerById("spk-1")(store.getState())!.name).toBeUndefined();
  });

  it("keys the group per speaker", () => {
    const store = makeStore();

    act(store).renameSpeaker("spk-0", "Moderator");
    act(store).renameSpeaker("spk-1", "Ada");

    act(store).undo();
    expect(selectSpeakerById("spk-1")(store.getState())!.name).toBeUndefined();
    expect(selectSpeakerById("spk-0")(store.getState())!.name).toBe("Moderator");
  });

  it("does not disturb the segments", () => {
    const store = makeStore();
    const before = segments(store);

    act(store).renameSpeaker("spk-1", "Ada");

    expect(segments(store)).toBe(before);
  });
});

/* ------------------------------------------------------------------ *
 * Transient state
 * ------------------------------------------------------------------ */

describe("transient actions", () => {
  it("setCurrentTime floors at zero and never enters history", () => {
    const store = makeStore();

    act(store).setCurrentTime(9.25);
    expect(store.getState().currentTime).toBe(9.25);

    act(store).setCurrentTime(-4);
    expect(store.getState().currentTime).toBe(0);

    expect(store.getState().revision).toBe(0);
    expect(selectCanUndo(store.getState())).toBe(false);
  });

  it("setDuration floors at zero", () => {
    const store = makeStore();

    act(store).setDuration(1800.5);
    expect(store.getState().duration).toBe(1800.5);

    act(store).setDuration(-1);
    expect(store.getState().duration).toBe(0);
  });

  it("setZoom clamps to [MIN_ZOOM, MAX_ZOOM]", () => {
    const store = makeStore();

    act(store).setZoom(0);
    expect(store.getState().zoom).toBe(MIN_ZOOM);

    act(store).setZoom(-500);
    expect(store.getState().zoom).toBe(MIN_ZOOM);

    act(store).setZoom(9999);
    expect(store.getState().zoom).toBe(MAX_ZOOM);

    act(store).setZoom(64);
    expect(store.getState().zoom).toBe(64);
  });

  it("setPlaying and setFollowPlayhead are plain toggles", () => {
    const store = makeStore();

    act(store).setPlaying(true);
    expect(store.getState().isPlaying).toBe(true);

    act(store).setFollowPlayhead(false);
    expect(store.getState().followPlayhead).toBe(false);
  });

  it("setPlaybackRate accepts every documented rate", () => {
    const store = makeStore();

    for (const rate of PLAYBACK_RATES) {
      act(store).setPlaybackRate(rate);
      expect(store.getState().playbackRate).toBe(rate);
    }
  });

  it("selectSegment sets and clears the selection", () => {
    const store = makeStore();

    act(store).selectSegment("c2");
    expect(store.getState().selectedSegmentId).toBe("c2");

    act(store).selectSegment(null);
    expect(store.getState().selectedSegmentId).toBeNull();
  });

  it("toggleActiveSpeaker turns focus on, then back off", () => {
    const store = makeStore();

    act(store).toggleActiveSpeaker("spk-1");
    expect(store.getState().activeSpeakerId).toBe("spk-1");

    act(store).toggleActiveSpeaker("spk-1");
    expect(store.getState().activeSpeakerId).toBeNull();

    act(store).toggleActiveSpeaker("spk-1");
    act(store).toggleActiveSpeaker("spk-0");
    expect(store.getState().activeSpeakerId).toBe("spk-0");
  });

  it("setActiveSpeaker sets it outright", () => {
    const store = makeStore();

    act(store).setActiveSpeaker("spk-0");
    expect(store.getState().activeSpeakerId).toBe("spk-0");

    act(store).setActiveSpeaker(null);
    expect(store.getState().activeSpeakerId).toBeNull();
  });
});

describe("setSaveStatus", () => {
  it("updates the status alone when no meta is supplied", () => {
    const store = makeStore();

    act(store).setSaveStatus("saved", { savedAt: 1_700_000, error: null });
    act(store).setSaveStatus("dirty");

    expect(store.getState().saveStatus).toBe("dirty");
    // Meta is left as-is so the header can keep showing "saved 2m ago".
    expect(store.getState().lastSavedAt).toBe(1_700_000);
    expect(store.getState().saveError).toBeNull();
  });

  it("records an error message", () => {
    const store = makeStore();

    act(store).setSaveStatus("error", { error: "Network unreachable" });

    expect(store.getState().saveStatus).toBe("error");
    expect(store.getState().saveError).toBe("Network unreachable");
  });

  it("accepts an explicit null to clear savedAt", () => {
    const store = makeStore();

    act(store).setSaveStatus("saved", { savedAt: 5 });
    act(store).setSaveStatus("idle", { savedAt: null });

    expect(store.getState().lastSavedAt).toBeNull();
  });

  it("never enters history", () => {
    const store = makeStore();

    act(store).setSaveStatus("saving");

    expect(store.getState().revision).toBe(0);
    expect(selectCanUndo(store.getState())).toBe(false);
  });
});

/* ------------------------------------------------------------------ *
 * Selectors
 * ------------------------------------------------------------------ */

describe("selectors", () => {
  it("selectCanUndo / selectCanRedo track the stacks", () => {
    const store = makeStore();

    expect(selectCanUndo(store.getState())).toBe(false);
    expect(selectCanRedo(store.getState())).toBe(false);

    act(store).setSegmentText("c1", "edited");
    expect(selectCanUndo(store.getState())).toBe(true);
    expect(selectCanRedo(store.getState())).toBe(false);

    act(store).undo();
    expect(selectCanUndo(store.getState())).toBe(false);
    expect(selectCanRedo(store.getState())).toBe(true);

    act(store).redo();
    expect(selectCanUndo(store.getState())).toBe(true);
    expect(selectCanRedo(store.getState())).toBe(false);
  });

  it("selectSegmentById and selectSpeakerById return undefined for unknown ids", () => {
    const store = makeStore();

    expect(selectSegmentById("c1")(store.getState())!.id).toBe("c1");
    expect(selectSegmentById("nope")(store.getState())).toBeUndefined();
    expect(selectSpeakerById("spk-0")(store.getState())!.label).toBe("Speaker A");
    expect(selectSpeakerById("nope")(store.getState())).toBeUndefined();
  });

  it("selectDoc / selectSegments / selectSpeakers read through history.present", () => {
    const store = makeStore();

    act(store).setSegmentText("c1", "edited");

    expect(selectDoc(store.getState())).toBe(store.getState().history.present);
    expect(selectSegments(store.getState())).toBe(store.getState().history.present.segments);
    expect(selectSpeakers(store.getState())).toBe(
      store.getState().history.present.speakers
    );
  });

  it("selectSegments returns a stable reference across transient updates", () => {
    // The perf contract: moving the playhead must not invalidate the segment list.
    const store = makeStore();
    const before = selectSegments(store.getState());

    act(store).setCurrentTime(30);
    act(store).setZoom(120);
    act(store).setPlaying(true);

    expect(selectSegments(store.getState())).toBe(before);
  });

  it("isSegmentDimmed dims everything except the focused speaker", () => {
    const [first, , third] = makeDoc().segments;

    expect(isSegmentDimmed(first, null)).toBe(false);
    expect(isSegmentDimmed(first, "spk-0")).toBe(false);
    expect(isSegmentDimmed(first, "spk-1")).toBe(true);
    expect(isSegmentDimmed(third, "spk-1")).toBe(true);
  });
});

/* ------------------------------------------------------------------ *
 * Subscription behaviour the workspace depends on
 * ------------------------------------------------------------------ */

describe("subscription", () => {
  it("notifies once per action, and only document actions move revision", () => {
    const store = makeStore();
    const seen: number[] = [];
    const unsubscribe = store.subscribe((state) => seen.push(state.revision));

    act(store).setSegmentText("c1", "a");
    act(store).setCurrentTime(4);
    act(store).setZoom(80);

    unsubscribe();
    act(store).setSegmentText("c1", "b");

    expect(seen).toEqual([1, 1, 1]);
  });
});

/* ------------------------------------------------------------------ *
 * Known sharp edges — pinned so a fix is a deliberate change, not a
 * surprise. See the suite notes in the handover for the rationale.
 * ------------------------------------------------------------------ */

describe("no-op edits (known sharp edges)", () => {
  it("commits an undo step when text is set to the value it already had", () => {
    const store = makeStore();

    act(store).setSegmentText("c1", ORIGINAL_TEXT.c1);

    // The transform allocates a fresh document object, so the identity guard in
    // `mutate` never fires. Result: a phantom undo step and a revision bump
    // that will trigger an autosave for a document that did not change.
    expect(store.getState().revision).toBe(1);
    expect(selectCanUndo(store.getState())).toBe(true);
  });

  it("commits an undo step when deleting an id that does not exist", () => {
    const store = makeStore();

    act(store).deleteSegment("nope");

    expect(segments(store)).toHaveLength(3);
    expect(store.getState().revision).toBe(1);
    expect(selectCanUndo(store.getState())).toBe(true);
  });

  it("commits an undo step when retiming an id that does not exist", () => {
    const store = makeStore();

    act(store).retime("nope", { start: 0, end: 1 });

    expect(store.getState().revision).toBe(1);
    expect(selectCanUndo(store.getState())).toBe(true);
  });

  it("BUG: insertSegmentAt overlaps the segment the playhead is inside", () => {
    const store = makeStore();

    // The playhead sits inside c1 (0 → 2). `insertSegmentAt` only looks for a segment
    // that starts after `time` and one that ends at or before it, so a segment
    // *containing* `time` is invisible to both probes.
    act(store).insertSegmentAt(1);

    const inserted = segment(store, "segment-1")!;
    const first = segment(store, "c1")!;

    // Correct behaviour would be to refuse (or to split c1). Instead:
    expect(inserted.start).toBe(1);
    expect(inserted.end).toBe(3);
    expect(inserted.start).toBeLessThan(first.end);

    // And the overlap breaks the binary search's non-overlap precondition —
    // findActiveSegmentIndex now reports the wrong segment at t = 1.5.
    expect(findActiveSegmentIndex(segments(store), 1.5)).toBe(1);
    expect(segments(store).findIndex((c) => 1.5 >= c.start && 1.5 < c.end)).toBe(0);
  });

  it("BUG: insertSegmentAt past the last segment is a silent no-op until duration is known", () => {
    // duration 0 = audio metadata has not loaded yet. The fallback ceiling is
    // `time + MIN_SEGMENT_DURATION`, but `(time + 5/6) - time < 5/6` in float for
    // any non-trivial `time`, so the minimum-duration guard always rejects it.
    const store = makeStore(makeDoc(), 0);

    act(store).insertSegmentAt(20);

    expect(segments(store)).toHaveLength(3);
    expect(store.getState().revision).toBe(0);

    // Once the duration lands, the same call works.
    act(store).setDuration(60);
    act(store).insertSegmentAt(20);
    expect(segments(store)).toHaveLength(4);
  });

  it("inserts flush against the previous segment, with no MIN_SEGMENT_GAP", () => {
    const store = makeStore();

    act(store).insertSegmentAt(2);

    // `insertSegmentAt` is the one mutation that does not route through retimeSegment,
    // so the minimum-gap invariant does not apply to it.
    expect(segment(store, "c1")!.end).toBe(2);
    expect(segment(store, "segment-1")!.start).toBe(2);
    expect(segment(store, "segment-1")!.start - segment(store, "c1")!.end).toBeLessThan(MIN_SEGMENT_GAP);
    expect(segment(store, "segment-1")!.end - segment(store, "segment-1")!.start).toBeGreaterThanOrEqual(
      MIN_SEGMENT_DURATION
    );
  });
});

/* ------------------------------------------------------------------ *
 * Speaker roster
 * ------------------------------------------------------------------ */

describe("speaker roster", () => {
  function rosterStore() {
    return createAnnotationStore(
      {
        sessionId: "s",
        speakers: [
          { id: "spk-0", label: "Speaker A", role: "moderator", color: "#25F07D" },
          { id: "spk-1", label: "Speaker B", role: "participant", color: "#53A8F2" },
        ],
        segments: [
          { id: "a", start: 0, end: 2, speakerId: "spk-0", text: "one" },
          { id: "b", start: 3, end: 5, speakerId: "spk-1", text: "two" },
          { id: "c", start: 6, end: 8, speakerId: "spk-1", text: "three" },
        ],
        ...emptyAnnotationState(),
      },
      { duration: 60 }
    );
  }

  it("appends a speaker with a fresh label and colour", () => {
    const store = rosterStore();
    store.getState().addSpeaker();

    const { speakers } = store.getState().history.present;
    expect(speakers).toHaveLength(3);
    expect(speakers[2].label).toBe("Speaker C");
    expect(speakers[2].role).toBe("participant");
    expect(new Set(speakers.map((s) => s.id)).size).toBe(3);
  });

  it("has no ceiling, and labels past Z continue AA, AB…", () => {
    const store = rosterStore();
    for (let i = 0; i < 30; i += 1) store.getState().addSpeaker();

    const { speakers } = store.getState().history.present;
    expect(speakers).toHaveLength(32);
    expect(speakers[25].label).toBe("Speaker Z");
    expect(speakers[26].label).toBe("Speaker AA");
    expect(new Set(speakers.map((s) => s.id)).size).toBe(speakers.length);
  });

  it("removing a speaker also removes every segment they owned", () => {
    const store = rosterStore();
    store.getState().removeSpeaker("spk-1");

    const doc = store.getState().history.present;
    expect(doc.speakers.map((s) => s.id)).toEqual(["spk-0"]);
    expect(doc.segments.map((s) => s.id)).toEqual(["a"]);
  });

  it("never removes the last speaker — it would orphan every segment", () => {
    const store = rosterStore();
    store.getState().removeSpeaker("spk-1");
    store.getState().removeSpeaker("spk-0");

    expect(store.getState().history.present.speakers).toHaveLength(1);
  });

  it("clears focus and selection that pointed at what was removed", () => {
    const store = rosterStore();
    store.getState().setActiveSpeaker("spk-1");
    store.getState().selectSegment("b");

    store.getState().removeSpeaker("spk-1");

    expect(store.getState().activeSpeakerId).toBeNull();
    expect(store.getState().selectedSegmentId).toBeNull();
  });

  it("keeps a selection that survived the removal", () => {
    const store = rosterStore();
    store.getState().selectSegment("a");
    store.getState().removeSpeaker("spk-1");

    expect(store.getState().selectedSegmentId).toBe("a");
  });

  it("adding and removing speakers are both undoable", () => {
    const store = rosterStore();

    store.getState().addSpeaker();
    expect(store.getState().history.present.speakers).toHaveLength(3);
    store.getState().undo();
    expect(store.getState().history.present.speakers).toHaveLength(2);

    store.getState().removeSpeaker("spk-1");
    expect(store.getState().history.present.segments).toHaveLength(1);
    store.getState().undo();
    expect(store.getState().history.present.segments).toHaveLength(3);
    expect(store.getState().history.present.speakers).toHaveLength(2);
  });
});

/* ------------------------------------------------------------------ *
 * Overlap model
 *
 * Two people talking at once is ordinary in a focus group, so segments may
 * overlap ACROSS rows. One person saying two things at once is not, so they may
 * never overlap WITHIN a row. Everything below pins that asymmetry.
 * ------------------------------------------------------------------ */

describe("cross-row overlap", () => {
  function overlapStore() {
    return createAnnotationStore(
      {
        sessionId: "s",
        speakers: [
          { id: "spk-0", label: "Speaker A", role: "moderator", color: "#25F07D" },
          { id: "spk-1", label: "Speaker B", role: "participant", color: "#53A8F2" },
        ],
        segments: [
          { id: "a", start: 0, end: 4, speakerId: "spk-0", text: "one" },
          { id: "b", start: 6, end: 9, speakerId: "spk-0", text: "two" },
          { id: "x", start: 10, end: 12, speakerId: "spk-1", text: "three" },
        ],
        ...emptyAnnotationState(),
      },
      { duration: 60 }
    );
  }

  it("lets a segment sit fully inside another speaker's segment", () => {
    const store = overlapStore();

    act(store).retime("x", { start: 1, end: 3 });

    expect(segment(store, "x")).toMatchObject({ start: 1, end: 3 });
    expect(segment(store, "a")).toMatchObject({ start: 0, end: 4 });
  });

  it("still refuses to overlap within one row", () => {
    const store = overlapStore();

    act(store).retime("b", { start: 1, end: 9 });

    // Clamped to a's end, not allowed to swallow it.
    expect(segment(store, "b")!.start).toBeCloseTo(4 + MIN_SEGMENT_GAP, 10);
  });

  it("moves a segment to another row when the destination is free", () => {
    const store = overlapStore();

    act(store).moveSegmentToSpeaker("x", "spk-0", { start: 20, end: 22 });

    expect(segment(store, "x")).toMatchObject({
      speakerId: "spk-0",
      start: 20,
      end: 22,
    });
  });

  it("refuses a move that would collide on the destination row", () => {
    const store = overlapStore();

    // spk-0 already occupies 0–4.
    act(store).moveSegmentToSpeaker("x", "spk-0", { start: 2, end: 3 });

    expect(segment(store, "x")).toMatchObject({ speakerId: "spk-1", start: 10 });
    expect(store.getState().revision).toBe(0);
  });

  it("allows a move onto a row that is busy elsewhere", () => {
    const store = overlapStore();

    act(store).moveSegmentToSpeaker("x", "spk-0", { start: 4.5, end: 5.5 });

    expect(segment(store, "x")).toMatchObject({ speakerId: "spk-0", start: 4.5 });
  });

  it("keeps a cross-row move undoable", () => {
    const store = overlapStore();

    act(store).moveSegmentToSpeaker("x", "spk-0", { start: 20, end: 22 });
    act(store).undo();

    expect(segment(store, "x")).toMatchObject({ speakerId: "spk-1", start: 10 });
  });

  it("finds the active segment even when it is hidden behind a later start", () => {
    const store = overlapStore();
    act(store).retime("x", { start: 1, end: 3 });

    const list = segments(store);
    // At t=3.5 only `a` is live; `x` sorts first but has already ended.
    expect(findActiveSegmentIndex(list, 3.5)).toBe(list.findIndex((s) => s.id === "a"));
  });

  it("resolves the active segment per speaker when rows overlap", () => {
    const store = overlapStore();
    act(store).retime("x", { start: 1, end: 3 });

    const list = segments(store);
    expect(findActiveSegmentIndexForSpeaker(list, 2, "spk-0")).toBe(
      list.findIndex((s) => s.id === "a")
    );
    expect(findActiveSegmentIndexForSpeaker(list, 2, "spk-1")).toBe(
      list.findIndex((s) => s.id === "x")
    );
  });
});
