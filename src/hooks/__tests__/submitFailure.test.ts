import { describe, expect, it } from "vitest";
import { submitFailure } from "../useReviewItem";
import { ApiError } from "@/lib/api/client";

/**
 * A refusal has to say which refusal it was.
 *
 * Every failed verdict used to read "Could not submit, your answers are
 * safe": a clip reassigned to somebody else, a clip already decided and a
 * server being down were the same sentence. The second half was true and the
 * first half told nobody what to do next.
 */
describe("submitFailure", () => {
  it("passes the API's own sentence through", () => {
    expect(
      submitFailure(new ApiError(403, "This recording is assigned to Amaka Nwosu"))
    ).toBe("This recording is assigned to Amaka Nwosu");
  });

  it("names the three refusals that have a next step", () => {
    expect(submitFailure(new ApiError(403, ""))).toContain("somebody else");
    expect(submitFailure(new ApiError(409, ""))).toContain("already has a verdict");
    expect(submitFailure(new ApiError(404, ""))).toContain("no longer there");
  });

  it("does not blame the reviewer when the network is down", () => {
    /* `unreachable` is set by the request layer when the body was not JSON,
       which is what a dead server looks like. Status alone does not say it:
       a real 404 and an unreachable host both arrive as 404. */
    const offline = new ApiError(0, "Cannot reach the server");
    offline.unreachable = true;

    expect(submitFailure(offline)).toContain("No connection");
    expect(submitFailure(offline)).toContain("answers are safe");
  });

  it("tells a real 404 from an unreachable host", () => {
    const missing = new ApiError(404, "Recording not found");
    expect(submitFailure(missing)).toContain("no longer there");

    const down = new ApiError(404, "Not Found");
    down.unreachable = true;
    expect(submitFailure(down)).toContain("No connection");
  });

  it("still reassures on anything it does not recognise", () => {
    expect(submitFailure(new Error("boom"))).toContain("answers are safe");
  });
});
