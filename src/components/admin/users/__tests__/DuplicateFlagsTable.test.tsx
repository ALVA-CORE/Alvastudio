import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DuplicateFlagsTable } from "@/components/admin/users/DuplicateFlagsTable";
import type { AdminUser } from "@/data/admin/users";

const list = vi.fn();
const resolve = vi.fn();

const getFlag = vi.fn();

vi.mock("@/lib/api/payouts", () => ({
  listDuplicateFlags: (status: string, limit: number) => list(status, limit),
  resolveDuplicateFlag: (id: string, body: unknown) => resolve(id, body),
  getDuplicateFlag: (id: string) => getFlag(id),
}));

const USERS = [
  { id: "u1", fullName: "Ada Obi" },
  { id: "u2", fullName: "A. Obi" },
] as AdminUser[];

const FLAG = {
  id: "f1",
  kind: "identity_reuse",
  status: "open",
  user_id: "u1",
  matched_user_id: "u2",
  detail: null,
  created_at: new Date().toISOString(),
};

beforeEach(() => {
  /* Radix locks the page behind an open dialog with `pointer-events: none`
     on the body, and unmounting the tree does not put it back — so the next
     test finds every button unclickable. */
  document.body.style.pointerEvents = "";

  list.mockReset().mockResolvedValue([FLAG]);
  getFlag.mockReset().mockResolvedValue({
    ...FLAG,
    if_upheld: {
      accounts: [
        {
          user_id: "u1",
          full_name: "Ada Obi",
          email: "ada@example.com",
          unpaid_kobo: 33_200_00,
          in_flight_kobo: 8_000_00,
          in_flight_entries: 1,
        },
        {
          user_id: "u2",
          full_name: "A. Obi",
          email: "a@example.com",
          unpaid_kobo: 8_000_00,
          in_flight_kobo: 0,
          in_flight_entries: 0,
        },
      ],
      voided_amount_kobo: 41_200_00,
      in_flight_kobo: 8_000_00,
      in_flight_entries: 1,
    },
  });
  resolve.mockReset().mockResolvedValue({
    ...FLAG,
    status: "upheld",
    closed_user_ids: ["u1", "u2"],
    voided_amount_kobo: 41_200_00,
    in_flight_entries: 1,
  });
});

const table = () => render(<DuplicateFlagsTable active users={USERS} />);

/* The table paints a desktop row and a mobile card for each flag, so every
   action button is in the document twice. Either opens the same menu. */
const openMenu = async (user: ReturnType<typeof userEvent.setup>) => {
  const buttons = await screen.findAllByRole("button", {
    name: /Decide the flag on Ada Obi/,
  });
  await user.click(buttons[0]);
};

describe("DuplicateFlagsTable", () => {
  /**
   * Names, not ids.
   *
   * The flag carries `user_id` and `matched_user_id` and nothing readable.
   * An admin cannot decide anything about two UUIDs.
   */
  it("shows both accounts by name", async () => {
    table();
    expect(await screen.findAllByText("Ada Obi")).not.toHaveLength(0);
    expect(screen.getAllByText("A. Obi")).not.toHaveLength(0);
    expect(screen.getAllByText("Same NIN")).not.toHaveLength(0);
  });

  /* Dismissing destroys nothing, so there is nothing to price and no
     reason to ask the API what it would cost. */
  it("does not price a dismissal", async () => {
    const user = userEvent.setup();
    table();
    await openMenu(user);
    await user.click(await screen.findByRole("menuitem", { name: /Not a duplicate/ }));

    await screen.findByRole("dialog");
    expect(getFlag).not.toHaveBeenCalled();
  });

  /**
   * A confirm that will not open because a figure could not be fetched is
   * worse than one without the figure, so the worded warning stays as the
   * fallback.
   */
  it("still warns in words when the preview fails", async () => {
    const user = userEvent.setup();
    getFlag.mockRejectedValue(new Error("network"));
    table();
    await openMenu(user);
    await user.click(await screen.findByRole("menuitem", { name: /Close both accounts/ }));

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText(/cannot be called back/i)).toBeInTheDocument();
    expect(
      within(dialog).getByRole("button", { name: "Close both accounts" })
    ).toBeInTheDocument();
  });

  /* Dismissing takes a hold off and both people carry on. It is the safe
     direction and the one most flags take, so it is offered first. */
  it("dismisses with a reason", async () => {
    const user = userEvent.setup();
    table();
    await openMenu(user);
    await user.click(await screen.findByRole("menuitem", { name: /Not a duplicate/ }));

    const dialog = await screen.findByRole("dialog");
    await user.type(within(dialog).getByLabelText("Why"), "Siblings, one device");
    await user.click(within(dialog).getByRole("button", { name: "Clear the flag" }));

    await waitFor(() =>
      expect(resolve).toHaveBeenCalledWith("f1", {
        uphold: false,
        notes: "Siblings, one device",
      })
    );
  });

  /**
   * Upholding closes every account the flag names.
   *
   * It is irreversible and it takes somebody's unpaid work with it, so the
   * confirm spells out all three consequences before the button, and the
   * note is required — the next admin should find a reason rather than
   * guess at one.
   */
  it("spells out what closing costs, and will not do it unexplained", async () => {
    const user = userEvent.setup();
    table();
    await openMenu(user);
    await user.click(await screen.findByRole("menuitem", { name: /Close both accounts/ }));

    const dialog = await screen.findByRole("dialog");

    /* The figure, before the decision. It used to warn in words and report
       the amount afterwards, which is a receipt rather than a choice. */
    expect(
      await within(dialog).findByText(/Closes 2 accounts and voids ₦41,200\.00/)
    ).toBeInTheDocument();
    expect(
      within(dialog).getByText(/₦8,000\.00 more is already on its way/)
    ).toBeInTheDocument();
    expect(within(dialog).getByText(/every unpaid earning is voided/i)).toBeInTheDocument();

    const confirm = within(dialog).getByRole("button", { name: "Close both accounts" });
    expect(confirm).toBeDisabled();

    await user.type(within(dialog).getByLabelText("Why"), "Same person");
    await user.click(confirm);

    await waitFor(() =>
      expect(resolve).toHaveBeenCalledWith("f1", {
        uphold: true,
        notes: "Same person",
      })
    );
  });
});
