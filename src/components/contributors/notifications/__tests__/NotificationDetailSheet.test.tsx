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

  /* A verdict's text repeats its title, so it is left out; what was read
     shows in a box, with no heading. */
  it("leaves out a verdict's text and boxes what was read", () => {
    render(
      <NotificationDetailSheet
        notification={{
          ...base,
          category: "review-accepted",
          title: "Recording approved",
          body: "Your recording was approved.",
          prompt: "Wetin you dey do?",
        }}
        open
        onOpenChange={() => {}}
      />
    );
    expect(screen.queryByText("Your recording was approved.")).not.toBeInTheDocument();
    expect(screen.getByText("Wetin you dey do?").parentElement).toHaveClass("bg-alva-surface");
    expect(screen.queryByText("What you read")).not.toBeInTheDocument();
  });

  /* Anything but an announcement keeps its text, in the small print. */
  it("moves a payment's text to the small print", () => {
    render(
      <NotificationDetailSheet
        notification={{
          ...base,
          category: "payout",
          title: "You earned a payment",
          body: "NGN 10.00 for an approved sentence.",
        }}
        open
        onOpenChange={() => {}}
      />
    );
    expect(screen.getByText("NGN 10.00 for an approved sentence.").nextElementSibling?.tagName).toBe("DL");
  });
});
