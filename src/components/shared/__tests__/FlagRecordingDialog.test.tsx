import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FlagRecordingDialog } from "../FlagRecordingDialog";

function renderDialog(onSend = vi.fn(async () => {})) {
  render(<FlagRecordingDialog open onOpenChange={() => {}} mode="flag" onSend={onSend} />);
  return { onSend };
}

describe("FlagRecordingDialog", () => {
  it("needs at least one reason, and sends every one ticked", async () => {
    const { onSend } = renderDialog();
    const flag = screen.getByRole("button", { name: "Flag" });
    expect(flag).toBeDisabled();

    await userEvent.click(screen.getByRole("checkbox", { name: "Gibberish" }));
    await userEvent.click(screen.getByRole("checkbox", { name: "Wrong language" }));
    await userEvent.click(flag);

    expect(onSend).toHaveBeenCalledWith({ reasons: ["gibberish", "wrong_language"], note: undefined });
  });

  it("needs a note for another reason", async () => {
    renderDialog();
    await userEvent.click(screen.getByRole("checkbox", { name: "Another reason" }));
    const flag = screen.getByRole("button", { name: "Flag" });
    expect(flag).toBeDisabled();

    await userEvent.type(screen.getByLabelText("What's wrong"), "Music, no voice");
    expect(flag).toBeEnabled();
  });

  it("shows why a send was refused", async () => {
    renderDialog(vi.fn(async () => {
      throw new Error("This clip already has a verdict, so yours was not recorded.");
    }));
    await userEvent.click(screen.getByRole("checkbox", { name: "Gibberish" }));
    await userEvent.click(screen.getByRole("button", { name: "Flag" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("already has a verdict");
  });
});
