import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const createAnnouncement = vi.fn();
const updateAnnouncement = vi.fn();
const sendAnnouncement = vi.fn();

vi.mock("@/lib/api/announcements", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/announcements")>()),
  createAnnouncement: (...args: unknown[]) => createAnnouncement(...args),
  updateAnnouncement: (...args: unknown[]) => updateAnnouncement(...args),
  sendAnnouncement: (...args: unknown[]) => sendAnnouncement(...args),
}));

const { EMPTY_ANNOUNCEMENT, formProblems, toCreate, toPatch, useAnnouncementComposer } = await import(
  "../useAnnouncements"
);

const form = (over: Partial<typeof EMPTY_ANNOUNCEMENT>) => ({
  ...EMPTY_ANNOUNCEMENT,
  title: "Studio closed Monday",
  body: "Line one\nLine two",
  ...over,
});

const saved = (over: Record<string, unknown> = {}) => ({
  id: "a1",
  title: "Studio closed Monday",
  body: "We are closed.",
  audience: {},
  action_label: null,
  action_url: null,
  expires_at: null,
  status: "draft",
  recipient_count: 42,
  read_count: 0,
  ...over,
});

describe("toCreate", () => {
  /* An empty list is a 422: nothing chosen is left out, which is everybody. */
  it("never sends an empty list", () => {
    expect(toCreate(form({})).audience).toBeUndefined();
    expect(
      toCreate(form({ roles: ["intern"], approved: "waiting", emails: "Ada@x.test\nada@x.test" })).audience
    ).toEqual({ roles: ["intern"], approved: false, emails: ["ada@x.test"] });
  });
});

describe("toPatch", () => {
  it("sends only what changed", () => {
    const before = form({});
    expect(toPatch(form({ title: "Studio open" }), before)).toEqual({ title: "Studio open" });
    expect(toPatch(before, before)).toEqual({});
  });
});

describe("formProblems", () => {
  it("asks for both the button and the link, and a future end", () => {
    expect(formProblems(form({ actionLabel: "Open" })).action_url).toMatch(/both/);
    expect(formProblems(form({ expiresAt: "2000-01-01T00:00" })).expires_at).toBeTruthy();
    expect(formProblems(form({}))).toEqual({});
  });
});

/* As email: the first press saves and shows who it reaches; the second sends. */
describe("useAnnouncementComposer", () => {
  beforeEach(() => {
    createAnnouncement.mockReset().mockResolvedValue(saved());
    updateAnnouncement.mockReset().mockResolvedValue(saved({ recipient_count: 40, audience: { roles: ["intern"] } }));
    sendAnnouncement.mockReset().mockResolvedValue(saved({ status: "sent", recipient_count: 40 }));
  });

  it("saves, shows the count, then patches only the change and sends", async () => {
    const { result } = renderHook(() => useAnnouncementComposer());
    act(() => {
      result.current.set("title", "Studio closed Monday");
      result.current.set("body", "We are closed.");
    });

    await act(() => result.current.prepare());
    expect(createAnnouncement).toHaveBeenCalledTimes(1);
    expect(result.current.stage).toEqual({ kind: "confirm", count: 42 });

    act(() => result.current.set("roles", ["intern"]));
    expect(result.current.stage).toEqual({ kind: "idle" });
    await act(() => result.current.prepare());
    expect(updateAnnouncement).toHaveBeenCalledWith("a1", { audience: { roles: ["intern"] } });

    await act(async () => {
      await result.current.send();
    });
    expect(sendAnnouncement).toHaveBeenCalledWith("a1");
    expect(result.current.fields).toEqual(EMPTY_ANNOUNCEMENT);
  });

  it("edits a saved draft instead of making a new one", async () => {
    const { result } = renderHook(() => useAnnouncementComposer());
    act(() => result.current.edit(saved() as never));
    expect(result.current.fields.title).toBe("Studio closed Monday");

    act(() => result.current.set("body", "We are open after all."));
    await act(async () => {
      await result.current.saveDraft();
    });
    expect(createAnnouncement).not.toHaveBeenCalled();
    expect(updateAnnouncement).toHaveBeenCalledWith("a1", { body: "We are open after all." });
    expect(result.current.draft).toBeNull();
  });
});
