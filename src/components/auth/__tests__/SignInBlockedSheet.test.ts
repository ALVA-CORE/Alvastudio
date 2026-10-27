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

/**
 * A full platform is not a refusal of the person.
 *
 * The account is made and everything they typed is kept; what is deferred is
 * the way in. It opens a sheet rather than an inline error because there is
 * nothing on the form to change, and a line under a field invites another go
 * at a thing that worked.
 */
describe("signInBlock, at capacity", () => {
  it("opens for a platform that is not taking anybody new", () => {
    expect(signInBlock(new ApiError(403, "Alva Studio is at capacity"))).toBe("full");
    expect(signInBlock(new ApiError(403, "Registration is closed"))).toBe("full");
  });

  it("wins over the other 403s, because it is the reason they cannot get in", () => {
    /* An account can be both unapproved and arriving at a closed door. The
       closed door is the thing they can do nothing about, so it is what they
       are told. */
    expect(
      signInBlock(new ApiError(403, "Registration is closed, we are at capacity"))
    ).toBe("full");
  });

  it("leaves an ordinary 403 alone", () => {
    expect(signInBlock(new ApiError(403, "You do not have access to that."))).toBeNull();
  });
});

/**
 * Trying again with the same details is not a mistake to correct.
 *
 * Somebody on the waiting list who signs up again gets the same answer as
 * the first time, so they see the same sheet rather than a red line under
 * the email field implying they typed something wrong.
 */
describe("isAlreadyRegistered", () => {
  it("recognises the wordings an API uses for a taken email", () => {
    for (const message of [
      "Email already registered",
      "A user with this email already exists",
      "That email is already taken",
      "Email is already in use",
    ]) {
      expect(new ApiError(400, message).isAlreadyRegistered).toBe(true);
    }
  });

  it("leaves ordinary validation alone", () => {
    expect(new ApiError(422, "Password is too short").isAlreadyRegistered).toBe(false);
    expect(new ApiError(422, "Enter a valid email").isAlreadyRegistered).toBe(false);
  });

  it("is never true for a server fault", () => {
    /* A 500 that happens to say "already" is not a duplicate account, and
       telling somebody they are on a list they are not on is worse than
       showing them the error. */
    expect(
      new ApiError(500, "already processing").isAlreadyRegistered
    ).toBe(false);
  });
});
