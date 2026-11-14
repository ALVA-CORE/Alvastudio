import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { startPwa } from "@/lib/pwa";
import { InstallAppRow } from "../InstallAppRow";

startPwa();

/* Only offered where it can be done: never a row that leads nowhere. */
describe("InstallAppRow", () => {
  it("is not there in a browser that cannot install", () => {
    const { container } = render(<InstallAppRow />);
    expect(container).toBeEmptyDOMElement();
  });

  it("appears once the browser offers its prompt, and Install shows it", async () => {
    render(<InstallAppRow />);

    const prompt = vi.fn(async () => {});
    const event = Object.assign(new Event("beforeinstallprompt", { cancelable: true }), {
      prompt,
      userChoice: Promise.resolve({ outcome: "accepted" as const }),
    });
    act(() => {
      window.dispatchEvent(event);
    });

    await userEvent.click(screen.getByRole("button", { name: "Install the app" }));
    await userEvent.click(await screen.findByRole("button", { name: "Install" }));
    expect(prompt).toHaveBeenCalledTimes(1);
    expect(event.defaultPrevented).toBe(true);
  });
});
