import { useCallback, useEffect, useRef, useState } from "react";
import { useAnnotationActions, useAnnotationStore } from "@/lib/annotation/context";
import type { AnnotationState } from "@/lib/annotation/store";

/**
 * Playback transport for the timeline.
 *
 * The playhead is driven by a requestAnimationFrame clock rather than by the
 * audio element's own `timeupdate`. Two reasons:
 *
 *  1. `timeupdate` fires at ~4Hz, which makes a playhead visibly stutter. rAF
 *     gives per-frame motion.
 *  2. The seeded demo audio (9–14s) is far shorter than the sessions it stands
 *     in for (18–47min), so the audio cannot be the clock. It loops underneath
 *     as audible feedback while the transport advances over the real session
 *     duration. When real session-length audio lands, the only change needed is
 *     to read `audio.currentTime` in `tick` instead of accumulating.
 *
 * As with the rest of the workspace, the store is the source of truth: this
 * hook reconciles imperatively inside `store.subscribe` and never re-renders on
 * playback.
 */

export type UseTransportOptions = {
  src: string;
};

export type UseTransportResult = {
  /** True once the audio element can play. The timeline renders regardless. */
  isReady: boolean;
  /** Audio load failure. Non-fatal — the timeline stays usable, just silent. */
  error: string | null;
  retry: () => void;
};

export function useTransport({ src }: UseTransportOptions): UseTransportResult {
  const store = useAnnotationStore();
  const actions = useAnnotationActions();

  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const frameRef = useRef<number | null>(null);
  /** Our own last write, so the subscriber can tell a seek from an echo. */
  const lastPushedRef = useRef(0);

  const retry = useCallback(() => {
    setError(null);
    setIsReady(false);
    setAttempt((value) => value + 1);
  }, []);

  useEffect(() => {
    let disposed = false;

    const audio = new Audio(src);
    audio.loop = true;
    audio.preload = "auto";
    audioRef.current = audio;

    const handleCanPlay = () => {
      if (disposed) return;
      setIsReady(true);
      setError(null);
    };

    const handleError = () => {
      if (disposed) return;
      setIsReady(false);
      setError("Could not load the session audio.");
    };

    audio.addEventListener("canplay", handleCanPlay);
    audio.addEventListener("error", handleError);

    /* ---------------------------------------------------------------- *
     * The clock
     * ---------------------------------------------------------------- */

    let lastFrame = 0;

    const stopClock = () => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
      lastFrame = 0;
    };

    const tick = (now: number) => {
      if (disposed) return;

      const state = store.getState();
      if (!state.isPlaying) {
        stopClock();
        return;
      }

      if (lastFrame === 0) lastFrame = now;
      const delta = (now - lastFrame) / 1000;
      lastFrame = now;

      const next = state.currentTime + delta * state.playbackRate;

      if (state.duration > 0 && next >= state.duration) {
        lastPushedRef.current = state.duration;
        actions.setCurrentTime(state.duration);
        actions.setPlaying(false);
        stopClock();
        return;
      }

      lastPushedRef.current = next;
      actions.setCurrentTime(next);
      frameRef.current = requestAnimationFrame(tick);
    };

    const startClock = () => {
      if (frameRef.current !== null) return;
      lastFrame = 0;
      frameRef.current = requestAnimationFrame(tick);
    };

    /* ---------------------------------------------------------------- *
     * store → transport
     * ---------------------------------------------------------------- */

    let appliedPlaying = store.getState().isPlaying;
    let appliedRate = store.getState().playbackRate;

    const handleStoreChange = (state: AnnotationState) => {
      if (disposed) return;

      if (state.playbackRate !== appliedRate) {
        appliedRate = state.playbackRate;
        audio.playbackRate = appliedRate;
      }

      if (state.isPlaying !== appliedPlaying) {
        appliedPlaying = state.isPlaying;

        if (appliedPlaying) {
          // Zustand notifies synchronously, so this still sits inside the
          // click handler's stack and keeps the user-activation that autoplay
          // policy requires.
          void audio.play().catch(() => {
            // Losing audio should not stop the timeline; the transport keeps
            // running silently rather than snapping back to paused.
          });
          startClock();
        } else {
          audio.pause();
          stopClock();
        }
      }

      // An external seek — a segment click, a ruler scrub, a keyboard nudge.
      if (state.currentTime !== lastPushedRef.current) {
        lastPushedRef.current = state.currentTime;

        // Map session time onto the shorter loop so the audio stays roughly in
        // step with the playhead instead of drifting arbitrarily.
        const audioDuration = audio.duration;
        if (Number.isFinite(audioDuration) && audioDuration > 0) {
          audio.currentTime = state.currentTime % audioDuration;
        }
      }
    };

    const unsubscribe = store.subscribe(handleStoreChange);

    // Adopt whatever state the store already holds (re-mount, retry).
    if (appliedPlaying) {
      void audio.play().catch(() => {});
      startClock();
    }
    audio.playbackRate = appliedRate;

    return () => {
      disposed = true;
      unsubscribe();
      stopClock();
      audio.pause();
      audio.removeEventListener("canplay", handleCanPlay);
      audio.removeEventListener("error", handleError);
      audio.src = "";
      audioRef.current = null;
    };
  }, [actions, src, store, attempt]);

  return { isReady, error, retry };
}
