import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api/users", () => ({ listUserProfilesPage: vi.fn(), USER_PROFILES_MAX_LIMIT: 500 }));

const { canonicalState } = await import("../useContributorDirectory");

/* State is typed, not picked. One state, however it was spelled. */
describe("canonicalState", () => {
  it("folds the usual spellings into one state", () => {
    expect(canonicalState("Lagos")).toBe("Lagos");
    expect(canonicalState("  lagos state ")).toBe("Lagos");
    expect(canonicalState("Akwa-Ibom")).toBe("Akwa Ibom");
    expect(canonicalState("Abuja")).toBe("FCT");
    expect(canonicalState("cross  river")).toBe("Cross River");
  });

  it("guesses at nothing", () => {
    expect(canonicalState("Lagoss")).toBeNull();
    expect(canonicalState("")).toBeNull();
    expect(canonicalState(null)).toBeNull();
  });
});
