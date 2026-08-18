import { describe, expect, it } from "vitest";

import {
  HISTORY_LIMIT,
  canRedo,
  canUndo,
  commit,
  createHistory,
  redo,
  replacePresent,
  resetHistory,
  undo,
  type History,
} from "../history";

/**
 * The history stack is generic, so these tests drive it with plain strings and
 * small objects rather than transcript documents — the coalescing and trimming
 * rules are what matter, and a document would only obscure them.
 */

/** Applies a sequence of commits, so the stack-shape assertions stay readable. */
function commitAll<T>(history: History<T>, values: T[], key?: string): History<T> {
  return values.reduce((acc, value) => commit(acc, value, { key }), history);
}

describe("createHistory", () => {
  it("starts with the present and nothing to undo or redo", () => {
    const history = createHistory("a");

    expect(history).toEqual({ past: [], present: "a", future: [], lastKey: null });
    expect(canUndo(history)).toBe(false);
    expect(canRedo(history)).toBe(false);
  });
});

describe("commit", () => {
  it("pushes the old present onto the past", () => {
    const history = commit(createHistory("a"), "b");

    expect(history.past).toEqual(["a"]);
    expect(history.present).toBe("b");
    expect(canUndo(history)).toBe(true);
  });

  it("clears the redo stack — history never branches", () => {
    const branched = commit(undo(commitAll(createHistory("a"), ["b", "c"])), "d");

    expect(branched.future).toEqual([]);
    expect(canRedo(branched)).toBe(false);
    expect(branched.present).toBe("d");
    // "c" is gone for good; the undone-to "b" is what "d" branched from.
    expect(branched.past).toEqual(["a", "b"]);
  });

  it("is a no-op returning the SAME object when the present is unchanged", () => {
    const present = { text: "unchanged" };
    const history = createHistory(present);

    // Identity, not deep equality — callers skip work by comparing references.
    expect(commit(history, present)).toBe(history);
    expect(commit(history, present, { key: "k" })).toBe(history);
  });

  it("does commit a structurally equal but distinct object", () => {
    const history = createHistory({ text: "a" });
    const next = commit(history, { text: "a" });

    expect(next).not.toBe(history);
    expect(next.past).toHaveLength(1);
  });

  it("records the coalescing key on the resulting present", () => {
    expect(commit(createHistory("a"), "b", { key: "k" }).lastKey).toBe("k");
    expect(commit(createHistory("a"), "b").lastKey).toBeNull();
  });
});

describe("commit coalescing", () => {
  it("collapses consecutive commits with the same key into one undo step", () => {
    const history = commitAll(createHistory("a"), ["b", "c", "d"], "text:c1");

    expect(history.present).toBe("d");
    expect(history.past).toEqual(["a"]);
    expect(undo(history).present).toBe("a");
  });

  it("keeps the past array identity while coalescing", () => {
    // Cheap proof that a keystroke burst does not churn the stack.
    const first = commit(createHistory("a"), "b", { key: "k" });
    const second = commit(first, "c", { key: "k" });

    expect(second.past).toBe(first.past);
    expect(second.lastKey).toBe("k");
  });

  it("starts a new step when the key changes", () => {
    let history = commit(createHistory("a"), "b", { key: "text:c1" });
    history = commit(history, "c", { key: "text:c2" });

    expect(history.past).toEqual(["a", "b"]);
    expect(undo(history).present).toBe("b");
  });

  it("never coalesces when the key is omitted", () => {
    const history = commitAll(createHistory("a"), ["b", "c", "d"]);

    expect(history.past).toEqual(["a", "b", "c"]);
    expect(history.lastKey).toBeNull();
  });

  it("does not coalesce an unkeyed commit into a keyed one", () => {
    let history = commit(createHistory("a"), "b", { key: "k" });
    history = commit(history, "c");

    expect(history.past).toEqual(["a", "b"]);
    expect(history.lastKey).toBeNull();
  });

  it("clears the redo stack even while coalescing", () => {
    let history = commit(createHistory("a"), "b", { key: "k" });
    history = undo(history);
    history = commit(history, "c", { key: "k" });
    // undo() cleared lastKey, so this opened a fresh step and dropped the redo.
    expect(history.future).toEqual([]);
  });
});

describe("undo / redo", () => {
  it("round-trips exact values", () => {
    const a = { v: 1 };
    const b = { v: 2 };
    const c = { v: 3 };
    const history = commitAll(createHistory(a), [b, c]);

    const once = undo(history);
    expect(once.present).toBe(b);
    expect(once.future).toEqual([c]);

    const twice = undo(once);
    expect(twice.present).toBe(a);
    expect(twice.past).toEqual([]);
    expect(twice.future).toEqual([b, c]);

    expect(redo(twice).present).toBe(b);
    expect(redo(redo(twice)).present).toBe(c);
    expect(redo(redo(twice))).toEqual(history);
  });

  it("is a no-op returning the SAME object at the bottom of the stack", () => {
    const history = createHistory("a");

    expect(undo(history)).toBe(history);
    expect(canUndo(history)).toBe(false);
  });

  it("is a no-op returning the SAME object at the top of the stack", () => {
    const history = commit(createHistory("a"), "b");

    expect(redo(history)).toBe(history);
    expect(canRedo(history)).toBe(false);
  });

  it("clears lastKey on undo, so the next edit cannot merge into the undone step", () => {
    // Regression guard: if undo left lastKey set, typing straight after Ctrl+Z
    // would overwrite the restored value in place and make the undo
    // unrepeatable.
    let history = commit(createHistory("a"), "b", { key: "k" });
    history = undo(history);

    expect(history.lastKey).toBeNull();
    expect(history.present).toBe("a");

    history = commit(history, "c", { key: "k" });

    expect(history.past).toEqual(["a"]);
    expect(undo(history).present).toBe("a");
  });

  it("clears lastKey on redo for the same reason", () => {
    let history = commit(createHistory("a"), "b", { key: "k" });
    history = redo(undo(history));

    expect(history.lastKey).toBeNull();

    history = commit(history, "c", { key: "k" });

    expect(history.past).toEqual(["a", "b"]);
  });

  it("survives an undo/redo/commit interleave", () => {
    let history = commitAll(createHistory("a"), ["b", "c", "d"]);
    history = undo(undo(history));
    expect(history.present).toBe("b");

    history = redo(history);
    expect(history.present).toBe("c");

    history = commit(history, "e");
    expect(history.present).toBe("e");
    expect(history.past).toEqual(["a", "b", "c"]);
    expect(history.future).toEqual([]);
  });
});

describe("HISTORY_LIMIT", () => {
  it("caps the past and drops the OLDEST entries", () => {
    const values = Array.from({ length: HISTORY_LIMIT + 10 }, (_, i) => i + 1);
    const history = commitAll(createHistory(0), values);

    expect(history.past).toHaveLength(HISTORY_LIMIT);
    expect(history.present).toBe(HISTORY_LIMIT + 10);
    // Entries 0..9 fell off the bottom; the newest are untouched.
    expect(history.past[0]).toBe(10);
    expect(history.past[HISTORY_LIMIT - 1]).toBe(HISTORY_LIMIT + 9);
  });

  it("still allows exactly `limit` undos after overflowing", () => {
    // An explicit small limit keeps the loop readable.
    let history = createHistory(0);
    for (const value of [1, 2, 3, 4, 5]) history = commit(history, value, { limit: 3 });

    expect(history.past).toEqual([2, 3, 4]);

    let steps = 0;
    while (canUndo(history)) {
      history = undo(history);
      steps += 1;
    }

    expect(steps).toBe(3);
    expect(history.present).toBe(2);
  });

  it("honours an explicit limit of 0 by keeping nothing undoable", () => {
    const history = commit(createHistory("a"), "b", { limit: 0 });

    expect(history.past).toEqual([]);
    expect(canUndo(history)).toBe(false);
  });
});

describe("replacePresent", () => {
  it("swaps the present without touching either stack", () => {
    const history = undo(commitAll(createHistory("a"), ["b", "c"]));
    const replaced = replacePresent(history, "server");

    expect(replaced.present).toBe("server");
    expect(replaced.past).toBe(history.past);
    expect(replaced.future).toBe(history.future);
    expect(canUndo(replaced)).toBe(true);
    expect(canRedo(replaced)).toBe(true);
  });

  it("clears lastKey so the next edit opens its own step", () => {
    const history = commit(createHistory("a"), "b", { key: "k" });

    expect(replacePresent(history, "server").lastKey).toBeNull();
  });
});

describe("resetHistory", () => {
  it("discards both stacks and keeps the present", () => {
    const history = undo(commitAll(createHistory("a"), ["b", "c"]));
    const reset = resetHistory(history);

    expect(reset).toEqual({ past: [], present: history.present, future: [], lastKey: null });
    expect(canUndo(reset)).toBe(false);
    expect(canRedo(reset)).toBe(false);
  });
});
