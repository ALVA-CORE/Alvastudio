import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TextureButton } from "../texture-button";

describe("TextureButton loading", () => {
  it("shows the spinner and keeps the label", () => {
    render(<TextureButton loading>Sign in</TextureButton>);

    const button = screen.getByRole("button", { name: "Sign in" });
    expect(button).toHaveAttribute("aria-busy", "true");
    expect(button.querySelector("svg.animate-spin")).toBeInTheDocument();
  });

  it("has no spinner and no aria-busy when idle", () => {
    render(<TextureButton>Sign in</TextureButton>);

    const button = screen.getByRole("button", { name: "Sign in" });
    expect(button).not.toHaveAttribute("aria-busy");
    expect(button.querySelector("svg.animate-spin")).not.toBeInTheDocument();
  });

  /* The whole point of the flag: a second click must not fire a second request. */
  it("blocks clicks while loading", async () => {
    const onClick = vi.fn();
    render(
      <TextureButton loading onClick={onClick}>
        Save
      </TextureButton>
    );

    const button = screen.getByRole("button", { name: "Save" });
    expect(button).toBeDisabled();
    await userEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("stays disabled when disabled is set on its own", () => {
    render(<TextureButton disabled>Save</TextureButton>);
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
  });

  /* The spinner is decorative — the button's own name is the label, so a
   * screen reader should not read "Loading" on top of it. */
  it("does not add the spinner to the accessible name", () => {
    render(<TextureButton loading>Claim next session</TextureButton>);
    expect(
      screen.getByRole("button", { name: "Claim next session" })
    ).toBeInTheDocument();
  });
});
