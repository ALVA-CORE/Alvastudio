import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it, vi } from "vitest";

/**
 * public/sw.js is a plain worker script, so it is run here against a fake
 * `self` and its push handlers are called directly.
 */
const SOURCE = readFileSync(resolve(process.cwd(), "public/sw.js"), "utf8");
const ORIGIN = "https://studio.example";

type Handler = (event: Record<string, unknown>) => void;

function worker(windows: Array<Record<string, unknown>> = []) {
  const handlers: Record<string, Handler> = {};
  const self = {
    location: { origin: ORIGIN },
    addEventListener: (type: string, handler: Handler) => {
      handlers[type] = handler;
    },
    registration: { showNotification: vi.fn(async () => {}) },
    clients: {
      matchAll: vi.fn(async () => windows),
      openWindow: vi.fn(async () => null),
    },
  };
  new Function("self", "caches", SOURCE)(self, {});

  /* Runs a handler and waits for what it handed to waitUntil. */
  const fire = async (type: string, event: Record<string, unknown>) => {
    let work: Promise<unknown> = Promise.resolve();
    handlers[type]({ ...event, waitUntil: (promise: Promise<unknown>) => (work = promise) });
    await work;
  };
  return { self, fire };
}

const pushEvent = (payload: unknown) => ({ data: { json: () => payload } });
const clickEvent = (url: string) => ({ notification: { close: vi.fn(), data: { url, key: "k" } } });

describe("sw.js push", () => {
  it("shows the push with its key as tag and its url in data", async () => {
    const { self, fire } = worker();
    await fire("push", pushEvent({ title: "Recording approved", body: "Well done", url: "/contributor/notifications", key: "review:1" }));

    expect(self.registration.showNotification).toHaveBeenCalledWith("Recording approved", {
      body: "Well done",
      data: { url: "/contributor/notifications", key: "review:1" },
      tag: "review:1",
      icon: "/icons/icon-192.png",
    });
  });

  it("still shows something for a push it cannot read", async () => {
    const { self, fire } = worker();
    await fire("push", { data: { json: () => { throw new Error("not JSON"); } } });
    expect(self.registration.showNotification).toHaveBeenCalledWith("Alvastudio", expect.anything());
  });
});

describe("sw.js notificationclick", () => {
  it("focuses an open studio window and takes it to the url", async () => {
    const navigate = vi.fn(async () => null);
    const open = { url: `${ORIGIN}/intern/review`, focused: false, navigate, focus: vi.fn() };
    open.focus.mockResolvedValue(open);
    const { self, fire } = worker([open]);

    await fire("notificationclick", clickEvent("/intern/dashboard"));

    expect(open.focus).toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith(`${ORIGIN}/intern/dashboard`);
    expect(self.clients.openWindow).not.toHaveBeenCalled();
  });

  it("opens the url when no window is open, and never another site", async () => {
    const { self, fire } = worker();
    await fire("notificationclick", clickEvent("/annotator/dashboard"));
    expect(self.clients.openWindow).toHaveBeenCalledWith(`${ORIGIN}/annotator/dashboard`);

    await fire("notificationclick", clickEvent("https://evil.example/x"));
    expect(self.clients.openWindow).toHaveBeenLastCalledWith(`${ORIGIN}/`);
  });
});
