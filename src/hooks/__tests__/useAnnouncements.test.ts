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

const { EMPTY_ANNOUNCEMENT, formProblem, toBody, useAnnouncementComposer } = await import(
  "../useAnnouncements"
);

const form = (over: Partial<typeof EMPTY_ANNOUNCEMENT>) => ({
  ...EMPTY_ANNOUNCEMENT,
  title: "Studio closed Monday",
  body: "Line one\nLine two",
  ...over,
});

describe("toBody", () => {
  /* An empty list is a 422: nothing chosen is left out, which is everybody. */
  it("never sends an empty list", () => {
    expect(toBody(form({})).audience).toEqual({});
    expect(toBody(form({ roles: ["intern", "contributor"], approved: "waiting" })).audience).toEqual({
      roles: ["contributor", "intern"],
      approved: false,
    });
  });

  it("sets or clears the button and link together", () => {
    expect(toBody(form({ actionLabel: "Open", actionUrl: "/contributor/studio" }))).toMatchObject({
      action_label: "Open",
      action_url: "/contributor/studio",
    });
    expect(toBody(form({ actionLabel: "Open" }))).toMatchObject({ action_label: null, action_url: null });
  });
});

describe("formProblem", () => {
  it("asks for both the button and the link, or neither", () => {
    expect(formProblem(form({ actionLabel: "Open" }))).toMatch(/both/);
    expect(formProblem(form({ actionLabel: "Open", actionUrl: "/contributor/studio" }))).toBeNull();
    expect(formProblem(form({ title: "" }))).toMatch(/title/);
  });
});

/* As email: the first press saves and shows who it reaches; the second sends. */
describe("useAnnouncementComposer", () => {
  beforeEach(() => {
    createAnnouncement.mockReset().mockResolvedValue({ id: "a1", recipient_count: 42 });
    updateAnnouncement.mockReset().mockResolvedValue({ id: "a1", recipient_count: 40 });
    sendAnnouncement.mockReset().mockResolvedValue({ id: "a1", recipient_count: 40, status: "sent" });
  });

  it("saves, shows the count, and changes the same draft after an edit", async () => {
    const { result } = renderHook(() => useAnnouncementComposer());
    act(() => {
      result.current.set("title", "Studio closed Monday");
      result.current.set("body", "We are closed.");
    });

    await act(() => result.current.prepare());
    expect(createAnnouncement).toHaveBeenCalledTimes(1);
    expect(result.current.stage).toEqual({ kind: "confirm", count: 42 });

    /* An edit after the count needs counting again, on the same draft. */
    act(() => result.current.set("roles", ["intern"]));
    expect(result.current.stage).toEqual({ kind: "idle" });
    await act(() => result.current.prepare());
    expect(updateAnnouncement).toHaveBeenCalledWith("a1", expect.objectContaining({ audience: { roles: ["intern"] } }));

    await act(async () => {
      await result.current.send();
    });
    expect(sendAnnouncement).toHaveBeenCalledWith("a1");
    expect(result.current.fields).toEqual(EMPTY_ANNOUNCEMENT);
  });
});
