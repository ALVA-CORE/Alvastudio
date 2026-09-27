import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AssignAnnotatorDialog } from "../AssignAnnotatorDialog";
import { ADMIN_USERS } from "@/data/admin/users";

const SUBJECT = "Discuss what makes a voice sound trustworthy.";

function renderDialog() {
  const onAssign = vi.fn();
  render(
    <AssignAnnotatorDialog
      open
      onOpenChange={vi.fn()}
      subject={SUBJECT}
      onAssign={onAssign}
    />
  );
  return { onAssign };
}

describe("AssignAnnotatorDialog", () => {
  it("lists only active annotators", () => {
    renderDialog();
    const dialog = screen.getByRole("dialog");

    const eligible = ADMIN_USERS.filter(
      (user) => user.role === "annotator" && user.isActive
    );
    for (const user of eligible) {
      expect(within(dialog).getByText(user.fullName)).toBeInTheDocument();
    }

    const ineligible = ADMIN_USERS.filter(
      (user) => user.role !== "annotator" || !user.isActive
    );
    for (const user of ineligible) {
      expect(within(dialog).queryByText(user.email)).not.toBeInTheDocument();
    }
  });

  /* Lightest load first, so the default pick is the one that starts soonest. */
  it("orders by open workload", () => {
    renderDialog();
    const buttons = within(screen.getByRole("dialog")).getAllByRole("button");
    const rows = buttons.filter((button) => /free|\d+ open/.test(button.textContent ?? ""));

    const loads = rows.map((row) =>
      row.textContent?.includes("free")
        ? 0
        : Number(row.textContent?.match(/(\d+) open/)?.[1] ?? 0)
    );
    expect(loads).toEqual([...loads].sort((a, b) => a - b));
  });

  it("cannot assign until somebody is picked", async () => {
    const { onAssign } = renderDialog();

    const assign = screen.getByRole("button", { name: "Assign" });
    expect(assign).toBeDisabled();

    const rows = within(screen.getByRole("dialog"))
      .getAllByRole("button")
      .filter((button) => /free|\d+ open/.test(button.textContent ?? ""));
    await userEvent.click(rows[0]);

    expect(assign).toBeEnabled();
    await userEvent.click(assign);
    expect(onAssign).toHaveBeenCalledTimes(1);
  });
});
