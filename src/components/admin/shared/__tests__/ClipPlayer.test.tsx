import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const refreshAudioLink = vi.fn();
vi.mock("@/lib/api/client", () => ({ refreshAudioLink: (url: string) => refreshAudioLink(url) }));

const { ClipPlayer } = await import("../ClipPlayer");

describe("ClipPlayer", () => {
  /* A link expires; the player asks for a fresh one, once. */
  it("swaps a link that stopped working for a fresh one", async () => {
    refreshAudioLink.mockResolvedValueOnce("https://api.test/media/fresh");
    const { container } = render(<ClipPlayer src="https://api.test/media/old" />);
    const audio = container.querySelector("audio")!;

    fireEvent.error(audio);
    expect(refreshAudioLink).toHaveBeenCalledWith("https://api.test/media/old");
    await vi.waitFor(() => expect(audio.getAttribute("src")).toBe("https://api.test/media/fresh"));

    /* The fresh one failing too is a real failure: no second refresh. */
    fireEvent.error(audio);
    expect(refreshAudioLink).toHaveBeenCalledTimes(1);
  });
});
