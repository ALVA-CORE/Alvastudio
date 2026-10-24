import { describe, expect, it } from "vitest";
import { signInBlock } from "../SignInBlockedSheet";
import { ApiError } from "@/lib/api/client";

/**
 * Only two refusals are about the account rather than what was typed.
 *
 * Everything else belongs under the password field, where somebody can act
 * on it. Opening a sheet over a typo would make a wrong password feel like
 * being locked out.
 */
describe("signInBlock", () => {
  it("opens for an account waiting on approval", () => {
    expect(
      signInBlock(new ApiError(403, "Annotator account is awaiting admin approval"))
    ).toBe("pending");
    expect(
      signInBlock(new ApiError(403, "Intern account is awaiting admin approval"))
    ).toBe("pending");
  });

  it("opens for an account that has been turned off", () => {
    expect(signInBlock(new ApiError(403, "Inactive account"))).toBe("suspended");
  });

  it("stays shut for a wrong password", () => {
    expect(signInBlock(new ApiError(401, "Incorrect email or password"))).toBeNull();
  });

  it("stays shut for a deleted account", () => {
    /* The API answers a deleted account exactly as it answers a typo, so the
       sign-in form cannot be used to find out who has an account. We cannot
       tell them apart, and must not guess. */
    expect(signInBlock(new ApiError(401, "Incorrect email or password"))).toBeNull();
  });

  it("stays shut for anything that is not an API error", () => {
    expect(signInBlock(new Error("boom"))).toBeNull();
    expect(signInBlock(null)).toBeNull();
  });
});
