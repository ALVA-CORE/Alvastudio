import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BeamInput } from "../BeamInput";

/* The prefix belongs to the value, so it waits for the label to lift. */
describe("BeamInput prefix", () => {
  it("shows the prefix only once the field is in use", async () => {
    render(<BeamInput label="Minimum payout" prefix="₦" />);
    expect(screen.queryByText("₦")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("textbox", { name: "Minimum payout" }));
    expect(screen.getByText("₦")).toBeInTheDocument();
  });

  it("leaves a field without one as it was", async () => {
    render(<BeamInput label="Email" />);
    await userEvent.click(screen.getByRole("textbox", { name: "Email" }));
    expect(screen.queryByText("₦")).not.toBeInTheDocument();
  });
});
