import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { UserDetailPanel } from "../UserDetailPanel";
import { ADMIN_USERS, activitySummary, userActivity } from "@/data/admin/users";

const user = ADMIN_USERS.find((row) => row.isActive && row.output > 0) ?? ADMIN_USERS[0];

function renderPanel(overrides: Partial<Parameters<typeof UserDetailPanel>[0]> = {}) {
  const props = {
    open: true,
    onOpenChange: vi.fn(),
    user,
    onToggleActive: vi.fn(),
    onDelete: vi.fn(),
    onSave: vi.fn(),
    ...overrides,
  };
  render(<UserDetailPanel {...props} />);
  return props;
}

describe("UserDetailPanel", () => {
  it("opens on the profile tab with the account facts", () => {
    renderPanel();
    expect(screen.getByRole("dialog", { name: user.fullName })).toBeInTheDocument();
    expect(screen.getByText(user.email)).toBeInTheDocument();
    expect(screen.getByText("Joined")).toBeInTheDocument();
  });

  it("switches to activity", async () => {
    renderPanel();
    await userEvent.click(screen.getByRole("button", { name: "Activity" }));
    expect(screen.getByText("Best streak")).toBeInTheDocument();
  });

  it("switches to the audit log", async () => {
    renderPanel();
    await userEvent.click(screen.getByRole("button", { name: "Audit log" }));
    expect(screen.getByText("Joined Alvastudio")).toBeInTheDocument();
  });

  /* Deleting cannot be undone, so the bin opens a confirm pair rather than
   * firing on the first press. */
  it("requires confirmation to delete", async () => {
    const { onDelete } = renderPanel();

    await userEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(onDelete).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole("button", { name: "Confirm delete" }));
    expect(onDelete).toHaveBeenCalledWith(user);
  });

  /* Same rule for deactivating: it removes someone's access, so it goes
   * through the shared dialog rather than firing off a single click. */
  it("requires confirmation to deactivate", async () => {
    const { onToggleActive } = renderPanel();

    await userEvent.click(screen.getByRole("button", { name: /Deactivate/ }));
    expect(onToggleActive).not.toHaveBeenCalled();

    // The panel itself is also a dialog, so scope to the confirmation by name.
    const dialog = await screen.findByRole("dialog", {
      name: `Deactivate ${user.fullName}?`,
    });
    await userEvent.click(within(dialog).getByRole("button", { name: "Deactivate" }));
    expect(onToggleActive).toHaveBeenCalledWith(user);
  });

  it("offers reactivate for a deactivated one", () => {
    renderPanel({ user: { ...user, isActive: false } });
    expect(screen.getByRole("button", { name: /Reactivate/ })).toBeInTheDocument();
  });

  /* Editing happens in place. Opening a second panel to change a field was
   * the thing this replaced, so the fields must become inputs right here. */
  it("edits in place and saves", async () => {
    const { onSave } = renderPanel();

    await userEvent.click(screen.getByRole("button", { name: /Edit/ }));

    const nameField = screen.getByLabelText("Full name");
    await userEvent.clear(nameField);
    await userEvent.type(nameField, "Renamed Person");

    await userEvent.click(screen.getByRole("button", { name: "Save changes" }));

    expect(onSave).toHaveBeenCalledWith(
      user,
      expect.objectContaining({ fullName: "Renamed Person" })
    );
  });

  it("refuses to save an invalid email", async () => {
    const { onSave } = renderPanel();

    await userEvent.click(screen.getByRole("button", { name: /Edit/ }));
    const emailField = screen.getByLabelText("Email");
    await userEvent.clear(emailField);
    await userEvent.type(emailField, "not-an-email");
    await userEvent.click(screen.getByRole("button", { name: "Save changes" }));

    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("drops edits on cancel", async () => {
    const { onSave } = renderPanel();

    await userEvent.click(screen.getByRole("button", { name: /Edit/ }));
    await userEvent.type(screen.getByLabelText("Phone"), "999");
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByText(user.email)).toBeInTheDocument();
  });
});

describe("user activity", () => {
  it("is stable for the same user", () => {
    expect(activitySummary(userActivity(user))).toEqual(
      activitySummary(userActivity(user))
    );
  });

  /* Counts run to today, never past it — a calendar with future contributions
   * in it is the giveaway that the series was generated rather than measured. */
  it("never records activity in the future", () => {
    const now = Date.now();
    for (const column of userActivity(user)) {
      for (const bin of column.bins) {
        if (bin.date instanceof Date && bin.date.getTime() > now) {
          expect(bin.count).toBe(0);
        }
      }
    }
  });
});
