import { describe, expect, it } from "vitest";
import {
  fromApiAgeBracket,
  fromApiFluency,
  fromApiGender,
  fromApiVariety,
  toApiAgeBracket,
  toApiFluency,
  toApiGender,
  toApiVariety,
} from "../enums";

/**
 * The frontend and the API were designed independently, so these mappings are
 * the seam. A silent mismatch here writes wrong demographic data, which is the
 * kind of bug nobody notices until the corpus is analysed.
 */

describe("age bracket", () => {
  it("swaps the separator in both directions", () => {
    expect(toApiAgeBracket("25-34")).toBe("25_34");
    expect(fromApiAgeBracket("25_34")).toBe("25-34");
  });

  it("round-trips every bracket the form offers", () => {
    for (const bracket of ["18-24", "25-34", "35-44", "45-54"]) {
      expect(fromApiAgeBracket(toApiAgeBracket(bracket))).toBe(bracket);
    }
  });

  it("folds the API's two oldest buckets into the form's 55+", () => {
    // The form stops at 55+; the API splits 55_64 and 65_plus.
    expect(fromApiAgeBracket("55_64")).toBe("55+");
    expect(fromApiAgeBracket("65_plus")).toBe("55+");
  });

  it("passes through an unknown value rather than blanking it", () => {
    expect(fromApiAgeBracket("90_plus")).toBe("90_plus");
  });

  it("returns undefined for empty input, so the field is omitted from a merge", () => {
    expect(toApiAgeBracket(undefined)).toBeUndefined();
    expect(toApiAgeBracket("")).toBeUndefined();
    expect(fromApiAgeBracket(null)).toBe("");
  });
});

describe("gender", () => {
  it("translates only the hyphenated member", () => {
    expect(toApiGender("prefer-not-to-say")).toBe("prefer_not_to_say");
    expect(fromApiGender("prefer_not_to_say")).toBe("prefer-not-to-say");
    expect(toApiGender("male")).toBe("male");
    expect(fromApiGender("female")).toBe("female");
  });

  it("round-trips every option the form offers", () => {
    for (const gender of ["male", "female", "prefer-not-to-say"]) {
      expect(fromApiGender(toApiGender(gender))).toBe(gender);
    }
  });
});

describe("fluency", () => {
  it("passes the shared members through untouched", () => {
    for (const level of ["none", "basic", "conversational", "fluent"] as const) {
      expect(toApiFluency(level)).toBe(level);
      expect(fromApiFluency(level)).toBe(level);
    }
  });

  it("maps the API-only `native` onto the strongest option the form has", () => {
    expect(fromApiFluency("native")).toBe("fluent");
  });
});

describe("language variety", () => {
  it("maps the two shared varieties both ways", () => {
    expect(toApiVariety("english")).toBe("nigerian_english");
    expect(toApiVariety("pidgin")).toBe("nigerian_pidgin");
    expect(fromApiVariety("nigerian_english")).toBe("english");
    expect(fromApiVariety("nigerian_pidgin")).toBe("pidgin");
  });

  it("sends `both` as pidgin, and does NOT round-trip it", () => {
    // The API enum has no "both". This is lossy on purpose and needs a backend
    // fix rather than a cleverer mapping — see docs/api.md §14.
    expect(toApiVariety("both")).toBe("nigerian_pidgin");
    expect(fromApiVariety(toApiVariety("both"))).toBe("pidgin");
  });

  it("returns empty for an unknown or missing variety", () => {
    expect(fromApiVariety(null)).toBe("");
    expect(fromApiVariety("klingon")).toBe("");
  });
});
