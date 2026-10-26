import { describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
/* The deletion preview is a real request otherwise, and the dialog's confirm
   stays disabled until it settles — so the test would be racing a network
   failure rather than checking anything. */
/* The toaster is not mounted in these tests, so the error has nowhere to
   render. Spying on the call is the assertion. */
vi.mock("@/lib/alva-toast", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/alva-toast")>();
  return {
    ...actual,
    alvaToast: { ...actual.alvaToast, error: vi.fn(), success: vi.fn() },
  };
});

vi.mock("@/lib/api/users", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/users")>()),
  previewUserDeletion: vi.fn(async () => ({
    user_id: "u-018",
    email: "a@b.c",
    role: "annotator" as const,
    recordings: 0,
    reviews: 0,
    reviews_on_other_users_recordings: 0,
    ledger_entries: 0,
    focus_group_sessions: 0,
    participants: 0,
    turns: 0,
    annotations: 118,
    annotation_segments: 0,
    annotation_tokens: 0,
    consent_records: 2,
    payout_records_kept: 0,
  })),
  getUserActivity: vi.fn(async () => ({
    user_id: "u-018",
    role: "annotator" as const,
    window_days: 365,
    start_date: "2025-10-26",
    end_date: "2026-10-25",
    unit: "segments created",
    daily: [
      { date: "2026-10-24", count: 4 },
      { date: "2026-10-25", count: 0 },
    ],
    total: 4,
    active_days: 1,
    best_streak: 1,
    contributor: null,
    intern: null,
    annotator: {
      annotations_started: 3,
      submitted: 2,
      approved: 1,
      sent_back: 1,
      rejected: 0,
      segments_created: 4,
    },
  })),
  getUserProfiles: vi.fn(async () => ({
    user_id: "u-018",
    role: "annotator" as const,
    approved: true,
    profile: null,
    intern_profile: null,
    annotator_profile: null,
    identity: null,
  })),
}));

import { alvaToast } from "@/lib/alva-toast";
import { UserDetailPanel } from "../UserDetailPanel";
import { ADMIN_USERS } from "@/test/adminFixtures";

/* An annotator, because editing is staff-only: a contributor's and an intern's
 * profile is theirs and carries their consent record. Approved, because
 * annotators apply now and a pending one offers Approve where these tests
 * expect Deactivate. */
const user =
  ADMIN_USERS.find(
    (row) =>
      row.role === "annotator" &&
      row.isActive &&
      row.output > 0 &&
      row.approval === "approved"
  ) ?? ADMIN_USERS[0];

function renderPanel(overrides: Partial<Parameters<typeof UserDetailPanel>[0]> = {}) {
  const props = {
    open: true,
    onOpenChange: vi.fn(),
    user,
    onToggleActive: vi.fn(),
    onApprove: vi.fn(),
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

  it("switches to the audit log, one list with no filter on it", async () => {
    /* The history comes from `GET /audit` now, which this test does not
       stand up, so the timeline shows its empty state.

       What is asserted is that nothing splits it. Sign-ins are interleaved
       with everything else rather than sitting behind a tab or a pill: the
       sequence is the information, and a reader should not have to join two
       lists by timestamp to see that a password changed a minute after an
       unfamiliar device signed in. */
    renderPanel();
    await userEvent.click(screen.getByRole("button", { name: "Audit log" }));

    expect(
      await screen.findByText("Nothing has happened to this account yet.")
    ).toBeInTheDocument();

    expect(screen.queryByRole("tab", { name: "Everything" })).not.toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: "Sign-ins" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Sign-ins" })).not.toBeInTheDocument();

    /* Nothing to page through when there is nothing on file. */
    expect(screen.queryByRole("button", { name: "Load more" })).not.toBeInTheDocument();
  });

  /* Deleting cannot be undone, so the bin opens a confirm pair rather than
   * firing on the first press. */
  /* A hard delete: the account and everything belonging to it, with no undo.
     The bin's own confirm pair carries no words, so it opens a dialog that
     says what goes instead of doing it. */
  it("shows what deleting would remove before it will do it", async () => {
    const { onDelete } = renderPanel();

    await userEvent.click(screen.getByRole("button", { name: "Delete" }));
    await userEvent.click(screen.getByRole("button", { name: "Confirm delete" }));
    expect(onDelete).not.toHaveBeenCalled();

    expect(
      await screen.findByText(`Delete ${user.fullName}?`)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/removes the account and everything belonging to it/i)
    ).toBeInTheDocument();
    /* The counts are the point: "delete Ada" and "delete Ada and 118
       annotations" are different decisions. */
    expect(screen.getByText("Annotations")).toBeInTheDocument();
    expect(screen.getByText("118")).toBeInTheDocument();

    /* Disabled until the preview settles, so the counts are on screen before
       the button that acts on them can be pressed. */
    const confirm = await screen.findByRole("button", {
      name: "Delete permanently",
    });
    await waitFor(() => expect(confirm).toBeEnabled());

    await userEvent.click(confirm);
    expect(onDelete).toHaveBeenCalledWith(user);
  });

  it("offers deactivating instead, which can be undone", async () => {
    const { onToggleActive } = renderPanel();

    await userEvent.click(screen.getByRole("button", { name: "Delete" }));
    await userEvent.click(screen.getByRole("button", { name: "Confirm delete" }));

    await userEvent.click(
      await screen.findByRole("button", { name: "Deactivate instead" })
    );
    expect(onToggleActive).toHaveBeenCalledWith(user);
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

  it("refuses to save an invalid email, and says so in a toast", async () => {
    /* A toast rather than a line under the field. The panel scrolls and Save
       sits in a footer pinned below the scroll area, so an error rendered
       beside the input can be off screen at the moment somebody presses the
       button that caused it. */
    const { onSave } = renderPanel();

    await userEvent.click(screen.getByRole("button", { name: /Edit/ }));
    const emailField = screen.getByLabelText("Email");
    await userEvent.clear(emailField);
    await userEvent.type(emailField, "not-an-email");
    await userEvent.click(screen.getByRole("button", { name: "Save changes" }));

    expect(onSave).not.toHaveBeenCalled();
    expect(alvaToast.error).toHaveBeenCalledWith(
      "That does not look like an email address."
    );
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
  /* This tab used to draw a 53-week heatmap, a total, a streak and an
     approval pie from a seeded random keyed on the user id, so the old tests
     were checking that a generator was deterministic rather than that
     anything was true. Every figure now comes off
     `GET /users/{id}/activity`, and the noun comes off its `unit` rather
     than a lookup on this side. */
  it("shows the figures the API sent, in the unit it named", async () => {
    renderPanel();
    await userEvent.click(screen.getByRole("button", { name: "Activity" }));

    expect(await screen.findByText("4 segments created")).toBeInTheDocument();
    expect(screen.getByText("1 days")).toBeInTheDocument();
  });

  it("shows what became of the annotations", async () => {
    renderPanel();
    await userEvent.click(screen.getByRole("button", { name: "Activity" }));

    expect(
      await screen.findByText("What became of the annotations")
    ).toBeInTheDocument();
    expect(screen.getByText("Segments created")).toBeInTheDocument();
  });
});

describe("intern approval", () => {
  const pendingIntern = {
    ...user,
    id: "u-intern",
    role: "intern" as const,
    isActive: false,
    approval: "pending" as const,
  };

  it("approves a pending intern instead of offering to reactivate them", async () => {
    const props = renderPanel({ user: pendingIntern });

    expect(screen.getByText("· Pending approval")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Reactivate/ })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Approve" }));
    expect(props.onApprove).toHaveBeenCalledWith(pendingIntern);
  });

  /* There is no admin-triggered reset for the roles that sign themselves up,
   * so the button was a toast with nothing behind it. */
  it("offers a password reset for every role", () => {
    /* It was staff only, on the belief that there was no admin-triggered
       reset for a contributor. There is, and while recovery emails are being
       refused it is the only way back into a locked-out account — so the
       people who most need it were the ones it was hidden from. */
    for (const role of ["contributor", "intern", "annotator", "admin"] as const) {
      renderPanel({ user: { ...user, role } });
      expect(
        screen.getByRole("button", { name: /Reset password/ })
      ).toBeInTheDocument();
      cleanup();
    }

    renderPanel({ user: pendingIntern });
    expect(screen.getByRole("button", { name: /Reset password/ })).toBeInTheDocument();
  });
});

describe("who can be edited", () => {
  it.each(["contributor", "intern"] as const)(
    "does not offer to edit a %s",
    (role) => {
      renderPanel({ user: { ...user, role } });
      expect(screen.queryByRole("button", { name: /Edit/ })).not.toBeInTheDocument();
    }
  );

  it.each(["annotator", "admin"] as const)("offers to edit an %s", (role) => {
    renderPanel({ user: { ...user, role } });
    expect(screen.getByRole("button", { name: /Edit/ })).toBeInTheDocument();
  });
});
