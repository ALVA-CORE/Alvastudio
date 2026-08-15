import type { SaveStatus } from "./types";

/**
 * Debounced autosave with an explicit status machine.
 *
 * Written as a plain controller rather than a hook so the whole lifecycle —
 * debounce, in-flight coalescing, offline hold, bounded retry — is testable
 * with fake timers and no renderer. The React layer only subscribes to
 * `onStatus`.
 *
 * The states it can be in:
 *
 *   idle ──schedule──▶ dirty ──(debounce)──▶ saving ──ok───▶ saved
 *                        ▲                     │
 *                        │                     ├─offline──▶ offline ──online──▶ dirty
 *                        └──edit during save───┘
 *                                              └─fail─────▶ error ──(backoff)──▶ saving
 */

export type AutosaveOptions = {
  /** Quiet period after the last edit before a write fires. */
  delay?: number;
  /** Performs the write. Rejecting drives the retry path. */
  save: () => Promise<void>;
  onStatus: (status: SaveStatus, meta: AutosaveMeta) => void;
  /** Overridable for tests; defaults to `navigator.onLine`. */
  isOnline?: () => boolean;
  now?: () => number;
  /** Attempts after the first failure before settling on `error`. */
  maxRetries?: number;
  /** First backoff step; doubles per attempt. */
  retryDelay?: number;
};

export type AutosaveMeta = {
  savedAt: number | null;
  error: Error | null;
  /** Failed attempts since the last success. */
  attempt: number;
};

export type AutosaveController = {
  /** Marks the document dirty and (re)starts the debounce. */
  schedule: () => void;
  /** Saves now, bypassing the debounce. Resolves when the write settles. */
  flush: () => Promise<void>;
  /** Drops a pending debounce without changing status. */
  cancel: () => void;
  /** Cancels everything and detaches listeners. */
  destroy: () => void;
  getStatus: () => SaveStatus;
  getMeta: () => AutosaveMeta;
};

export const DEFAULT_AUTOSAVE_DELAY = 1200;

export function createAutosaveController({
  delay = DEFAULT_AUTOSAVE_DELAY,
  save,
  onStatus,
  isOnline = () => (typeof navigator === "undefined" ? true : navigator.onLine),
  now = () => Date.now(),
  maxRetries = 3,
  retryDelay = 800,
}: AutosaveOptions): AutosaveController {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let status: SaveStatus = "idle";
  let meta: AutosaveMeta = { savedAt: null, error: null, attempt: 0 };
  let inFlight: Promise<void> | null = null;
  /** An edit landed while a write was in flight — save again once it settles. */
  let dirtyDuringSave = false;
  let destroyed = false;

  function setStatus(next: SaveStatus, patch: Partial<AutosaveMeta> = {}) {
    status = next;
    meta = { ...meta, ...patch };
    onStatus(status, meta);
  }

  function clearTimer() {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
  }

  async function run(): Promise<void> {
    if (destroyed) return;

    if (!isOnline()) {
      // Hold the edits — `handleOnline` re-arms the debounce.
      setStatus("offline");
      return;
    }

    if (inFlight) {
      dirtyDuringSave = true;
      return inFlight;
    }

    setStatus("saving");

    const attempt = (async () => {
      try {
        await save();
        if (destroyed) return;

        setStatus("saved", { savedAt: now(), error: null, attempt: 0 });
      } catch (error) {
        if (destroyed) return;

        const nextAttempt = meta.attempt + 1;
        const failure = error instanceof Error ? error : new Error(String(error));

        if (nextAttempt <= maxRetries) {
          setStatus("error", { error: failure, attempt: nextAttempt });
          // Exponential backoff, then try again.
          clearTimer();
          timer = setTimeout(() => {
            timer = null;
            void run();
          }, retryDelay * 2 ** (nextAttempt - 1));
          return;
        }

        setStatus("error", { error: failure, attempt: nextAttempt });
      } finally {
        inFlight = null;
      }
    })();

    inFlight = attempt;
    await attempt;

    // An edit arrived mid-write; the just-saved snapshot is already stale.
    if (dirtyDuringSave && !destroyed) {
      dirtyDuringSave = false;
      schedule();
    }
  }

  function schedule() {
    if (destroyed) return;

    if (inFlight) {
      dirtyDuringSave = true;
      return;
    }

    setStatus("dirty");
    clearTimer();
    timer = setTimeout(() => {
      timer = null;
      void run();
    }, delay);
  }

  async function flush() {
    if (destroyed) return;
    clearTimer();
    await run();
  }

  function handleOnline() {
    // Only re-arm if we actually parked edits.
    if (status === "offline") schedule();
  }

  if (typeof window !== "undefined") {
    window.addEventListener("online", handleOnline);
  }

  return {
    schedule,
    flush,
    cancel: clearTimer,
    destroy() {
      destroyed = true;
      clearTimer();
      if (typeof window !== "undefined") {
        window.removeEventListener("online", handleOnline);
      }
    },
    getStatus: () => status,
    getMeta: () => meta,
  };
}

/** Human-facing copy for each status. Single source so header and a11y agree. */
export const SAVE_STATUS_LABELS: Record<SaveStatus, string> = {
  idle: "All changes saved",
  dirty: "Unsaved changes",
  saving: "Saving…",
  saved: "Saved",
  error: "Save failed",
  offline: "Offline — changes held",
};
