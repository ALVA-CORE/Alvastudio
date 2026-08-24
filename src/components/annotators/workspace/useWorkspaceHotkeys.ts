import { useEffect, useRef } from "react";
import {
  useAnnotationActions,
  useAnnotationStore,
} from "@/lib/annotation/context";

/**
 * Workspace keyboard shortcuts.
 *
 * One `keydown` listener on `window` rather than per-component handlers: the
 * transport, the waveform and the transcript all want the same keys, and a
 * single listener is the only place the "am I inside a text field?" question
 * gets answered once and consistently.
 *
 * The listener is bound once and reads callbacks through a ref, so a parent
 * re-rendering with fresh inline handlers does not detach and reattach it on
 * every frame of playback.
 */

/** Arrow-key seek step, seconds. */
const SEEK_STEP = 2;
/** Shift-arrow seek step, seconds. */
const SEEK_STEP_LARGE = 5;

export type UseWorkspaceHotkeysOptions = {
  /** Bind the listener. False detaches it entirely — use while a modal owns the keyboard. */
  enabled?: boolean;
  /** Space (or modifier+Space inside a text field). */
  onTogglePlay: () => void;
  /**
   * Arrow-key seek. Receives an ABSOLUTE time in seconds, already clamped to
   * `[0, duration]` from the store — not a delta. Wire it straight to the
   * player's seek call.
   */
  onSeek: (time: number) => void;
  /** Ctrl/Cmd+S. Flush the pending autosave. */
  onSave?: () => void;
};

/**
 * Text-entry targets, where every plain key must reach the field untouched.
 * `select` is included because typing into a closed select jumps options, and
 * `input` covers checkboxes/radios too — Space is their native activation and
 * stealing it would break them.
 */
function isTextEntryTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;

  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
}

/**
 * Elements the browser already activates with Space. The play button itself is
 * one of them, so without this check pressing Space on a focused play button
 * would fire the click *and* the shortcut — toggling twice and appearing dead.
 */
function isSpaceActivatedTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.tagName === "BUTTON" || target.tagName === "SUMMARY") return true;
  if (target.tagName === "A" && target.hasAttribute("href")) return true;

  const role = target.getAttribute("role");
  return (
    role === "button" ||
    role === "checkbox" ||
    role === "switch" ||
    role === "tab" ||
    role === "option" ||
    role === "menuitem"
  );
}

export function useWorkspaceHotkeys({
  enabled = true,
  onTogglePlay,
  onSeek,
  onSave,
}: UseWorkspaceHotkeysOptions): void {
  const store = useAnnotationStore();
  const actions = useAnnotationActions();

  // Written on every render, read only inside the listener — keeps the effect's
  // dependency list free of unstable inline callbacks.
  const callbacks = useRef({ onTogglePlay, onSeek, onSave });
  callbacks.current = { onTogglePlay, onSeek, onSave };

  useEffect(() => {
    if (!enabled) return;

    function handleKeyDown(event: KeyboardEvent) {
      // Something closer to the user already claimed this key.
      if (event.defaultPrevented) return;
      // Mid-IME composition every keystroke reports as Enter/Escape noise.
      if (event.isComposing) return;

      const target = event.target;
      const mod = event.metaKey || event.ctrlKey;
      const isSpace = event.key === " " || event.code === "Space";
      // `event.key` for a letter respects Shift ("Z" vs "z"); normalise.
      const letter = event.key.length === 1 ? event.key.toLowerCase() : "";

      /* --------------------------------------------------------------- *
       * Shortcuts that fire even inside a textarea. Undo/redo must
       * preventDefault or the browser rewinds the textarea's own edit
       * buffer, which then disagrees with the store's history.
       * --------------------------------------------------------------- */

      if (mod && letter === "z") {
        event.preventDefault();
        if (event.shiftKey) actions.redo();
        else actions.undo();
        return;
      }

      if (mod && letter === "y") {
        event.preventDefault();
        actions.redo();
        return;
      }

      if (mod && letter === "s") {
        event.preventDefault();
        callbacks.current.onSave?.();
        return;
      }

      // Play/pause while the caret is in a segment: Space alone has to type a
      // space, so the modifier form is the escape hatch. Ctrl or Alt in
      // practice — macOS reserves Cmd+Space for Spotlight.
      if (isSpace && (event.ctrlKey || event.metaKey || event.altKey)) {
        if (event.repeat) {
          event.preventDefault();
          return;
        }
        event.preventDefault();
        callbacks.current.onTogglePlay();
        return;
      }

      /* --------------------------------------------------------------- *
       * Everything below is a bare key and must not reach a text field.
       * --------------------------------------------------------------- */

      if (isTextEntryTarget(target)) return;

      if (isSpace) {
        if (isSpaceActivatedTarget(target)) return;
        // Always swallow it, repeat included, or the page scrolls.
        event.preventDefault();
        if (event.repeat) return;
        callbacks.current.onTogglePlay();
        return;
      }

      if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        // Cmd/Ctrl/Alt+Arrow are OS and browser navigation; leave them alone.
        if (mod || event.altKey) return;

        event.preventDefault();
        const { currentTime, duration } = store.getState();
        const step = event.shiftKey ? SEEK_STEP_LARGE : SEEK_STEP;
        const target_ = currentTime + (event.key === "ArrowLeft" ? -step : step);
        // `duration` is 0 until the audio reports it — do not clamp to zero then.
        const ceiling = duration > 0 ? duration : Number.POSITIVE_INFINITY;

        callbacks.current.onSeek(Math.min(ceiling, Math.max(0, target_)));
        return;
      }

      if (event.key === "Delete" || event.key === "Backspace") {
        // Deletes whichever segment is selected, wherever it was selected from —
        // a clip on the timeline and a rail in the transcript both write the same
        // `selectedSegmentIds`, so one handler serves both surfaces. Undoable,
        // because it goes through the store like every other document edit.
        const { selectedSegmentIds } = store.getState();
        if (selectedSegmentIds.length === 0) return;

        event.preventDefault();
        // Clears the whole selection, so a Shift-picked batch goes in one go.
        for (const id of selectedSegmentIds) actions.deleteSegment(id);
        return;
      }

      if (event.key === "Escape") {
        actions.setActiveSpeaker(null);
        actions.selectSegment(null);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [actions, enabled, store]);
}
