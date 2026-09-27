import { describe, expect, it } from "vitest";
import { allowedAdminAreas, canOpenAdminArea } from "../adminPermissions";
import { ADMIN_NAV_ITEMS } from "@/components/admin/layout/adminNav";

describe("admin permissions", () => {
  /* The bootstrap admin, and anyone created before permissions existed, must
   * not be locked out of their own product by a missing field. */
  it("treats undefined as unrestricted", () => {
    for (const item of ADMIN_NAV_ITEMS) {
      expect(canOpenAdminArea(item.id, undefined)).toBe(true);
    }
  });

  /* An admin who can open nothing still has to land somewhere, and still has
   * to reach their own account. */
  it("always allows the overview and settings", () => {
    expect(canOpenAdminArea("overview", [])).toBe(true);
    expect(canOpenAdminArea("settings", [])).toBe(true);
  });

  it("gates everything else on the list", () => {
    expect(canOpenAdminArea("payments", [])).toBe(false);
    expect(canOpenAdminArea("payments", ["payments"])).toBe(true);
    expect(canOpenAdminArea("users", ["payments"])).toBe(false);
  });

  it("filters the nav down to what is allowed", () => {
    const ids = allowedAdminAreas(ADMIN_NAV_ITEMS, ["prompts", "corpus"]).map(
      (item) => item.id
    );

    expect(ids).toEqual(
      expect.arrayContaining(["overview", "settings", "prompts", "corpus"])
    );
    expect(ids).not.toContain("payments");
    expect(ids).not.toContain("users");
  });
});
