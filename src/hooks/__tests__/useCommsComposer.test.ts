import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const create = vi.fn();
const sendTestEmail = vi.fn();
vi.mock("@/lib/api/communications", () => ({
  createCommunication: (draft: unknown) => create(draft),
  updateCommunication: vi.fn(),
  previewCommunication: vi.fn(async () => ({
    revision: 1,
    recipient_count: 3,
    unavailable_recipient_count: 0,
    email_available: true,
  })),
  sendCommunication: vi.fn(),
  sendTestEmail: (id: string) => sendTestEmail(id),
}));

const { useCommsComposer } = await import("../useCommsComposer");

async function prepared(edit: (set: ReturnType<typeof useCommsComposer>["set"]) => void) {
  const { result } = renderHook(() => useCommsComposer());
  act(() => {
    result.current.set("header", "Update");
    result.current.set("body", "Read it.");
    edit(result.current.set);
  });
  await act(() => result.current.prepare());
  return create.mock.calls.at(-1)?.[0];
}

describe("useCommsComposer", () => {
  beforeEach(() => create.mockReset().mockResolvedValue({ id: "m1", revision: 1 }));

  /* Left as written out, the button is the default one: nothing custom sent. */
  it("sends no button when the defaults are untouched", async () => {
    const draft = await prepared(() => undefined);
    expect(draft).not.toHaveProperty("action_label");
    expect(draft).not.toHaveProperty("action_url");
  });

  /* New words on the studio link: the API needs both, so the link goes too. */
  it("sends new words with the default link", async () => {
    const draft = await prepared((set) => set("button", "Read the guidance"));
    expect(draft).toMatchObject({
      action_label: "Read the guidance",
      action_url: "https://studio.alvacoreai.com/",
    });
  });

  it("sends a new link with the default words", async () => {
    const draft = await prepared((set) => set("link", "https://alvacoreai.com/guide"));
    expect(draft).toMatchObject({
      action_label: "Open Alva Studio",
      action_url: "https://alvacoreai.com/guide",
    });
  });

  /* The test goes to a saved draft, so it saves first, and sends nothing to
     anybody else. */
  it("saves the draft and sends the test to its id", async () => {
    sendTestEmail.mockResolvedValue({ sent_to: "me@example.com", kind: "communication", subject: "[Test] Update" });
    const { result } = renderHook(() => useCommsComposer());
    act(() => {
      result.current.set("header", "Update");
      result.current.set("body", "Read it.");
    });
    let sentTo: string | undefined;
    await act(async () => {
      sentTo = await result.current.sendTest();
    });
    expect(create).toHaveBeenCalledTimes(1);
    expect(sendTestEmail).toHaveBeenCalledWith("m1");
    expect(sentTo).toBe("me@example.com");
  });
});
