import { describe, expect, it } from "vitest";
import { bankLogo } from "@/lib/bank-logos";

describe("bankLogo", () => {
  it("finds a logo from the bank's name", () => {
    expect(bankLogo("Guaranty Trust Bank")).toEqual({ src: "/banks/guaranty_trust_bank.svg", filled: true });
    expect(bankLogo("UBA")).toEqual({ src: "/banks/united_bank_for_africa.svg", filled: false });
  });

  it("tells look-alike names apart", () => {
    expect(bankLogo("First City Monument Bank")?.src).toBe("/banks/fcmb.svg");
    expect(bankLogo("First Bank of Nigeria")?.src).toBe("/banks/first_bank.svg");
    expect(bankLogo("Union Bank of Nigeria")?.src).toBe("/banks/union_bank.svg");
    expect(bankLogo("ALAT by WEMA")?.src).toBe("/banks/alat_by_wema.svg");
  });

  it("has none for a bank it does not know", () => {
    expect(bankLogo("OPay")).toBeNull();
  });
});
