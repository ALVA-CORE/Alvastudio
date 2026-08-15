/**
 * Generic snapshot history.
 *
 * Snapshots rather than inverse-commands: a transcript document is small enough
 * that structural sharing makes a snapshot nearly free, and it removes the
 * entire class of bug where an inverse operation drifts out of sync with its
 * forward operation. The cap keeps memory bounded on long sessions.
 *
 * Coalescing is explicit rather than time-based. Typing into one segment emits a
 * commit per keystroke with the same key, and consecutive same-key commits
 * collapse into one undo step — so Ctrl+Z rewinds a whole edit, not a letter.
 * Keying on the *target* rather than a timer means moving to a different segment
 * always starts a new step, however fast the annotator types.
 */

export type History<T> = {
  past: T[];
  present: T;
  future: T[];
  /** Coalescing key of the commit that produced `present`. */
  lastKey: string | null;
};

export const HISTORY_LIMIT = 100;

export function createHistory<T>(present: T): History<T> {
  return { past: [], present, future: [], lastKey: null };
}

export type CommitOptions = {
  /**
   * Groups consecutive commits. Two commits with the same non-null key collapse
   * into a single undo step. Pass a fresh key (or none) to force a new step.
   */
  key?: string;
  limit?: number;
};

/**
 * Records a new present. Always clears the redo stack — branching history is a
 * feature nobody asked for and a source of confusing UX.
 */
export function commit<T>(
  history: History<T>,
  next: T,
  { key, limit = HISTORY_LIMIT }: CommitOptions = {}
): History<T> {
  if (Object.is(next, history.present)) return history;

  // Same key as last time — replace the present, do not deepen the stack.
  if (key != null && key === history.lastKey) {
    return { ...history, present: next, future: [] };
  }

  const past = [...history.past, history.present];
  // Drop the oldest entries once past the cap.
  const trimmed = past.length > limit ? past.slice(past.length - limit) : past;

  return { past: trimmed, present: next, future: [], lastKey: key ?? null };
}

export function canUndo<T>(history: History<T>): boolean {
  return history.past.length > 0;
}

export function canRedo<T>(history: History<T>): boolean {
  return history.future.length > 0;
}

export function undo<T>(history: History<T>): History<T> {
  if (!canUndo(history)) return history;

  const previous = history.past[history.past.length - 1];

  return {
    past: history.past.slice(0, -1),
    present: previous,
    future: [history.present, ...history.future],
    // Cleared so the next edit always opens a fresh step rather than
    // coalescing into the step just undone.
    lastKey: null,
  };
}

export function redo<T>(history: History<T>): History<T> {
  if (!canRedo(history)) return history;

  const [next, ...rest] = history.future;

  return {
    past: [...history.past, history.present],
    present: next,
    future: rest,
    lastKey: null,
  };
}

/**
 * Replaces `present` without touching either stack. For reconciling state the
 * user did not author — a server merge, or a reload — where an undo step would
 * be misleading.
 */
export function replacePresent<T>(history: History<T>, present: T): History<T> {
  return { ...history, present, lastKey: null };
}

/** Discards all history, keeping the current present. Used when loading a doc. */
export function resetHistory<T>(history: History<T>): History<T> {
  return createHistory(history.present);
}
