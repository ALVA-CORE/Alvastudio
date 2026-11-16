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

  /* A review's message and the sentence it was about are two things. */
  it("keeps what was read apart from the message", () => {
    render(
      <NotificationDetailSheet
        notification={{ ...base, title: "Clip approved", body: "Nice one.", prompt: "Wetin you dey do?" }}
        open
        onOpenChange={() => {}}
      />
    );
    expect(screen.getByText("Nice one.")).toBeInTheDocument();
    expect(screen.getByText("What you read")).toBeInTheDocument();
    expect(screen.getByText("Wetin you dey do?")).toBeInTheDocument();
  });
});
