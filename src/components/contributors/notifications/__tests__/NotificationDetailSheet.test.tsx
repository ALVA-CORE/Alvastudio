import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { NotificationDetailSheet } from "../NotificationDetailSheet";
import type { ContributorNotification } from "@/data/contributor-notifications";

const base: ContributorNotification = {
  id: "k",
  category: "announcement",
  title: "Verify your identity",
  subtitle: "We're testing",
  timestamp: "Today, 16:46",
  timestampTs: Date.now(),
  read: false,
  body: "We're testing the notification feature.\nSecond line.",
};

describe("NotificationDetailSheet", () => {
  it("shows the whole message, with its line breaks", () => {
    render(<NotificationDetailSheet notification={base} open onOpenChange={() => {}} />);
    expect(screen.getByText(/Second line\./)).toHaveClass("whitespace-pre-line");
  });

  /* When it came is small print, with no "Details" heading. */
  it("shows when it came as small print", () => {
    render(<NotificationDetailSheet notification={base} open onOpenChange={() => {}} />);
    expect(screen.getByText("Received")).toBeInTheDocument();
    expect(screen.queryByText("Details")).not.toBeInTheDocument();
  });

  /* What was read shows in a box, with no heading. */
  it("boxes what was read", () => {
    render(
      <NotificationDetailSheet
        notification={{ ...base, category: "review-accepted", title: "Recording approved", body: undefined, prompt: "Wetin you dey do?" }}
        open
        onOpenChange={() => {}}
      />
    );
    expect(screen.getByText("Wetin you dey do?").parentElement).toHaveClass("bg-alva-surface");
    expect(screen.queryByText("What you read")).not.toBeInTheDocument();
  });

  /* A payment: "You earned" on the left, the amount on the right. */
  it("shows a payment's amount as a row", () => {
    render(
      <NotificationDetailSheet
        notification={{ ...base, category: "payout", title: "You earned a payment", body: undefined, amount: "₦10.00" }}
        open
        onOpenChange={() => {}}
      />
    );
    expect(screen.getByText("You earned").nextElementSibling).toHaveTextContent("₦10.00");
  });
});
