import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ApiError } from "@/lib/api/client";
import { alvaToast } from "@/lib/alva-toast";
import type { ApiNarrationSend } from "@/lib/api/annotations";

const send = vi.fn<(ids: string[], expected?: number) => Promise<ApiNarrationSend>>();
const withdraw = vi.fn();

vi.mock("@/lib/api/annotations", () => ({
  sendNarrations: (ids: string[], expected?: number) => send(ids, expected),
  withdrawNarrations: (ids: string[]) => withdraw(ids),
}));

const { NarrationPoolActions } = await import("../NarrationPoolActions");

const result = (over: Partial<ApiNarrationSend>): ApiNarrationSend => ({
  applied: false,
  sent: 2,
  recording_ids: ["r1", "r2"],
  skipped: ["r3"],
  ...over,
});

describe("sending narrations to the annotators", () => {
  /* Preview, confirm with how many go and how many are skipped, apply with
     `expected`. A 409 shows the server's words and previews again. */
  it("previews, applies with the sent count, and previews again on a 409", async () => {
    const error = vi.spyOn(alvaToast, "error");
    const onDone = vi.fn();
    send
      .mockResolvedValueOnce(result({}))
      .mockRejectedValueOnce(new ApiError(409, "The choice changed. Preview again."))
      .mockResolvedValueOnce(result({ sent: 1, recording_ids: ["r1"], skipped: ["r2", "r3"] }))
      .mockResolvedValueOnce(result({ applied: true, sent: 1, recording_ids: ["r1"], skipped: ["r2", "r3"] }));

    render(<NarrationPoolActions ids={["r1", "r2", "r3"]} ready={3} onDone={onDone} />);

    await userEvent.click(screen.getByRole("button", { name: "Send to annotators" }));
    const dialog = await screen.findByRole("dialog");
    expect(send.mock.calls[0]).toEqual([["r1", "r2", "r3"], undefined]);
    expect(within(dialog).getByText("Send 2 narrations to the annotators?")).toBeInTheDocument();
    expect(within(dialog).getByText(/^1 skipped/)).toBeInTheDocument();

    await userEvent.click(within(dialog).getByRole("button", { name: "Send" }));
    await waitFor(() => expect(error).toHaveBeenCalledWith("The choice changed. Preview again."));
    expect(send.mock.calls[1]).toEqual([["r1", "r2", "r3"], 2]);

    expect(await within(dialog).findByText("Send 1 narration to the annotators?")).toBeInTheDocument();
    expect(within(dialog).getByText(/^2 skipped/)).toBeInTheDocument();

    await userEvent.click(within(dialog).getByRole("button", { name: "Send" }));
    await waitFor(() => expect(onDone).toHaveBeenCalled());
    expect(send.mock.calls[3]).toEqual([["r1", "r2", "r3"], 1]);
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("takes them back and says how many were skipped", async () => {
    const show = vi.spyOn(alvaToast, "show");
    withdraw.mockResolvedValueOnce({ withdrawn: ["r1"], skipped: ["r2"] });

    render(<NarrationPoolActions ids={["r1", "r2"]} ready={2} onDone={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: "Take back" }));

    await waitFor(() =>
      expect(show).toHaveBeenCalledWith("1 narration taken back, 1 skipped", { variant: "success" })
    );
    expect(withdraw).toHaveBeenCalledWith(["r1", "r2"]);
  });

  /* Only approved Stimuli clips can go: with none ticked, nothing to press. */
  it("greys out Send when none of the ticked rows can go", () => {
    render(<NarrationPoolActions ids={["r1"]} ready={0} onDone={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Send to annotators" })).toBeDisabled();
  });
});
