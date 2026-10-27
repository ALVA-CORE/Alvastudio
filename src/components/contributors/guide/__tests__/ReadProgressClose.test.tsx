import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ReadProgressClose } from "@/components/contributors/guide/ReadProgressClose";

describe("ReadProgressClose", () => {
  /* The bug this had: at zero the track was drawn in `alva-border` with no
     arc, which on a dark card is nothing at all. The button was there and
     invisible, and the only thing anybody could tell was that the X had
     gone missing. It has to read as a control before it reads as a meter. */
  it("is on screen and named even at zero", () => {
    render(<ReadProgressClose progress={0} onClose={() => {}} />);

    const button = screen.getByRole("button", {
      name: /Read to the end to close, 0% done/,
    });
    expect(button).toBeInTheDocument();
    expect(button).toBeDisabled();
  });

  it("says how far through it is", () => {
    render(<ReadProgressClose progress={0.42} onClose={() => {}} />);
    expect(
      screen.getByRole("button", { name: /42% done/ })
    ).toBeInTheDocument();
  });

  it("becomes a working close once the ring is full", async () => {
    const onClose = vi.fn();
    render(<ReadProgressClose progress={1} onClose={onClose} />);

    const button = screen.getByRole("button", { name: "Close" });
    expect(button).toBeEnabled();

    await userEvent.click(button);
    expect(onClose).toHaveBeenCalledOnce();
  });

  /* A fraction over or under, from rounding or a rubber-band scroll, must
     not produce a ring drawn outside its own circumference. */
  it("clamps a value outside 0 to 1", () => {
    render(<ReadProgressClose progress={1.4} onClose={() => {}} />);
    expect(screen.getByRole("button", { name: "Close" })).toBeEnabled();
  });
});
