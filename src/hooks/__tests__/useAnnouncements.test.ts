import { describe, expect, it } from "vitest";
import {
  EMPTY_ANNOUNCEMENT,
  formProblems,
  toAudience,
  toCreate,
  toPatch,
  type AnnouncementForm,
} from "@/hooks/useAnnouncements";

const form = (patch: Partial<AnnouncementForm> = {}): AnnouncementForm => ({
  ...EMPTY_ANNOUNCEMENT,
  title: "Office closed",
  body: "Closed on Friday.",
  ...patch,
});

/** Every array anywhere in a payload. */
function arrays(value: unknown): unknown[][] {
  if (Array.isArray(value)) return [value, ...value.flatMap(arrays)];
  if (value && typeof value === "object") return Object.values(value).flatMap(arrays);
  return [];
}

describe("announcement payloads", () => {
  /* An empty list is a 422; nothing chosen means the field is left out. */
  it("leaves the audience out when nothing is chosen", () => {
    const payload = toCreate(form({ emails: " \n , " }));
    expect(payload).not.toHaveProperty("audience");
    expect(arrays(payload)).toEqual([]);
  });

  it("never sends an empty list, whatever is chosen", () => {
    const payload = toCreate(form({ roles: ["intern"], emails: "A@x.com, a@x.com\nb@y.com" }));
    expect(payload.audience).toEqual({ roles: ["intern"], emails: ["a@x.com", "b@y.com"] });
    for (const list of arrays(payload)) expect(list.length).toBeGreaterThan(0);
  });

  it("keeps approved=false, which is a real choice", () => {
    expect(toAudience(form({ approved: "waiting" }))).toEqual({ approved: false });
  });

  it("sends the button only as a pair", () => {
    expect(toCreate(form({ actionLabel: "Open", actionUrl: "" }))).not.toHaveProperty("action_label");
    expect(toCreate(form({ actionLabel: "Open", actionUrl: "/contributor/dashboard" }))).toMatchObject({
      action_label: "Open",
      action_url: "/contributor/dashboard",
    });
  });

  it("patches only what changed", () => {
    const before = form({ roles: ["intern"], actionLabel: "Open", actionUrl: "/x" });
    expect(toPatch({ ...before }, before)).toEqual({});
    expect(toPatch({ ...before, title: "New title" }, before)).toEqual({ title: "New title" });
  });

  /* The audience replaces the stored one, so clearing every condition is
     `{}` (everybody), never a field holding `[]`. */
  it("replaces a cleared audience with no conditions", () => {
    const before = form({ roles: ["intern"] });
    const patch = toPatch({ ...before, roles: [] }, before);
    expect(patch).toEqual({ audience: {} });
    expect(arrays(patch)).toEqual([]);
  });

  it("clears the button as a pair", () => {
    const before = form({ actionLabel: "Open", actionUrl: "/x" });
    expect(toPatch({ ...before, actionLabel: "", actionUrl: "" }, before)).toEqual({
      action_label: null,
      action_url: null,
    });
  });

  it("asks for both halves of the button, and a usable link", () => {
    expect(formProblems(form({ actionLabel: "Open" }))).toHaveProperty("action_url");
    expect(formProblems(form({ actionUrl: "/x" }))).toHaveProperty("action_label");
    expect(formProblems(form({ actionLabel: "Open", actionUrl: "//evil.example" }))).toHaveProperty(
      "action_url"
    );
    expect(formProblems(form({ actionLabel: "Open", actionUrl: "/contributor/dashboard" }))).toEqual({});
  });
});
