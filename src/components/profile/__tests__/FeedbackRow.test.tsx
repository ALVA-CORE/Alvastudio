import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

vi.mock("@/lib/auth/context", () => ({ useAuth: () => ({ user: { email: "ada@example.test" } }) }));
vi.mock("@/hooks/useReferralQuestion", () => ({
  useReferralQuestion: () => ({ needed: false, save: vi.fn() }),
}));
vi.mock("@/lib/api/feedback", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/feedback")>()),
  submitFeedback: vi.fn(async () => ({})),
}));

const { FeedbackRow } = await import("../FeedbackRow");

/* Once it is sent, the thank-you says it all: the header goes. */
describe("FeedbackRow", () => {
  it("hides the sheet header once the message is sent", async () => {
    render(
      <MemoryRouter>
        <FeedbackRow />
      </MemoryRouter>
    );
    await userEvent.click(screen.getByRole("button", { name: "Give feedback" }));
    const title = await screen.findByRole("heading", { name: "Give feedback" });
    expect(title.parentElement).not.toHaveClass("sr-only");

    await userEvent.click(screen.getAllByRole("radio")[3]);
    await userEvent.type(screen.getByLabelText("Your feedback"), "The upload button froze twice.");
    await userEvent.click(screen.getByRole("button", { name: /^Send/ }));

    expect(await screen.findByText(/We read every one/)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Give feedback" }).parentElement).toHaveClass("sr-only");
  });
});
