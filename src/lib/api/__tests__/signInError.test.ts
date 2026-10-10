import { describe, expect, it, vi, afterEach } from "vitest";
import { ApiError } from "@/lib/api/client";
import { signInErrorMessage } from "@/lib/api/signInError";

function apiError(status: number, message: string, offline = false) {
  const error = new ApiError(status, message);
  if (status === 0) {
    error.unreachable = true;
    error.offline = offline;
  }
  return error;
}

afterEach(() => vi.unstubAllGlobals());

describe("signInErrorMessage", () => {
  it("names the connection only when the browser says there is none", () => {
    expect(signInErrorMessage(apiError(0, "x", true))).toMatch(/offline/i);
  });

  /* The bug this exists for: a missing CORS origin rejects before our code
   * sees anything, so it arrives identical to being offline. Telling someone
   * on a working connection that they are offline sends them to reset their
   * router instead of telling us. */
  it("does not claim someone is offline when the request simply got no answer", () => {
    const message = signInErrorMessage(apiError(0, "x", false));
    expect(message).not.toMatch(/offline/i);
    expect(message).toMatch(/can't reach/i);
  });

  it("reads a pending intern as waiting, not as refused", () => {
    const message = signInErrorMessage(
      apiError(403, "Intern account is awaiting admin approval")
    );
    expect(message).toMatch(/waiting for approval/i);
    expect(message).not.toMatch(/access|permission/i);
  });

  it("reads a suspended account as switched off, not as a bad password", () => {
    const message = signInErrorMessage(apiError(403, "Inactive account"));
    expect(message).toMatch(/turned off/i);
    expect(message).not.toMatch(/password/i);
  });

  it("keeps the generic 403 for an actual permissions refusal", () => {
    expect(signInErrorMessage(apiError(403, "You do not have access to that."))).toBe(
      "You do not have access to that."
    );
  });

  it("calls a 401 a wrong password rather than an expired session", () => {
    const message = signInErrorMessage(apiError(401, "Your session has expired."));
    expect(message).toMatch(/email or password/i);
    expect(message).not.toMatch(/expired/i);
  });

  it("covers rate limiting and server faults without naming a status code", () => {
    expect(signInErrorMessage(apiError(429, "Too Many Requests"))).toMatch(
      /too many sign-in attempts/i
    );
    expect(signInErrorMessage(apiError(503, "boom"))).toMatch(/on our side/i);
  });

  it("falls back for something that is not an ApiError at all", () => {
    expect(signInErrorMessage(new TypeError("Failed to fetch"))).toBe(
      "Something went wrong. Please try again."
    );
  });

  it("never leaks technical wording", () => {
    const cases = [
      apiError(0, "x", true),
      apiError(0, "x", false),
      apiError(401, "nope"),
      apiError(403, "Intern account is awaiting admin approval"),
      apiError(403, "Inactive account"),
      apiError(429, "nope"),
      apiError(500, "nope"),
    ];

    for (const error of cases) {
      const message = signInErrorMessage(error);
      expect(message).not.toMatch(/CORS|preflight|fetch|origin|header|401|403|500|HTTP/i);
    }
  });
});
