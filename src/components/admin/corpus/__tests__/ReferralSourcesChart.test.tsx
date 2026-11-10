import { describe, expect, it } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ReferralSourcesChart } from "../ReferralSourcesChart";

const slices = [{ source: "friend", label: "Friend", contributors: 12 }];
const others = { Radio: 3, Church: 2, "Search engine": 1, Ai: 1, "Chat GPT": 1, Flyer: 1 };

describe("ReferralSourcesChart", () => {
  it("lists every somewhere-else answer in a sheet, and closes it", async () => {
    const user = userEvent.setup();
    render(<ReferralSourcesChart slices={slices as never} otherDetails={others} />);

    /* Only the label under the ring; the answers wait for the sheet. */
    expect(screen.queryByText("Flyer")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Somewhere else" }));
    const sheet = screen.getByRole("dialog", { name: "Somewhere else" });
    expect(within(sheet).getAllByRole("listitem")).toHaveLength(6);
    expect(within(sheet).getByText("Flyer")).toBeInTheDocument();

    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });
});
