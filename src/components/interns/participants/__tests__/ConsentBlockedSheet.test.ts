import { describe, expect, it } from "vitest";
import { namesFromConsentError } from "../ConsentBlockedSheet";

/**
 * The refusal carries the session id and the rule as well as the names, and
 * the intern only needs the names. Getting this wrong shows them a sentence
 * about their own session id, which tells them nothing.
 */
describe("namesFromConsentError", () => {
  it("takes the names off the end of the refusal", () => {
    expect(
      namesFromConsentError(
        "Every participant must agree before audio is processed. Not agreed: Bayo, Ngozi."
      )
    ).toEqual(["Bayo", "Ngozi"]);
  });

  it("handles a single name", () => {
    expect(namesFromConsentError("... Not agreed: Bayo.")).toEqual(["Bayo"]);
  });

  it("returns nothing when the message is not that one", () => {
    /* A 409 can mean other things. An empty list hides the names block
       rather than printing a fragment of whatever did arrive. */
    expect(namesFromConsentError("Session already has audio.")).toEqual([]);
  });
});
