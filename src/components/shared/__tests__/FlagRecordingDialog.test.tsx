import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const flagRecording = vi.fn(async () => ({ flag: { id: "f1" }, next_recording: { id: "r2" } }));
vi.mock("@/lib/api/recordingFlags", async (actual) => ({
  ...(await actual<typeof import("@/lib/api/recordingFlags")>()),
  flagRecording: (...args: unknown[]) => flagRecording(...(args as [])),
}));
const { FlagRecordingDialog } = await import("../FlagRecordingDialog");

function renderDialog() {
  const onFlagged = vi.fn();
  render(<FlagRecordingDialog open onOpenChange={() => {}} recordingId="r1" onFlagged={onFlagged} />);
  return { onFlagged };
}

describe("FlagRecordingDialog", () => {
  it("needs a reason before it will flag", async () => {
    const { onFlagged } = renderDialog();
    const flag = screen.getByRole("button", { name: "Flag" });
    expect(flag).toBeDisabled();

    await userEvent.click(screen.getByRole("radio", { name: "Recycled audio" }));
    await userEvent.click(flag);

    expect(flagRecording).toHaveBeenCalledWith("r1", { reason: "recycled_audio", note: undefined });
    expect(onFlagged).toHaveBeenCalledWith({ flag: { id: "f1" }, next_recording: { id: "r2" } });
  });

  it("needs a note when the reason is Other", async () => {
    renderDialog();
    await userEvent.click(screen.getByRole("radio", { name: "Other" }));
    const flag = screen.getByRole("button", { name: "Flag" });
    expect(flag).toBeDisabled();

    await userEvent.type(screen.getByLabelText("What's wrong"), "Two people reading");
    expect(flag).toBeEnabled();
  });
});
