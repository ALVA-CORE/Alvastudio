/**
 * A bank's logo, from its name as `GET /banks` gives it.
 *
 * The files are in `public/banks/`, copied from Paystack's MIT-licensed
 * nigerialogos (LICENSE beside them). They are served from here, not
 * loaded from that site, so nobody else learns which bank a contributor
 * uses. Matched on the name, not the code, because the API's codes are the
 * provider's own. Order matters: the first match wins.
 *
 * `true` marks a logo drawn on its own background, which fills the badge;
 * the others are transparent and go on white.
 */
const LOGOS: [RegExp, string, boolean?][] = [
  [/guaranty|\bgtb/i, "guaranty_trust_bank", true],
  [/zenith/i, "zenith_bank"],
  [/access/i, "access_bank"],
  [/ecobank/i, "ecobank"],
  [/fidelity/i, "fidelity_bank"],
  [/first city|\bfcmb\b/i, "fcmb", true],
  [/first ?bank/i, "first_bank", true],
  [/globus/i, "globus_bank"],
  [/heritage/i, "heritage_bank"],
  [/keystone/i, "keystone_bank"],
  [/kuda/i, "kuda_bank"],
  [/moniepoint/i, "moniepoint"],
  [/polaris/i, "polaris_bank", true],
  [/stanbic/i, "stanbic_ibtc"],
  [/standard chartered/i, "standard_chartered"],
  [/sterling/i, "sterling_bank"],
  [/united bank for africa|\buba\b/i, "united_bank_for_africa"],
  [/union bank/i, "union_bank"],
  [/alat/i, "alat_by_wema", true],
  [/wema/i, "wema_bank"],
  [/carbon/i, "carbon"],
  [/paga/i, "paga"],
];

/** The logo, or null for a bank we have none for. */
export function bankLogo(name: string): { src: string; filled: boolean } | null {
  const match = LOGOS.find(([pattern]) => pattern.test(name));
  return match ? { src: `/banks/${match[1]}.svg`, filled: Boolean(match[2]) } : null;
}
