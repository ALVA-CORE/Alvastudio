import { createStore, type StoreApi } from "zustand/vanilla";
import {
  commit,
  createHistory,
  canRedo as historyCanRedo,
  canUndo as historyCanUndo,
  redo as historyRedo,
  undo as historyUndo,
  type History,
} from "./history";
import {
  createSegmentId,
  mergeSegments,
  overlapsRow,
  retimeSegment,
  sortSegments,
  splitSegmentAt,
} from "./segments";
import {
  MIN_SEGMENT_DURATION,
  type AnnotationSpan,
  type NonSpeechMark,
  speakerColorAt,
  speakerLabelAt,
  type Segment,
  type SegmentId,
  type SaveStatus,
  type Speaker,
  type SpeakerId,
  type TranscriptDoc,
} from "./types";

/**
 * Workspace store.
 *
 * Built on `zustand/vanilla` + an explicit React context rather than a module
 * singleton, for three reasons: two workspaces can coexist (a future
 * side-by-side QA pass), the store is drivable in tests with no renderer, and
 * unmounting genuinely disposes state instead of leaking it into the next
 * session.
 *
 * The split that matters: `history` holds the document and is undoable.
 * Everything else — playhead, zoom, selection, save status — is transient and
 * is deliberately *not* undoable. Ctrl+Z must never move the playhead.
 */

export type AnnotationState = {
  history: History<TranscriptDoc>;
  /**
   * Bumped on every change to the document. The autosave hook watches this
   * rather than deep-comparing the doc.
   */
  revision: number;

  /* Playback — transient */
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  playbackRate: number;
  /** Waveform horizontal scale, pixels per second. */
  zoom: number;
  /** Whether the transcript scrolls to follow the playhead. */
  followPlayhead: boolean;

  /* Selection — transient */
  /**
   * Every selected segment. Multi-select exists so a batch can be tagged in one
   * action from the panel; a single selection is just a set of one, which keeps
   * one code path rather than two that drift apart.
   */
  selectedSegmentIds: SegmentId[];
  /** Diarization focus. Non-null dims every other speaker across the UI. */
  activeSpeakerId: SpeakerId | null;

  /* Persistence — transient */
  saveStatus: SaveStatus;
  lastSavedAt: number | null;
  saveError: string | null;

  /* Document actions — undoable */
  setSegmentText: (id: SegmentId, text: string) => void;
  setSegmentSpeaker: (id: SegmentId, speakerId: SpeakerId) => void;
  retime: (id: SegmentId, next: { start: number; end: number }, opts?: { live?: boolean }) => void;
  splitSegment: (id: SegmentId, time: number) => void;
  mergeWithNext: (id: SegmentId) => void;
  deleteSegment: (id: SegmentId) => void;
  insertSegmentAt: (time: number, speakerId?: SpeakerId) => void;
  renameSpeaker: (id: SpeakerId, name: string) => void;
  /* Tagging — all undoable, all part of the document. */
  /** Adds a token-range tag. Replaces any existing span of the same kind that
   *  covers the same range, so applying twice is a change, not a duplicate. */
  addSpan: (span: Omit<AnnotationSpan, "id">) => void;
  updateSpan: (id: string, patch: Partial<Omit<AnnotationSpan, "id">>) => void;
  removeSpan: (id: string) => void;
  addNonSpeechMark: (mark: Omit<NonSpeechMark, "id">) => void;
  removeNonSpeechMark: (id: string) => void;
  toggleDifficultyFlag: (flag: string) => void;
  setSpeechPresent: (present: boolean) => void;

  /** Appends a diarization track. The roster is unbounded. */
  addSpeaker: () => void;
  /**
   * Reassigns a segment to another speaker's row, optionally moving it in time.
   * No-ops when the destination row already has audio in that span — one person
   * cannot say two things at once.
   */
  moveSegmentToSpeaker: (
    id: SegmentId,
    speakerId: SpeakerId,
    range?: { start: number; end: number }
  ) => void;
  /** Removes a speaker AND every segment they own. Never leaves the last one. */
  removeSpeaker: (id: SpeakerId) => void;
  undo: () => void;
  redo: () => void;
  /** Ends a coalescing group — call on pointer-up or blur. */
  endInteraction: () => void;

  /* Transient actions */
  setCurrentTime: (time: number) => void;
  setDuration: (duration: number) => void;
  setPlaying: (playing: boolean) => void;
  setPlaybackRate: (rate: number) => void;
  setZoom: (zoom: number) => void;
  setFollowPlayhead: (follow: boolean) => void;
  /** Replaces the selection with exactly this segment, or clears it. */
  selectSegment: (id: SegmentId | null) => void;
  /** Adds or removes one segment from the selection (Shift-click). */
  toggleSegmentSelection: (id: SegmentId) => void;
  /** Replaces the selection wholesale. */
  setSelectedSegments: (ids: SegmentId[]) => void;
  setActiveSpeaker: (id: SpeakerId | null) => void;
  toggleActiveSpeaker: (id: SpeakerId) => void;
  setSaveStatus: (status: SaveStatus, meta?: { savedAt?: number | null; error?: string | null }) => void;
};

export type AnnotationStore = StoreApi<AnnotationState>;

export const MIN_ZOOM = 8;
export const MAX_ZOOM = 320;
export const DEFAULT_ZOOM = 40;
export const PLAYBACK_RATES = [0.5, 0.75, 1, 1.25, 1.5, 2] as const;

export function createAnnotationStore(
  doc: TranscriptDoc,
  options: { duration?: number } = {}
): AnnotationStore {
  return createStore<AnnotationState>()((set, get) => {
    /**
     * Applies a document transform and records it. `key` groups consecutive
     * commits into one undo step; omit it for discrete edits.
     */
    function mutate(transform: (doc: TranscriptDoc) => TranscriptDoc, key?: string) {
      const state = get();
      const next = transform(state.history.present);
      if (next === state.history.present) return;

      set({
        history: commit(state.history, next, { key }),
        revision: state.revision + 1,
      });
    }

    return {
      history: createHistory(doc),
      revision: 0,

      currentTime: 0,
      duration: options.duration ?? 0,
      isPlaying: false,
      playbackRate: 1,
      zoom: DEFAULT_ZOOM,
      followPlayhead: true,

      selectedSegmentIds: [],
      activeSpeakerId: null,

      saveStatus: "idle",
      lastSavedAt: null,
      saveError: null,

      /* ---------------------------------------------------------- *
       * Document
       * ---------------------------------------------------------- */

      setSegmentText(id, text) {
        // Keyed on the segment, so a burst of typing is one undo step but moving
        // to another segment starts a new one.
        mutate(
          (current) => ({
            ...current,
            segments: current.segments.map((segment) => (segment.id === id ? { ...segment, text } : segment)),
          }),
          `text:${id}`
        );
      },

      setSegmentSpeaker(id, speakerId) {
        mutate((current) => ({
          ...current,
          segments: current.segments.map((segment) =>
            segment.id === id ? { ...segment, speakerId } : segment
          ),
        }));
      },

      retime(id, next, { live = false } = {}) {
        const { duration } = get();
        mutate(
          (current) => ({
            ...current,
            segments: retimeSegment(current.segments, id, next, { duration }),
          }),
          // A drag emits continuously; collapse it to one undo step. The
          // pointer-up handler calls endInteraction() to close the group.
          live ? `retime:${id}` : undefined
        );
      },

      splitSegment(id, time) {
        mutate((current) => {
          const index = current.segments.findIndex((segment) => segment.id === id);
          if (index === -1) return current;

          const parts = splitSegmentAt(current.segments[index], time);
          if (!parts) return current;

          const segments = [...current.segments];
          segments.splice(index, 1, ...parts);
          return { ...current, segments };
        });
      },

      mergeWithNext(id) {
        mutate((current) => {
          const sorted = sortSegments(current.segments);
          const index = sorted.findIndex((segment) => segment.id === id);
          if (index === -1) return current;

          // Merge with the next segment on the SAME row. The globally next
          // segment may belong to another speaker, and merging across voices
          // would silently attribute one person's words to another.
          const subject = sorted[index];
          const nextIndex = sorted.findIndex(
            (segment, i) => i > index && segment.speakerId === subject.speakerId
          );
          if (nextIndex === -1) return current;

          const merged = mergeSegments(subject, sorted[nextIndex]);
          const segments = sorted.filter((_, i) => i !== index && i !== nextIndex);
          segments.push(merged);
          return { ...current, segments: sortSegments(segments) };
        });
      },

      deleteSegment(id) {
        mutate((current) => ({
          ...current,
          segments: current.segments.filter((segment) => segment.id !== id),
        }));
        set((state) => ({
          selectedSegmentIds: state.selectedSegmentIds.filter((entry) => entry !== id),
        }));
      },

      insertSegmentAt(time, speakerId) {
        const { duration } = get();
        const insertedId = createSegmentId();
        let inserted = false;
        mutate((current) => {
          const targetSpeaker = speakerId ?? current.speakers[0]?.id ?? "spk-0";
          // Only this speaker's row constrains the insert — other rows may be
          // busy at the same instant, and that is legitimate.
          const sorted = sortSegments(
            current.segments.filter((segment) => segment.speakerId === targetSpeaker)
          );
          const next = sorted.find((segment) => segment.start > time);
          const prev = [...sorted].reverse().find((segment) => segment.end <= time);

          const start = Math.max(time, prev ? prev.end : 0);
          const ceiling = next ? next.start : duration || time + MIN_SEGMENT_DURATION;
          const end = Math.min(start + 2, ceiling);

          if (end - start < MIN_SEGMENT_DURATION) return current;

          const segment: Segment = {
            id: insertedId,
            start,
            end,
            speakerId: targetSpeaker,
            text: "",
          };

          inserted = true;
          return { ...current, segments: sortSegments([...current.segments, segment]) };
        });

        // Select it so the transcript scrolls the new (empty) row into view —
        // otherwise inserting far from the current scroll position looks like
        // nothing happened.
        if (inserted) set({ selectedSegmentIds: [insertedId] });
      },

      addSpan(span) {
        mutate((current) => {
          // Same kind over the same range is a correction, not a second tag —
          // otherwise re-picking from the menu silently stacks duplicates that
          // only surface as double-counted rows on export.
          const kept = current.spans.filter(
            (existing) =>
              !(
                existing.kind === span.kind &&
                existing.startToken === span.startToken &&
                existing.endToken === span.endToken
              )
          );

          return {
            ...current,
            spans: [...kept, { ...span, id: createSegmentId("span") }],
          };
        });
      },

      updateSpan(id, patch) {
        mutate((current) => ({
          ...current,
          spans: current.spans.map((span) =>
            span.id === id ? { ...span, ...patch } : span
          ),
        }));
      },

      removeSpan(id) {
        mutate((current) => ({
          ...current,
          spans: current.spans.filter((span) => span.id !== id),
        }));
      },

      addNonSpeechMark(mark) {
        mutate((current) => ({
          ...current,
          nonSpeech: [
            ...current.nonSpeech,
            { ...mark, id: createSegmentId("nse") },
          ],
        }));
      },

      removeNonSpeechMark(id) {
        mutate((current) => ({
          ...current,
          nonSpeech: current.nonSpeech.filter((mark) => mark.id !== id),
        }));
      },

      toggleDifficultyFlag(flag) {
        mutate((current) => ({
          ...current,
          difficultyFlags: current.difficultyFlags.includes(flag)
            ? current.difficultyFlags.filter((entry) => entry !== flag)
            : [...current.difficultyFlags, flag],
        }));
      },

      setSpeechPresent(present) {
        mutate((current) => ({ ...current, speechPresent: present }));
      },

      addSpeaker() {
        mutate((current) => {
          // Machine labels continue the A, B, C… sequence rather than reusing a
          // freed letter, so a label never refers to two different voices.
          const index = current.speakers.length;
          return {
            ...current,
            speakers: [
              ...current.speakers,
              {
                id: `spk-${index}-${createSegmentId("s")}`,
                label: `Speaker ${speakerLabelAt(index)}`,
                role: "participant" as const,
                color: speakerColorAt(index),
              },
            ],
          };
        });
      },

      moveSegmentToSpeaker(id, speakerId, range) {
        mutate((current) => {
          const segment = current.segments.find((entry) => entry.id === id);
          if (!segment) return current;

          const next = range ?? { start: segment.start, end: segment.end };
          if (segment.speakerId === speakerId && next.start === segment.start) {
            return current;
          }

          // Rows are exclusive even though the timeline as a whole is not.
          if (overlapsRow(current.segments, speakerId, next, id)) return current;

          return {
            ...current,
            segments: sortSegments(
              current.segments.map((entry) =>
                entry.id === id ? { ...entry, speakerId, ...next } : entry
              )
            ),
          };
        });
      },

      removeSpeaker(id) {
        const { activeSpeakerId } = get();

        mutate((current) => {
          // Deleting the last speaker would orphan every segment.
          if (current.speakers.length <= 1) return current;

          return {
            ...current,
            speakers: current.speakers.filter((speaker) => speaker.id !== id),
            segments: current.segments.filter((segment) => segment.speakerId !== id),
          };
        });

        // Clear transient state pointing at what just disappeared.
        if (activeSpeakerId === id) set({ activeSpeakerId: null });
        const alive = new Set(get().history.present.segments.map((entry) => entry.id));
        set((state) => ({
          selectedSegmentIds: state.selectedSegmentIds.filter((entry) => alive.has(entry)),
        }));
      },

      renameSpeaker(id, name) {
        mutate(
          (current) => ({
            ...current,
            speakers: current.speakers.map((speaker) =>
              speaker.id === id ? { ...speaker, name } : speaker
            ),
          }),
          `speaker:${id}`
        );
      },

      undo() {
        const state = get();
        if (!historyCanUndo(state.history)) return;
        set({ history: historyUndo(state.history), revision: state.revision + 1 });
      },

      redo() {
        const state = get();
        if (!historyCanRedo(state.history)) return;
        set({ history: historyRedo(state.history), revision: state.revision + 1 });
      },

      endInteraction() {
        const state = get();
        if (state.history.lastKey === null) return;
        set({ history: { ...state.history, lastKey: null } });
      },

      /* ---------------------------------------------------------- *
       * Transient
       * ---------------------------------------------------------- */

      setCurrentTime(time) {
        set({ currentTime: Math.max(0, time) });
      },
      setDuration(duration) {
        set({ duration: Math.max(0, duration) });
      },
      setPlaying(isPlaying) {
        set({ isPlaying });
      },
      setPlaybackRate(playbackRate) {
        set({ playbackRate });
      },
      setZoom(zoom) {
        set({ zoom: Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom)) });
      },
      setFollowPlayhead(followPlayhead) {
        set({ followPlayhead });
      },
      selectSegment(id) {
        set({ selectedSegmentIds: id === null ? [] : [id] });
      },

      toggleSegmentSelection(id) {
        set((state) => ({
          selectedSegmentIds: state.selectedSegmentIds.includes(id)
            ? state.selectedSegmentIds.filter((entry) => entry !== id)
            : [...state.selectedSegmentIds, id],
        }));
      },

      setSelectedSegments(ids) {
        set({ selectedSegmentIds: ids });
      },
      setActiveSpeaker(activeSpeakerId) {
        set({ activeSpeakerId });
      },
      toggleActiveSpeaker(id) {
        set((state) => ({
          activeSpeakerId: state.activeSpeakerId === id ? null : id,
        }));
      },
      setSaveStatus(saveStatus, meta = {}) {
        set({
          saveStatus,
          ...(meta.savedAt !== undefined ? { lastSavedAt: meta.savedAt } : {}),
          ...(meta.error !== undefined ? { saveError: meta.error } : {}),
        });
      },
    };
  });
}

/* ------------------------------------------------------------------ *
 * Selectors. Exported so components subscribe to the narrowest possible
 * slice — `currentTime` changes ~60×/s during playback and must not
 * re-render the segment list.
 * ------------------------------------------------------------------ */

export const selectDoc = (state: AnnotationState): TranscriptDoc => state.history.present;
export const selectSegments = (state: AnnotationState): Segment[] => state.history.present.segments;
export const selectSpeakers = (state: AnnotationState): Speaker[] =>
  state.history.present.speakers;
/**
 * The single selected segment, or null when zero or many are selected.
 *
 * Most of the UI is only meaningful for one segment — the lit rail, the scroll
 * target — so this is the narrow read. The panel reads `selectedSegmentIds`
 * directly when it wants the batch.
 */
export const selectPrimarySegmentId = (state: AnnotationState): SegmentId | null =>
  state.selectedSegmentIds.length === 1 ? state.selectedSegmentIds[0] : null;

export const selectSpans = (state: AnnotationState): AnnotationSpan[] =>
  state.history.present.spans;
export const selectNonSpeech = (state: AnnotationState): NonSpeechMark[] =>
  state.history.present.nonSpeech;
export const selectCanUndo = (state: AnnotationState): boolean =>
  historyCanUndo(state.history);
export const selectCanRedo = (state: AnnotationState): boolean =>
  historyCanRedo(state.history);

export const selectSegmentById =
  (id: SegmentId) =>
  (state: AnnotationState): Segment | undefined =>
    state.history.present.segments.find((segment) => segment.id === id);

export const selectSpeakerById =
  (id: SpeakerId) =>
  (state: AnnotationState): Speaker | undefined =>
    state.history.present.speakers.find((speaker) => speaker.id === id);

/**
 * Whether a segment should render dimmed. Extracted so the transcript and the
 * waveform cannot drift apart on what "dimmed" means.
 */
export function isSegmentDimmed(segment: Segment, activeSpeakerId: SpeakerId | null): boolean {
  return activeSpeakerId !== null && segment.speakerId !== activeSpeakerId;
}
