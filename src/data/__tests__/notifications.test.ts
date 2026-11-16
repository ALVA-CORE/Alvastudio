import { describe, expect, it } from "vitest";
import {
  toContributorNotification,
  toStaffNotification,
} from "@/data/notifications";

function row(kind: string) {
  return {
    key: `k:${kind}`,
    kind,
    title: "Title",
    body: "Body",
    created_at: new Date().toISOString(),
    read: false,
  };
}

describe("notification mapping", () => {
  it.each([
    ["recording_approved", "review-accepted", "accepted"],
    ["recording_rejected", "review-rejected", "rejected"],
    ["recording_submitted", "submission-received", "pending"],
    ["payout_sent", "payout", undefined],
    ["points_awarded", "leaderboard", undefined],
  ])("reads %s as %s", (kind, category, status) => {
    const mapped = toContributorNotification(row(kind));
    expect(mapped.category).toBe(category);
    expect(mapped.status).toBe(status);
  });

  /* `kind` is a free string at the API with no enum to switch on. A row whose
   * kind we have never seen must still be readable; dropping it because its
   * icon is unknown would be the worse failure. */
  it("falls back to an announcement for an unknown kind", () => {
    expect(toContributorNotification(row("something_new")).category).toBe(
      "announcement"
    );
    expect(toStaffNotification(row("something_new")).category).toBe("announcement");
  });

  /* The key is what goes back to POST /notifications/read, so carrying any
   * other id would mean holding two identifiers for one row. */
  it("keeps the opaque key as the id", () => {
    expect(toContributorNotification(row("payout_sent")).id).toBe("k:payout_sent");
    expect(toStaffNotification(row("payout_sent")).id).toBe("k:payout_sent");
  });
});

describe("announcements", () => {
  const announcement = {
    ...row("announcement"),
    body: "Line one\nLine two",
    action_label: "Open wallet",
    action_url: "/contributor/dashboard",
  };

  it("maps to an announcement for every role, with its button", () => {
    const contributor = toContributorNotification(announcement);
    const staff = toStaffNotification(announcement);
    expect(contributor.category).toBe("announcement");
    expect(staff.category).toBe("announcement");
    expect(contributor.action).toEqual({ label: "Open wallet", url: "/contributor/dashboard" });
    expect(staff.action).toEqual({ label: "Open wallet", url: "/contributor/dashboard" });
    /* The sheet shows the body in full, line breaks and all. */
    expect(contributor.body).toBe("Line one\nLine two");
  });

  it("has no button without both halves, or with a link the bell cannot follow", () => {
    expect(toStaffNotification({ ...announcement, action_url: null }).action).toBeUndefined();
    expect(toStaffNotification({ ...announcement, action_url: "//evil.example" }).action).toBeUndefined();
    expect(toStaffNotification({ ...announcement, action_url: "http://a.example" }).action).toBeUndefined();
    expect(toStaffNotification({ ...announcement, action_url: "https://a.example" }).action).toEqual({
      label: "Open wallet",
      url: "https://a.example",
    });
  });
});

describe("queue items", () => {
  it("sends an intern's clips to the review desk", () => {
    const mapped = toStaffNotification({ ...row("queue"), recording_id: "r1" });
    expect(mapped.category).toBe("review-queue");
    expect(mapped.link).toBe("/intern/review");
  });

  it("leaves an annotator's session item as it was", () => {
    const mapped = toStaffNotification({ ...row("queue"), session_id: "s1" });
    expect(mapped.category).toBe("review-queue");
    expect(mapped.link).toBeUndefined();
  });

  it.each([
    ["prompts:u1", "prompt"],
    ["stimuli:u1", "stimuli"],
  ])("tells a contributor's %s apart by its key", (key, mode) => {
    const mapped = toContributorNotification({ ...row("queue"), key });
    expect(mapped.category).toBe("new-work");
    expect(mapped.studioMode).toBe(mode);
  });
});

/* The sheet shows every kind's text, not only an announcement's. */
describe("the message", () => {
  it("is kept for every kind", () => {
    expect(toContributorNotification({ ...row("queue"), body: "New sentences have been added." }).body).toBe(
      "New sentences have been added."
    );
  });
});

/* Opening our own site in a new window signed people out of the installed app. */
describe("links to this studio", () => {
  it("are followed inside the app, even written in full", () => {
    const own = toContributorNotification({
      ...row("announcement"),
      action_label: "Open",
      action_url: `${window.location.origin}/contributor/dashboard?tab=wallet`,
    });
    expect(own.action).toEqual({ label: "Open", url: "/contributor/dashboard?tab=wallet" });

    const other = toContributorNotification({
      ...row("announcement"),
      action_label: "Read",
      action_url: "https://example.org/news",
    });
    expect(other.action).toEqual({ label: "Read", url: "https://example.org/news" });
  });
});
