import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import { useStore } from "zustand";
import { createAnnotationStore, type AnnotationState, type AnnotationStore } from "./store";
import { createAutosaveController, DEFAULT_AUTOSAVE_DELAY } from "./autosave";
import type { TranscriptDoc } from "./types";

/**
 * React bindings for the workspace store.
 *
 * The store instance is created once per mounted workspace and handed down by
 * context, so `useAnnotation(selector)` subscribes to exactly one slice.
 * Anything reading `currentTime` re-renders on every frame of playback, so keep
 * those selectors as narrow as the component allows.
 */

const AnnotationStoreContext = createContext<AnnotationStore | null>(null);

/**
 * Imperative autosave handles. Separate from the store because these are
 * effects, not state — putting `flush` on the store would make every consumer
 * re-render when it changed identity.
 */
export type AutosaveControls = {
  /** Saves now, bypassing the debounce. Backs ⌘S and the header's Retry. */
  flush: () => Promise<void>;
};

const AutosaveControlsContext = createContext<AutosaveControls | null>(null);

type AnnotationProviderProps = {
  doc: TranscriptDoc;
  duration?: number;
  /**
   * Persists the document. Omit and autosave is inert — useful in tests and in
   * the read-only completed-session view.
   */
  onSave?: (doc: TranscriptDoc) => Promise<void>;
  autosaveDelay?: number;
  children: ReactNode;
};

export function AnnotationProvider({
  doc,
  duration = 0,
  onSave,
  autosaveDelay = DEFAULT_AUTOSAVE_DELAY,
  children,
}: AnnotationProviderProps) {
  // One store per session. Re-keying the provider on sessionId (see the page)
  // is what disposes the old one — never mutate a doc into a live store.
  const storeRef = useRef<AnnotationStore | null>(null);
  if (storeRef.current === null) {
    storeRef.current = createAnnotationStore(doc, { duration });
  }
  const store = storeRef.current;

  /* Autosave. The controller lives outside React state; the store only
   * mirrors its status so the header can render it. */
  const onSaveRef = useRef(onSave);
  onSaveRef.current = onSave;

  const controller = useMemo(
    () =>
      createAutosaveController({
        delay: autosaveDelay,
        save: async () => {
          const handler = onSaveRef.current;
          if (!handler) return;
          await handler(store.getState().history.present);
        },
        onStatus: (status, meta) => {
          store.getState().setSaveStatus(status, {
            savedAt: meta.savedAt,
            error: meta.error ? meta.error.message : null,
          });
        },
      }),
    [autosaveDelay, store]
  );

  useEffect(() => () => controller.destroy(), [controller]);

  // Schedule a write whenever the document changes — including undo/redo,
  // which are edits from the persistence layer's point of view.
  useEffect(() => {
    let previous = store.getState().revision;

    return store.subscribe((state) => {
      if (state.revision === previous) return;
      previous = state.revision;
      if (onSaveRef.current) controller.schedule();
    });
  }, [controller, store]);

  // Last-ditch flush so a closing tab does not drop the final keystrokes.
  useEffect(() => {
    const handleUnload = () => {
      if (store.getState().saveStatus === "dirty") void controller.flush();
    };

    window.addEventListener("pagehide", handleUnload);
    return () => window.removeEventListener("pagehide", handleUnload);
  }, [controller, store]);

  const autosaveControls = useMemo<AutosaveControls>(
    () => ({ flush: () => controller.flush() }),
    [controller]
  );

  return (
    <AnnotationStoreContext.Provider value={store}>
      <AutosaveControlsContext.Provider value={autosaveControls}>
        {children}
      </AutosaveControlsContext.Provider>
    </AnnotationStoreContext.Provider>
  );
}

/** Imperative save handles. Returns a no-op flush outside a provider. */
export function useAutosaveControls(): AutosaveControls {
  const controls = useContext(AutosaveControlsContext);
  return controls ?? NO_AUTOSAVE;
}

const NO_AUTOSAVE: AutosaveControls = { flush: () => Promise.resolve() };

export function useAnnotationStore(): AnnotationStore {
  const store = useContext(AnnotationStoreContext);
  if (!store) {
    throw new Error("useAnnotationStore must be used inside <AnnotationProvider>");
  }
  return store;
}

/** Subscribe to a slice of workspace state. */
export function useAnnotation<T>(selector: (state: AnnotationState) => T): T {
  return useStore(useAnnotationStore(), selector);
}

/** Actions never change identity, so this never triggers a re-render. */
export function useAnnotationActions() {
  const store = useAnnotationStore();
  return useMemo(() => {
    const state = store.getState();
    return {
      setSegmentText: state.setSegmentText,
      setSegmentSpeaker: state.setSegmentSpeaker,
      retime: state.retime,
      splitSegment: state.splitSegment,
      mergeWithNext: state.mergeWithNext,
      deleteSegment: state.deleteSegment,
      insertSegmentAt: state.insertSegmentAt,
      renameSpeaker: state.renameSpeaker,
      addSpeaker: state.addSpeaker,
      removeSpeaker: state.removeSpeaker,
      undo: state.undo,
      redo: state.redo,
      endInteraction: state.endInteraction,
      setCurrentTime: state.setCurrentTime,
      setDuration: state.setDuration,
      setPlaying: state.setPlaying,
      setPlaybackRate: state.setPlaybackRate,
      setZoom: state.setZoom,
      setFollowPlayhead: state.setFollowPlayhead,
      selectSegment: state.selectSegment,
      setActiveSpeaker: state.setActiveSpeaker,
      toggleActiveSpeaker: state.toggleActiveSpeaker,
      setSaveStatus: state.setSaveStatus,
    };
  }, [store]);
}
