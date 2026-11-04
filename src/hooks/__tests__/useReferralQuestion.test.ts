import { renderHook, waitFor, act } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const getProfile = vi.fn();
const upsertProfile = vi.fn();

vi.mock("@/lib/api/onboarding", () => ({
  getProfile: () => getProfile(),
  upsertProfile: (patch: unknown) => upsertProfile(patch),
}));

const { useReferralQuestion } = await import("../useReferralQuestion");

describe("useReferralQuestion", () => {
  beforeEach(() => {
    getProfile.mockReset();
    upsertProfile.mockReset().mockResolvedValue({});
  });

  it("asks a contributor who never answered", async () => {
    getProfile.mockResolvedValue({ age_bracket: "25_34", referral_source: null });
    const { result } = renderHook(() => useReferralQuestion(true));
    await waitFor(() => expect(result.current.needed).toBe(true));
  });

  /* Answered at sign-up: hidden. */
  it("stays hidden for anyone who answered", async () => {
    getProfile.mockResolvedValue({ referral_source: "instagram" });
    const { result } = renderHook(() => useReferralQuestion(true));
    await waitFor(() => expect(getProfile).toHaveBeenCalled());
    expect(result.current.needed).toBe(false);
  });

  it("asks nobody but contributors", () => {
    const { result } = renderHook(() => useReferralQuestion(false));
    expect(getProfile).not.toHaveBeenCalled();
    expect(result.current.needed).toBe(false);
  });

  /* The API refuses a detail beside any source but `other`. */
  it("sends the detail with `other` only, then stops asking", async () => {
    getProfile.mockResolvedValue(null);
    const { result } = renderHook(() => useReferralQuestion(true));
    await waitFor(() => expect(result.current.needed).toBe(true));

    await act(() => result.current.save("instagram", "ignored"));
    expect(upsertProfile).toHaveBeenLastCalledWith({ referral_source: "instagram" });
    expect(result.current.needed).toBe(false);

    await act(() => result.current.save("other", " Radio "));
    expect(upsertProfile).toHaveBeenLastCalledWith({
      referral_source: "other",
      referral_source_detail: "Radio",
    });
  });
});
