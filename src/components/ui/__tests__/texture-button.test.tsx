import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TextureButton } from "../texture-button";

describe("TextureButton loading", () => {
  it("shows the orb and keeps the label", () => {
    render(<TextureButton loading>Sign in</TextureButton>);

    const button = screen.getByRole("button", { name: "Sign in" });
    expect(button).toHaveAttribute("aria-busy", "true");
    expect(button.querySelector("canvas")).toBeInTheDocument();
  });

  it("has no orb and no aria-busy when idle", () => {
    render(<TextureButton>Sign in</TextureButton>);

    const button = screen.getByRole("button", { name: "Sign in" });
    expect(button).not.toHaveAttribute("aria-busy");
    expect(button.querySelector("canvas")).not.toBeInTheDocument();
  });

  /* "Right side" is the whole ask — the orb trails the label, it does not
   * lead it. A DOM order check is what actually pins that. */
  it("puts the orb after the label", () => {
    render(<TextureButton loading>Sign in</TextureButton>);

    const label = screen.getByText("Sign in");
    const orb = screen.getByRole("button", { name: "Sign in" }).querySelector("canvas");

    expect(orb).toBeTruthy();
    expect(
      label.compareDocumentPosition(orb!) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
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

  /* The orb is decorative — the button's own name is the label, so a screen
   * reader should not read anything on top of it. */
  it("does not add the orb to the accessible name", () => {
    render(<TextureButton loading>Claim next session</TextureButton>);
    expect(
      screen.getByRole("button", { name: "Claim next session" })
    ).toBeInTheDocument();
  });
});
