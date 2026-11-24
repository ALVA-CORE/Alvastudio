import { describe, expect, it } from "vitest";
import { useState } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StimuliIntroSheet } from "../StimuliIntroSheet";

function Harness() {
  const [open, setOpen] = useState(true);
  return <StimuliIntroSheet open={open} onOpenChange={setOpen} />;
}

/* Stimuli is talking about a topic, not reading the card. */
describe("StimuliIntroSheet", () => {
  it("says to talk, not read, and closes on Got it", async () => {
    render(<Harness />);
    expect(screen.getByText("Talk, don't read")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Got it" }));
    await waitFor(() => expect(screen.queryByText("Talk, don't read")).not.toBeInTheDocument());
  });
});
