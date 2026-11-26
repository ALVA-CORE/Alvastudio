import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ApiError } from "@/lib/api/client";
import type { SignInChallenge } from "@/lib/api/auth";

const verifyCode = vi.fn();
vi.mock("@/lib/auth/context", () => ({ useAuth: () => ({ verifyCode }) }));
vi.mock("@/lib/api/auth", () => ({ resendSignInCode: vi.fn() }));
const { SignInCodeStep } = await import("../SignInCodeStep");

const challenge: SignInChallenge = {
  code_required: true,
  challenge_id: "c1",
  expires_at: "2026-11-26T10:10:00Z",
  email_hint: "a•••@alvacoreai.com",
  email_sent: true,
  resends_left: 3,
};

function renderStep(overrides: Partial<SignInChallenge> = {}) {
  const onDone = vi.fn();
  const onStartOver = vi.fn();
  render(
    <SignInCodeStep challenge={{ ...challenge, ...overrides }} remember onDone={onDone} onStartOver={onStartOver} />
  );
  return { onDone, onStartOver };
}

describe("SignInCodeStep", () => {
  it("sends the emailed code and finishes signing in", async () => {
    verifyCode.mockResolvedValueOnce({});
    const { onDone } = renderStep();
    expect(screen.getByText(/a•••@alvacoreai\.com/)).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText("6-digit code"), "123456");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));

    expect(verifyCode).toHaveBeenCalledWith("c1", { code: "123456" }, true);
    expect(onDone).toHaveBeenCalled();
  });

  it("says how many tries are left after a wrong code", async () => {
    verifyCode.mockRejectedValueOnce(new ApiError(400, "That code isn't right.", [], "code_invalid", 2));
    renderStep();
    await userEvent.type(screen.getByLabelText("6-digit code"), "000000");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("That code isn't right. 2 tries left.");
  });

  it("goes back to the password form when the code has expired", async () => {
    verifyCode.mockRejectedValueOnce(new ApiError(400, "That code has expired.", [], "challenge_expired"));
    const { onStartOver } = renderStep();
    await userEvent.type(screen.getByLabelText("6-digit code"), "123456");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));
    expect(onStartOver).toHaveBeenCalledWith("That code has expired.");
  });

  it("takes a recovery code instead, and only that when no email went", async () => {
    verifyCode.mockResolvedValueOnce({});
    renderStep({ email_sent: false });
    expect(screen.queryByText("Use the emailed code instead")).not.toBeInTheDocument();

    await userEvent.type(screen.getByLabelText("Recovery code"), "abcd-efgh-ijkl-mnop");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));
    expect(verifyCode).toHaveBeenCalledWith("c1", { recovery_code: "abcd-efgh-ijkl-mnop" }, true);
  });
});
