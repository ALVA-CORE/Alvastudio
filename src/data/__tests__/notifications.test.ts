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
