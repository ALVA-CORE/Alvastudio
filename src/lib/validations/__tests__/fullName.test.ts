import { describe, expect, it } from "vitest";
import { fullNameSchema } from "../auth";

describe("fullNameSchema", () => {
  it("takes a first and a last name, or more", () => {
    expect(fullNameSchema.parse("Ada Okafor")).toBe("Ada Okafor");
    expect(fullNameSchema.parse("  Ngozi   Mary  Eze ")).toBe("Ngozi Mary Eze");
    expect(fullNameSchema.safeParse("Ọlá Adé").success).toBe(true);
  });

  it("refuses one name on its own", () => {
    const result = fullNameSchema.safeParse("Ada");
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe("Enter your first and last name");
    expect(fullNameSchema.safeParse("Ada .").success).toBe(false);
    expect(fullNameSchema.safeParse("   ").success).toBe(false);
  });
});
