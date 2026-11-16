import { beforeEach, describe, expect, it } from "vitest";
import { useState } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StimuliIntroSheet } from "../StimuliIntroSheet";
import { stimuliIntroSeen } from "@/lib/stimuli-intro";

function Harness() {
  const [open, setOpen] = useState(true);
  return <StimuliIntroSheet open={open} onOpenChange={setOpen} />;
}

beforeEach(() => localStorage.clear());

/* Stimuli is talking about a topic, not reading the card. Said once. */
describe("StimuliIntroSheet", () => {
  it("says to talk, not read, and is not shown again once dismissed", async () => {
    expect(stimuliIntroSeen()).toBe(false);
    render(<Harness />);
    expect(screen.getByText("Talk, don't read")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Got it" }));
    await waitFor(() => expect(screen.queryByText("Talk, don't read")).not.toBeInTheDocument());
    expect(stimuliIntroSeen()).toBe(true);
  });
});
