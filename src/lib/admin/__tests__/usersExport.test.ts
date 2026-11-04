import { describe, expect, it, vi } from "vitest";
import type { AdminUser } from "@/data/admin/users";
import type { ApiUserProfiles } from "@/lib/api/users";

const bulk = vi.fn();

vi.mock("@/lib/api/users", () => ({
  USER_PROFILES_MAX_LIMIT: 2,
  listUserProfilesPage: (query: unknown) => bulk(query),
  getUserProfiles: vi.fn(async (id: string) => {
    if (id === "broken") throw new Error("500");
    return { user_id: id } as ApiUserProfiles;
  }),
}));

const { ApiError } = await import("@/lib/api/client");

const { fetchProfilesFor, usersToCsv } = await import("../usersExport");

const user = (id: string, extra: Partial<AdminUser> = {}): AdminUser => ({
  id,
  fullName: "Ada Okafor",
  email: "ada@example.com",
  phone: "+2348012345678",
  role: "contributor",
  isActive: true,
  createdAt: Date.UTC(2026, 9, 3),
  joinedLabel: "",
  output: 0,
  outputLabel: "",
  ...extra,
});

describe("usersToCsv", () => {
  it("writes the profile beside the account", () => {
    const profiles = new Map<string, ApiUserProfiles>([
      [
        "u1",
        {
          user_id: "u1",
          role: "contributor",
          approved: true,
          profile: {
            age_bracket: "25_34",
            gender: "female",
            state_of_origin: "Anambra",
            native_languages: ["Igbo", "English"],
            preferred_language_variety: "nigerian_pidgin",
          },
          intern_profile: null,
          annotator_profile: null,
          identity: {
            identity_status: "verified",
            identity_verified: true,
            identity_failure_reason: null,
            wallet_status: "active",
            next_action: null,
            next_action_detail: null,
          },
        },
      ],
    ]);

    const [header, row] = usersToCsv([user("u1")], profiles)
      .replace(/^\ufeff/, "")
      .split("\r\n");
    const cells = Object.fromEntries(
      header.split(",").map((name, index) => [name, row.split(",")[index]])
    );

    expect(cells).toMatchObject({
      full_name: "Ada Okafor",
      phone: "+2348012345678",
      joined: "2026-10-03",
      age_bracket: "25-34",
      gender: "female",
      state_of_origin: "Anambra",
      native_languages: "Igbo; English",
      preferred_variety: "nigerian pidgin",
      identity_verified: "yes",
    });
  });

  /* A profile that could not be read is blank columns, not a missing person. */
  it("keeps an account whose profile is missing", () => {
    const lines = usersToCsv([user("u1")], new Map()).split("\r\n");
    expect(lines).toHaveLength(2);
    expect(lines[1]).toMatch(/^Ada Okafor,ada@example.com/);
  });
});

describe("fetchProfilesFor", () => {
  /* One request per 500 people, not one per person. */
  it("pages the bulk route and keeps only the accounts in view", async () => {
    const row = (id: string) => ({
      user_id: id,
      role: "contributor",
      approved: true,
      profile: null,
      intern_profile: null,
      annotator_profile: null,
      email: `${id}@example.com`,
      full_name: id,
      is_active: true,
      created_at: "2026-11-01T00:00:00Z",
    });
    bulk.mockReset().mockImplementation(async ({ offset }: { offset: number }) => ({
      items: [[row("a"), row("x")], [row("c")]][offset / 2] ?? [],
      total: 3,
      limit: 2,
      offset,
    }));

    const progress: [number, number][] = [];
    const { profiles, failed } = await fetchProfilesFor(
      [user("a"), user("c"), user("gone")],
      (done, total) => progress.push([done, total])
    );

    expect(bulk).toHaveBeenCalledTimes(2);
    /* Everyone in view is a contributor, so the role narrows the request. */
    expect(bulk).toHaveBeenCalledWith({ role: "contributor", limit: 2, offset: 0 });
    expect([...profiles.keys()].sort()).toEqual(["a", "c"]);
    expect(profiles.get("a")).toMatchObject({ user_id: "a", identity: null });
    expect(failed).toBe(1);
    expect(progress.at(-1)).toEqual([3, 3]);
  });

  /* An API from before 3 Nov reads the path as `/users/{id}`. */
  it("falls back to one request each when the bulk route is missing", async () => {
    bulk.mockReset().mockRejectedValue(new ApiError(404, "User not found"));
    const { profiles } = await fetchProfilesFor([user("a"), user("c")]);
    expect([...profiles.keys()].sort()).toEqual(["a", "c"]);
  });

  it("counts failures without dropping the rest", async () => {
    bulk.mockReset().mockRejectedValue(new ApiError(404, "User not found"));
    const progress: number[] = [];
    const { profiles, failed } = await fetchProfilesFor(
      [user("a"), user("broken"), user("c")],
      (done) => progress.push(done)
    );
    expect([...profiles.keys()].sort()).toEqual(["a", "c"]);
    expect(failed).toBe(1);
    expect(progress.at(-1)).toBe(3);
  });
});
