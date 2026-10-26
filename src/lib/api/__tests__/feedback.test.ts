import { describe, expect, it } from "vitest";
import { ApiError } from "@/lib/api/client";
import { feedbackMailto, isMissingRoute, SUPPORT_EMAIL } from "@/lib/api/feedback";

/**
 * The form ships before the route exists, so the fallback is the feature.
 *
 * If `isMissingRoute` were wrong in either direction somebody loses what they
 * wrote: too narrow and a 404 shows as an error, too broad and a real refusal
 * silently opens a mail client instead of being shown.
 */
describe("feedback fallback", () => {
  const draft = {
    kind: "bug" as const,
    rating: 4,
    message: "The record button does nothing on my phone",
    page: "/contributor/studio",
  };

  it("treats a missing route as missing, and nothing else", () => {
    expect(isMissingRoute(new ApiError(404, "Not Found"))).toBe(true);
    expect(isMissingRoute(new ApiError(405, "Method Not Allowed"))).toBe(true);

    expect(isMissingRoute(new ApiError(422, "message: too short"))).toBe(false);
    expect(isMissingRoute(new ApiError(429, "Slow down"))).toBe(false);
    expect(isMissingRoute(new ApiError(500, "Server error"))).toBe(false);
    expect(isMissingRoute(new Error("offline"))).toBe(false);
  });

  it("carries everything the form collected into the email", () => {
    const link = feedbackMailto(draft, "ada@example.com");
    const body = decodeURIComponent(link.split("&body=")[1]);

    expect(link.startsWith(`mailto:${SUPPORT_EMAIL}?`)).toBe(true);
    expect(body).toContain("The record button does nothing on my phone");
    expect(body).toContain("Rating: 4 of 5");
    expect(body).toContain("Page: /contributor/studio");
    expect(body).toContain("From: ada@example.com");
  });

  it("leaves the sender out when nobody is signed in", () => {
    const body = decodeURIComponent(feedbackMailto(draft, null).split("&body=")[1]);

    expect(body).toContain("Rating: 4 of 5");
    expect(body).not.toContain("From:");
  });
});
