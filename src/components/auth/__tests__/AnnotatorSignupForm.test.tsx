import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const signup = vi.fn();
const navigate = vi.fn();

vi.mock("@/lib/auth/context", () => ({ useAuth: () => ({ signup }) }));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>(
    "react-router-dom"
  );
  return { ...actual, useNavigate: () => navigate };
});

import { AnnotatorSignupForm } from "../AnnotatorSignupForm";

/**
 * The role is the load-bearing part.
 *
 * `toApiRole` used to downgrade annotator to contributor, because there was no
 * annotator sign-up and nothing to send. An account created with the wrong
 * role lands in the wrong place and nobody notices until somebody cannot
 * reach their queue.
 */

async function fillAndSubmit() {
  const user = userEvent.setup();

  await user.type(screen.getByLabelText("Full name"), "Ada Obi");
  await user.type(screen.getByLabelText("Email"), "ada@example.com");
  await user.type(screen.getByLabelText("Phone"), "08012345678");
  await user.type(screen.getByLabelText("Password"), "passw0rd123");
  await user.type(screen.getByLabelText("Confirm password"), "passw0rd123");

  await user.click(screen.getByRole("button", { name: "Varieties you can tag" }));
  await user.click(screen.getByRole("checkbox", { name: "Nigerian Pidgin" }));
  await user.keyboard("{Escape}");

  await user.type(
    screen.getByLabelText("Sessions you can cover"),
    "Lagos focus groups, Ogun focus groups"
  );
  await user.click(screen.getByRole("checkbox", { name: /terms and conditions/i }));
  await user.click(screen.getByRole("button", { name: "Create annotator account" }));
}

describe("AnnotatorSignupForm", () => {
  beforeEach(() => {
    signup.mockReset().mockResolvedValue({});
    navigate.mockReset();
    localStorage.clear();
  });

  it("registers as an annotator, not a contributor", async () => {
    render(
      <MemoryRouter>
        <AnnotatorSignupForm />
      </MemoryRouter>
    );

    await fillAndSubmit();

    await waitFor(() => expect(signup).toHaveBeenCalledTimes(1));
    expect(signup.mock.calls[0][0]).toMatchObject({
      role: "annotator",
      email: "ada@example.com",
    });
  });

  it("sends the clearance in the shape the profile endpoint takes", async () => {
    render(
      <MemoryRouter>
        <AnnotatorSignupForm />
      </MemoryRouter>
    );

    await fillAndSubmit();

    await waitFor(() => expect(signup).toHaveBeenCalledTimes(1));
    expect(signup.mock.calls[0][0].annotatorClearance).toEqual({
      language_varieties: ["nigerian_pidgin"],
      /* Comma-separated on screen, a list at the API. */
      sessions_covered: ["Lagos focus groups", "Ogun focus groups"],
    });
  });

  it("sends them back to sign in rather than into a queue they cannot read", async () => {
    render(
      <MemoryRouter>
        <AnnotatorSignupForm />
      </MemoryRouter>
    );

    await fillAndSubmit();

    await waitFor(() => expect(navigate).toHaveBeenCalledWith("/login"));
  });

  it("will not submit without a variety", async () => {
    render(
      <MemoryRouter>
        <AnnotatorSignupForm />
      </MemoryRouter>
    );

    const user = userEvent.setup();
    await user.type(screen.getByLabelText("Full name"), "Ada Obi");
    await user.click(screen.getByRole("button", { name: "Create annotator account" }));

    /* The field names itself through `aria-label`, since its visible label
       animates out of the box and a `<label for>` that moves makes the
       browser scroll to it. So this is the check that the control is still
       reachable by name with no stacked label above it. */
    expect(
      screen.getByRole("button", { name: "Varieties you can tag" })
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByText(/pick at least one/i)).toBeInTheDocument()
    );
    expect(signup).not.toHaveBeenCalled();
  });
});
