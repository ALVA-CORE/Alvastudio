import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";
import { ApiError } from "@/lib/api/client";

const redeem = vi.fn();
const navigate = vi.fn();

vi.mock("@/lib/api/auth", () => ({
  redeemPasswordReset: (body: unknown) => redeem(body),
}));

vi.mock("react-router-dom", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react-router-dom")>()),
  useNavigate: () => navigate,
}));

const TOKEN = "4a62cbc84291744fb8197f5916bb5fdb09323a8f57e8b0a03e3e61de13140967";

function visit(url: string) {
  window.history.replaceState(null, "", url);
}

beforeEach(() => {
  redeem.mockReset().mockResolvedValue(undefined);
  navigate.mockReset();
});

afterEach(() => visit("/"));

const form = () =>
  render(
    <MemoryRouter>
      <ResetPasswordForm />
    </MemoryRouter>
  );

describe("ResetPasswordForm", () => {
  /**
   * The API puts the token in the fragment, which is the right place: a
   * fragment is never sent to a server, so it cannot reach an access log, a
   * referrer header or a proxy's history.
   */
  it("reads the token out of the URL fragment", async () => {
    visit(`/reset-password#token=${TOKEN}`);
    form();

    await userEvent.type(screen.getByLabelText("New password"), "NewPass!2026");
    await userEvent.type(screen.getByLabelText("Confirm new password"), "NewPass!2026");
    await userEvent.click(screen.getByRole("button", { name: "Set password" }));

    await waitFor(() =>
      expect(redeem).toHaveBeenCalledWith({
        token: TOKEN,
        new_password: "NewPass!2026",
      })
    );
  });

  /* A mail client that rewrites links for click tracking sometimes moves it
     to a query. Somebody locked out of their account is the worst person to
     hand a dead link to. */
  it("falls back to a query parameter", async () => {
    visit(`/reset-password?token=${TOKEN}`);
    form();

    await userEvent.type(screen.getByLabelText("New password"), "NewPass!2026");
    await userEvent.type(screen.getByLabelText("Confirm new password"), "NewPass!2026");
    await userEvent.click(screen.getByRole("button", { name: "Set password" }));

    await waitFor(() => expect(redeem).toHaveBeenCalled());
  });

  /* It lives in React state for the one request that spends it, and nowhere
     else: not in the URL somebody screenshots, not in the back button. */
  it("takes the token off the address bar", async () => {
    visit(`/reset-password#token=${TOKEN}`);
    form();

    await waitFor(() => expect(window.location.hash).toBe(""));
    expect(window.location.href).not.toContain(TOKEN);
  });

  /* Some mail apps cut long links in half. That is not the same failure as
     an expired token and must not read like one. */
  it("says the link is incomplete when there is no token at all", async () => {
    visit("/reset-password");
    form();

    expect(await screen.findByText("This link is incomplete")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Set password" })
    ).not.toBeInTheDocument();
  });

  /* Expired, already used and never valid are three different things, and
     the API already distinguishes them. Its sentence is shown as sent
     rather than flattened into "that did not work". */
  it("shows the API's own reason when the token is refused", async () => {
    visit(`/reset-password#token=${TOKEN}`);
    redeem.mockRejectedValue(new ApiError(400, "This reset link has expired."));
    form();

    await userEvent.type(screen.getByLabelText("New password"), "NewPass!2026");
    await userEvent.type(screen.getByLabelText("Confirm new password"), "NewPass!2026");
    await userEvent.click(screen.getByRole("button", { name: "Set password" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "This reset link has expired."
    );
    expect(navigate).not.toHaveBeenCalled();
  });

  it("will not submit two passwords that differ", async () => {
    visit(`/reset-password#token=${TOKEN}`);
    form();

    await userEvent.type(screen.getByLabelText("New password"), "NewPass!2026");
    await userEvent.type(screen.getByLabelText("Confirm new password"), "Different!1");
    await userEvent.click(screen.getByRole("button", { name: "Set password" }));

    expect(await screen.findByText("Passwords do not match")).toBeInTheDocument();
    expect(redeem).not.toHaveBeenCalled();
  });

  /* Sent to sign in rather than signed in: a redeem returns no session, and
     posting the new password to login to fake one would mean this page held
     a working credential longer than the moment it needed it. */
  it("sends them to sign in once it works", async () => {
    visit(`/reset-password#token=${TOKEN}`);
    form();

    await userEvent.type(screen.getByLabelText("New password"), "NewPass!2026");
    await userEvent.type(screen.getByLabelText("Confirm new password"), "NewPass!2026");
    await userEvent.click(screen.getByRole("button", { name: "Set password" }));

    await waitFor(() =>
      expect(navigate).toHaveBeenCalledWith("/login", { replace: true })
    );
  });
});
