import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DateTimeField } from "../DateTimeField";

/* shadcn's calendar in place of the raw datetime-local; same value format. */
describe("DateTimeField", () => {
  it("keeps the time when another day is picked, and clears", async () => {
    const onChange = vi.fn();
    render(<DateTimeField label="Ends" value="2026-11-20T09:15" onChange={onChange} />);

    await userEvent.click(screen.getByRole("button", { name: "Ends" }));
    await userEvent.click(await screen.findByRole("button", { name: /November 25/ }));
    expect(onChange).toHaveBeenLastCalledWith("2026-11-25T09:15");

    await userEvent.click(screen.getByRole("button", { name: "Clear" }));
    expect(onChange).toHaveBeenLastCalledWith("");
  });

  it("shows the label until a time is set", () => {
    render(<DateTimeField label="Ends" value="" onChange={() => {}} />);
    expect(screen.getByRole("button", { name: "Ends" })).toHaveTextContent("Ends");
  });
});
