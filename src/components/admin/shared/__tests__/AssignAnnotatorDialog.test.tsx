import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ADMIN_USERS } from "@/test/adminFixtures";

const listUsers = vi.fn();

vi.mock("@/lib/api/users", () => ({
  listUsers: (...args: unknown[]) => listUsers(...args),
}));

import { AssignAnnotatorDialog } from "../AssignAnnotatorDialog";

const SUBJECT = "Discuss what makes a voice sound trustworthy.";

const ANNOTATORS = ADMIN_USERS.filter((user) => user.role === "annotator");

beforeEach(() => {
  listUsers.mockReset().mockResolvedValue({
    items: ANNOTATORS.map((user) => ({
      id: user.id,
      email: user.email,
      full_name: user.fullName,
      phone: user.phone,
      role: user.role,
      is_active: user.isActive,
      approved: true,
      intern_approved: true,
      created_at: new Date(user.createdAt).toISOString(),
    })),
    total: ANNOTATORS.length,
    limit: 200,
    offset: 0,
  });
});

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

async function rows() {
  const dialog = await screen.findByRole("dialog");
  const names = new Set(ANNOTATORS.map((user) => user.fullName));
  return within(dialog)
    .getAllByRole("button")
    .filter((button) =>
      [...names].some((name) => button.textContent?.includes(name))
    );
}

describe("AssignAnnotatorDialog", () => {
  it("asks the API for annotators only, a page at a time", async () => {
    /* Paged rather than one `limit: 200` call: that is the API's cap, so a
       single call answers "the first 200" to a picker whose job is to list
       everybody who could take the work. */
    renderDialog();
    await waitFor(() =>
      expect(listUsers).toHaveBeenCalledWith(
        expect.objectContaining({ role: "annotator", offset: 0 })
      )
    );
  });

  it("lists the active ones and drops the rest", async () => {
    renderDialog();
    const dialog = await screen.findByRole("dialog");

    for (const user of ANNOTATORS.filter((u) => u.isActive)) {
      await waitFor(() =>
        expect(within(dialog).getByText(user.fullName)).toBeInTheDocument()
      );
    }
    for (const user of ANNOTATORS.filter((u) => !u.isActive)) {
      expect(within(dialog).queryByText(user.email)).not.toBeInTheDocument();
    }
  });

  /* Nothing at the API reports what someone is already holding, so the badge
   * is absent rather than showing a zero that would read as "free". */
  it("shows no workload badge when the API cannot report one", async () => {
    renderDialog();
    const dialog = await screen.findByRole("dialog");
    await waitFor(() => expect(within(dialog).getAllByRole("button").length).toBeGreaterThan(1));
    expect(within(dialog).queryByText("free")).not.toBeInTheDocument();
    expect(within(dialog).queryByText(/\d+ open/)).not.toBeInTheDocument();
  });

  it("cannot assign until somebody is picked", async () => {
    const { onAssign } = renderDialog();

    const assign = screen.getByRole("button", { name: "Assign" });
    expect(assign).toBeDisabled();

    const people = await waitFor(async () => {
      const found = await rows();
      expect(found.length).toBeGreaterThan(0);
      return found;
    });
    await userEvent.click(people[0]);

    expect(assign).toBeEnabled();
    await userEvent.click(assign);
    expect(onAssign).toHaveBeenCalledTimes(1);
  });
});
