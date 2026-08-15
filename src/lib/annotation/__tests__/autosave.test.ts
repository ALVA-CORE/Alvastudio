import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  DEFAULT_AUTOSAVE_DELAY,
  SAVE_STATUS_LABELS,
  createAutosaveController,
  type AutosaveController,
  type AutosaveOptions,
} from "../autosave";
import type { SaveStatus } from "../types";

/**
 * The controller is driven entirely by timers and promises, so every test here
 * runs on fake timers. Two rules keep this suite honest:
 *
 *  - advance with `advanceTimersByTimeAsync`, never the sync variant: the
 *    controller's status transitions happen in promise continuations, and the
 *    async variant yields a real macrotask between timer jobs so those
 *    continuations actually run.
 *  - every controller is registered and destroyed in afterEach — each one
 *    attaches a window "online" listener, and a leaked listener would let an
 *    earlier test's controller react to a later test's event.
 */

const DELAY = 1000;

let controllers: AutosaveController[] = [];

function makeController(overrides: Partial<AutosaveOptions> = {}) {
  const statuses: SaveStatus[] = [];
  const save = overrides.save ?? vi.fn<() => Promise<void>>().mockResolvedValue(undefined);
  const onStatus = vi.fn<AutosaveOptions["onStatus"]>((status) => {
    statuses.push(status);
  });

  const controller = createAutosaveController({
    delay: DELAY,
    isOnline: () => true,
    now: () => 1_700_000,
    ...overrides,
    save,
    onStatus,
  });

  controllers.push(controller);
  return { controller, save: save as ReturnType<typeof vi.fn>, onStatus, statuses };
}

/** A save whose settlement the test controls, for in-flight assertions. */
function deferredSave() {
  const settlers: { resolve: () => void; reject: (reason: unknown) => void }[] = [];
  const save = vi.fn<() => Promise<void>>(
    () =>
      new Promise<void>((resolve, reject) => {
        settlers.push({ resolve, reject });
      })
  );
  return { save, settlers };
}

/**
 * Drains the microtask queue. Fake timers freeze the clock but not promises, so
 * advancing by zero yields to the real event loop and lets every queued
 * continuation run.
 */
async function settle() {
  await vi.advanceTimersByTimeAsync(0);
}

beforeEach(() => {
  vi.useFakeTimers();
  controllers = [];
});

afterEach(() => {
  controllers.forEach((controller) => controller.destroy());
  controllers = [];
  vi.useRealTimers();
});

describe("schedule", () => {
  it("goes dirty immediately, then saving, then saved", async () => {
    const { controller, save, statuses } = makeController();

    controller.schedule();
    expect(controller.getStatus()).toBe("dirty");
    expect(save).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(DELAY);

    expect(save).toHaveBeenCalledTimes(1);
    expect(controller.getStatus()).toBe("saved");
    expect(statuses).toEqual(["dirty", "saving", "saved"]);
  });

  it("does not fire before the delay elapses", async () => {
    const { controller, save } = makeController();

    controller.schedule();
    await vi.advanceTimersByTimeAsync(DELAY - 1);
    expect(save).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);
    expect(save).toHaveBeenCalledTimes(1);
  });

  it("debounces a burst into a single save", async () => {
    const { controller, save, statuses } = makeController();

    controller.schedule();
    await vi.advanceTimersByTimeAsync(400);
    controller.schedule();
    await vi.advanceTimersByTimeAsync(400);
    controller.schedule();
    await vi.advanceTimersByTimeAsync(400);

    // 1200ms of wall clock, but the window restarted twice.
    expect(save).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(600);

    expect(save).toHaveBeenCalledTimes(1);
    expect(statuses).toEqual(["dirty", "dirty", "dirty", "saving", "saved"]);
  });

  it("re-arms after a completed save", async () => {
    const { controller, save } = makeController();

    controller.schedule();
    await vi.advanceTimersByTimeAsync(DELAY);
    controller.schedule();
    await vi.advanceTimersByTimeAsync(DELAY);

    expect(save).toHaveBeenCalledTimes(2);
    expect(controller.getStatus()).toBe("saved");
  });

  it("defaults to DEFAULT_AUTOSAVE_DELAY", async () => {
    const save = vi.fn<() => Promise<void>>().mockResolvedValue(undefined);
    const { controller } = makeController({ delay: undefined, save });

    controller.schedule();
    await vi.advanceTimersByTimeAsync(DEFAULT_AUTOSAVE_DELAY - 1);
    expect(save).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);
    expect(save).toHaveBeenCalledTimes(1);
  });
});

describe("flush", () => {
  it("saves immediately, bypassing the debounce", async () => {
    const { controller, save, statuses } = makeController();

    controller.schedule();
    await controller.flush();

    expect(save).toHaveBeenCalledTimes(1);
    expect(controller.getStatus()).toBe("saved");
    expect(statuses).toEqual(["dirty", "saving", "saved"]);

    // The pending debounce was dropped, not merely pre-empted.
    await vi.advanceTimersByTimeAsync(DELAY * 5);
    expect(save).toHaveBeenCalledTimes(1);
  });

  it("resolves only once the write has settled", async () => {
    const { save, settlers } = deferredSave();
    const { controller } = makeController({ save });

    let resolved = false;
    const pending = controller.flush().then(() => {
      resolved = true;
    });

    await settle();
    expect(save).toHaveBeenCalledTimes(1);
    expect(resolved).toBe(false);

    settlers[0].resolve();
    await pending;

    expect(resolved).toBe(true);
    expect(controller.getStatus()).toBe("saved");
  });

  it("joins an in-flight write instead of starting a second one", async () => {
    const { save, settlers } = deferredSave();
    const { controller } = makeController({ save });

    controller.schedule();
    await vi.advanceTimersByTimeAsync(DELAY);
    expect(save).toHaveBeenCalledTimes(1);

    const joined = controller.flush();
    await settle();

    // Two concurrent writes of the same document would race on the server.
    expect(save).toHaveBeenCalledTimes(1);

    settlers[0].resolve();
    await joined;
    await settle();

    // The flush counts as an edit that arrived mid-write, so a follow-up
    // cycle opens to persist whatever prompted it.
    expect(controller.getStatus()).toBe("dirty");
    await vi.advanceTimersByTimeAsync(DELAY);
    expect(save).toHaveBeenCalledTimes(2);
  });

  it("saves even with nothing scheduled", async () => {
    const { controller, save } = makeController();

    await controller.flush();

    expect(save).toHaveBeenCalledTimes(1);
  });
});

describe("cancel", () => {
  it("drops the pending save without changing status", async () => {
    const { controller, save } = makeController();

    controller.schedule();
    controller.cancel();
    await vi.advanceTimersByTimeAsync(DELAY * 10);

    expect(save).not.toHaveBeenCalled();
    // Still dirty — the edits exist, they are just no longer queued.
    expect(controller.getStatus()).toBe("dirty");
  });

  it("is safe to call with nothing pending", async () => {
    const { controller, onStatus } = makeController();

    controller.cancel();
    controller.cancel();

    expect(onStatus).not.toHaveBeenCalled();
  });
});

describe("in-flight coalescing", () => {
  it("re-saves once the in-flight write settles", async () => {
    const { save, settlers } = deferredSave();
    const { controller, statuses } = makeController({ save });

    controller.schedule();
    await vi.advanceTimersByTimeAsync(DELAY);

    expect(save).toHaveBeenCalledTimes(1);
    expect(controller.getStatus()).toBe("saving");

    // Edit lands mid-write. Status stays "saving" — there is no useful UI
    // difference, and the flag is what matters.
    controller.schedule();
    expect(controller.getStatus()).toBe("saving");
    expect(save).toHaveBeenCalledTimes(1);

    settlers[0].resolve();
    await settle();

    // The just-written snapshot is already stale, so a fresh cycle opens.
    expect(controller.getStatus()).toBe("dirty");

    await vi.advanceTimersByTimeAsync(DELAY);
    expect(save).toHaveBeenCalledTimes(2);

    settlers[1].resolve();
    await settle();

    expect(controller.getStatus()).toBe("saved");
    expect(statuses).toEqual(["dirty", "saving", "saved", "dirty", "saving", "saved"]);
  });

  it("collapses several mid-write edits into a single follow-up save", async () => {
    const { save, settlers } = deferredSave();
    const { controller } = makeController({ save });

    controller.schedule();
    await vi.advanceTimersByTimeAsync(DELAY);

    controller.schedule();
    controller.schedule();
    controller.schedule();

    settlers[0].resolve();
    await settle();
    await vi.advanceTimersByTimeAsync(DELAY);

    expect(save).toHaveBeenCalledTimes(2);
  });

  it("does not re-save when nothing changed during the write", async () => {
    const { save, settlers } = deferredSave();
    const { controller } = makeController({ save });

    controller.schedule();
    await vi.advanceTimersByTimeAsync(DELAY);
    settlers[0].resolve();
    await settle();
    await vi.advanceTimersByTimeAsync(DELAY * 5);

    expect(save).toHaveBeenCalledTimes(1);
  });
});

describe("offline", () => {
  it("parks the write instead of calling save", async () => {
    const { controller, save, statuses } = makeController({ isOnline: () => false });

    controller.schedule();
    await vi.advanceTimersByTimeAsync(DELAY);

    expect(save).not.toHaveBeenCalled();
    expect(controller.getStatus()).toBe("offline");
    expect(statuses).toEqual(["dirty", "offline"]);
  });

  it("re-arms and saves when connectivity returns", async () => {
    let online = false;
    const { controller, save, statuses } = makeController({ isOnline: () => online });

    controller.schedule();
    await vi.advanceTimersByTimeAsync(DELAY);
    expect(controller.getStatus()).toBe("offline");

    online = true;
    window.dispatchEvent(new Event("online"));

    expect(controller.getStatus()).toBe("dirty");

    await vi.advanceTimersByTimeAsync(DELAY);

    expect(save).toHaveBeenCalledTimes(1);
    expect(controller.getStatus()).toBe("saved");
    expect(statuses).toEqual(["dirty", "offline", "dirty", "saving", "saved"]);
  });

  it("ignores an online event when it was never parked", async () => {
    const { controller, save, onStatus } = makeController();

    window.dispatchEvent(new Event("online"));

    expect(onStatus).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(DELAY * 5);
    expect(save).not.toHaveBeenCalled();
  });

  it("parks a flush too", async () => {
    const { controller, save } = makeController({ isOnline: () => false });

    await controller.flush();

    expect(save).not.toHaveBeenCalled();
    expect(controller.getStatus()).toBe("offline");
  });
});

describe("retry", () => {
  const RETRY_DELAY = 800;

  it("retries with exponential backoff up to maxRetries, then settles on error", async () => {
    const failure = new Error("network down");
    const save = vi.fn<() => Promise<void>>().mockRejectedValue(failure);
    const { controller, statuses } = makeController({
      save,
      maxRetries: 3,
      retryDelay: RETRY_DELAY,
    });

    controller.schedule();
    await vi.advanceTimersByTimeAsync(DELAY);

    expect(save).toHaveBeenCalledTimes(1);
    expect(controller.getStatus()).toBe("error");
    expect(controller.getMeta().attempt).toBe(1);
    expect(controller.getMeta().error).toBe(failure);

    // Backoff doubles per attempt: 800, 1600, 3200.
    for (const [attempt, backoff] of [
      [2, 800],
      [3, 1600],
      [4, 3200],
    ] as const) {
      await vi.advanceTimersByTimeAsync(backoff - 1);
      expect(save).toHaveBeenCalledTimes(attempt - 1);

      await vi.advanceTimersByTimeAsync(1);
      expect(save).toHaveBeenCalledTimes(attempt);
    }

    // Four calls total: the original plus three retries.
    expect(save).toHaveBeenCalledTimes(4);
    expect(controller.getMeta().attempt).toBe(4);
    expect(controller.getStatus()).toBe("error");

    // And it gives up rather than looping forever.
    await vi.advanceTimersByTimeAsync(60_000);
    expect(save).toHaveBeenCalledTimes(4);
    expect(controller.getStatus()).toBe("error");
    expect(statuses.filter((s) => s === "error")).toHaveLength(4);
  });

  it("honours maxRetries: 0 by failing once", async () => {
    const save = vi.fn<() => Promise<void>>().mockRejectedValue(new Error("nope"));
    const { controller } = makeController({ save, maxRetries: 0, retryDelay: RETRY_DELAY });

    controller.schedule();
    await vi.advanceTimersByTimeAsync(DELAY);
    await vi.advanceTimersByTimeAsync(60_000);

    expect(save).toHaveBeenCalledTimes(1);
    expect(controller.getStatus()).toBe("error");
    expect(controller.getMeta().attempt).toBe(1);
  });

  it("clears the error and resets the attempt count on a later success", async () => {
    const save = vi
      .fn<() => Promise<void>>()
      .mockRejectedValueOnce(new Error("flaky"))
      .mockResolvedValue(undefined);
    const { controller } = makeController({ save, maxRetries: 3, retryDelay: RETRY_DELAY });

    controller.schedule();
    await vi.advanceTimersByTimeAsync(DELAY);
    expect(controller.getStatus()).toBe("error");

    await vi.advanceTimersByTimeAsync(RETRY_DELAY);

    expect(save).toHaveBeenCalledTimes(2);
    expect(controller.getStatus()).toBe("saved");
    expect(controller.getMeta().attempt).toBe(0);
    expect(controller.getMeta().error).toBeNull();
  });

  it("wraps a non-Error rejection", async () => {
    const save = vi.fn<() => Promise<void>>().mockRejectedValue("just a string");
    const { controller } = makeController({ save, maxRetries: 0 });

    controller.schedule();
    await vi.advanceTimersByTimeAsync(DELAY);

    expect(controller.getMeta().error).toBeInstanceOf(Error);
    expect(controller.getMeta().error?.message).toBe("just a string");
  });
});

describe("destroy", () => {
  it("stops pending timers, status callbacks and further saves", async () => {
    const { controller, save, onStatus } = makeController();

    controller.schedule();
    const callsBefore = onStatus.mock.calls.length;

    controller.destroy();
    await vi.advanceTimersByTimeAsync(DELAY * 10);

    expect(save).not.toHaveBeenCalled();

    controller.schedule();
    await controller.flush();
    window.dispatchEvent(new Event("online"));
    await vi.advanceTimersByTimeAsync(DELAY * 10);

    expect(save).not.toHaveBeenCalled();
    expect(onStatus.mock.calls.length).toBe(callsBefore);
  });

  it("swallows the status of a write that was already in flight", async () => {
    const { save, settlers } = deferredSave();
    const { controller, onStatus } = makeController({ save });

    controller.schedule();
    await vi.advanceTimersByTimeAsync(DELAY);
    expect(controller.getStatus()).toBe("saving");

    controller.destroy();
    const callsBefore = onStatus.mock.calls.length;

    settlers[0].resolve();
    await settle();

    // The component unmounted mid-write; reporting "saved" into a dead
    // subscriber is exactly the setState-after-unmount class of bug.
    expect(onStatus.mock.calls.length).toBe(callsBefore);
    expect(controller.getStatus()).toBe("saving");
  });

  it("does not retry after being destroyed", async () => {
    const save = vi.fn<() => Promise<void>>().mockRejectedValue(new Error("boom"));
    const { controller } = makeController({ save, maxRetries: 3, retryDelay: 800 });

    controller.schedule();
    await vi.advanceTimersByTimeAsync(DELAY);
    expect(save).toHaveBeenCalledTimes(1);

    controller.destroy();
    await vi.advanceTimersByTimeAsync(60_000);

    expect(save).toHaveBeenCalledTimes(1);
  });

  it("is idempotent", () => {
    const { controller } = makeController();

    expect(() => {
      controller.destroy();
      controller.destroy();
    }).not.toThrow();
  });
});

describe("meta", () => {
  it("stamps savedAt from the injected clock", async () => {
    const now = vi.fn(() => 42_000);
    const { controller } = makeController({ now });

    expect(controller.getMeta()).toEqual({ savedAt: null, error: null, attempt: 0 });

    controller.schedule();
    await vi.advanceTimersByTimeAsync(DELAY);

    expect(controller.getMeta().savedAt).toBe(42_000);
    expect(now).toHaveBeenCalled();
  });

  it("passes the same meta object to onStatus that getMeta returns", async () => {
    const { controller, onStatus } = makeController();

    controller.schedule();
    await vi.advanceTimersByTimeAsync(DELAY);

    const lastCall = onStatus.mock.calls.at(-1)!;
    expect(lastCall[0]).toBe("saved");
    expect(lastCall[1]).toEqual(controller.getMeta());
  });
});

describe("SAVE_STATUS_LABELS", () => {
  it("has copy for every status the machine can reach", () => {
    const statuses: SaveStatus[] = [
      "idle",
      "dirty",
      "saving",
      "saved",
      "error",
      "offline",
    ];

    for (const status of statuses) {
      expect(SAVE_STATUS_LABELS[status]).toBeTruthy();
    }
  });
});
