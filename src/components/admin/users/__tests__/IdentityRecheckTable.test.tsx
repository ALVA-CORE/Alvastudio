import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { IdentityRecheckTable } from "@/components/admin/users/IdentityRecheckTable";
import { useIdentityRecheck } from "@/hooks/useIdentityRecheck";
import { ApiError } from "@/lib/api/client";

/* The hook and the table together, because the wiring between them is the
   thing worth protecting: the page owns the hook so the tab can carry the
   count, and the table reads it. */
function Harness({ active }: { active: boolean }) {
  const recheck = useIdentityRecheck(active);
  return (
    <>
      {recheck.untold.length > 0 ? (
        <button type="button" onClick={() => recheck.setConfirming(true)}>
          Email {recheck.untold.length} {recheck.untold.length === 1 ? "person" : "people"}
        </button>
      ) : (
        <button type="button" onClick={recheck.reload}>
          Refresh
        </button>
      )}
      <IdentityRecheckTable recheck={recheck} />
    </>
  );
}

const recheck = vi.fn();
vi.mock("@/lib/api/payouts", () => ({
  identityRecheck: (apply?: boolean) => recheck(apply),
}));

const ROWS = [
  { user_id: "u1", full_name: "Ada Obi", email: "ada@example.com", notified: false },
  { user_id: "u2", full_name: "Bode Cole", email: "bode@example.com", notified: true },
];

const preview = (contributors = ROWS) => ({
  applied: false,
  count: contributors.length,
  queued: 0,
  contributors,
});

beforeEach(() => {
  recheck.mockReset().mockResolvedValue(preview());
});

describe("IdentityRecheckTable", () => {
  /* The tab is a one-off clean-up, not something every admin needs read on
     every visit to the users page. */
  it("fetches nothing until the tab is open", () => {
    render(<Harness active={false} />);
    expect(recheck).not.toHaveBeenCalled();
  });

  /**
   * Two states, and they are not the same question.
   *
   * `notified` is ours: did the mail go. Being on the list at all is theirs:
   * the document has not arrived. Somebody can be told and still not have
   * done it, and that is the row an admin chases.
   */
  it("shows everybody, told or not, with which is which", async () => {
    render(<Harness active />);

    /* The table paints a desktop row and a mobile card for each person, so
       every cell is in the document twice. */
    expect(await screen.findAllByText("Ada Obi")).not.toHaveLength(0);
    expect(screen.getAllByText("Bode Cole")).not.toHaveLength(0);
    expect(screen.getAllByText("Not told yet")).not.toHaveLength(0);
    expect(screen.getAllByText("Told, waiting on them")).not.toHaveLength(0);
  });

  /* Opening it must not send anything. The route is a preview unless
     `apply` is set, and this has to keep it that way. */
  it("sends nothing on open, and counts only the untold", async () => {
    render(<Harness active />);

    await screen.findAllByText("Ada Obi");
    expect(recheck).toHaveBeenCalledWith(undefined);
    expect(recheck).not.toHaveBeenCalledWith(true);
    expect(screen.getByRole("button", { name: /Email 1 person/ })).toBeInTheDocument();
  });

  it("applies only after the confirm", async () => {
    const user = userEvent.setup();
    render(<Harness active />);

    await user.click(await screen.findByRole("button", { name: /Email 1 person/ }));
    expect(recheck).not.toHaveBeenCalledWith(true);

    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Send" }));

    await waitFor(() => expect(recheck).toHaveBeenCalledWith(true));
  });

  /**
   * A 503 means email is not configured.
   *
   * The route refuses rather than reporting a success nobody received, and
   * this has to refuse with it: an admin who believes the mail went is the
   * worst outcome this feature has.
   */
  it("shows the refusal when email is not configured", async () => {
    const user = userEvent.setup();
    render(<Harness active />);

    await user.click(await screen.findByRole("button", { name: /Email 1 person/ }));
    recheck.mockRejectedValueOnce(new ApiError(503, "Email is not configured."));

    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Send" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Email is not configured."
    );
  });

  it("offers a refresh rather than a send when everybody has been told", async () => {
    recheck.mockResolvedValue(preview([ROWS[1]]));
    render(<Harness active />);

    expect(await screen.findByRole("button", { name: /Refresh/ })).toBeInTheDocument();
    /* `Email` alone would match the sortable column header, which is also a
       button. The count is what distinguishes the action. */
    expect(screen.queryByRole("button", { name: /^Email \d/ })).not.toBeInTheDocument();
  });
});
