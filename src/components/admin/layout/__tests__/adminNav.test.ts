import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  ADMIN_NAV_ITEMS,
  adminNavItem,
  getActiveAdminNav,
} from "../adminNav";
import { homePathForRole } from "@/lib/auth/roles";

const routeSource = readFileSync("src/routes/index.tsx", "utf8");

describe("admin nav", () => {
  it("routes every nav item", () => {
    for (const item of ADMIN_NAV_ITEMS) {
      expect(routeSource).toContain(`path="${item.path}"`);
    }
  });

  it("gives admins their own home", () => {
    expect(homePathForRole("admin")).toBe("/admin/dashboard");
    expect(ADMIN_NAV_ITEMS[0].path).toBe(homePathForRole("admin"));
  });

  it("has unique ids and paths", () => {
    expect(new Set(ADMIN_NAV_ITEMS.map((i) => i.id)).size).toBe(ADMIN_NAV_ITEMS.length);
    expect(new Set(ADMIN_NAV_ITEMS.map((i) => i.path)).size).toBe(ADMIN_NAV_ITEMS.length);
  });

  it("names what it is blocked on whenever it is not ready", () => {
    for (const item of ADMIN_NAV_ITEMS) {
      if (item.status !== "ready") expect(item.blockedBy).toBeTruthy();
    }
  });

  it("highlights the item whose path matches", () => {
    for (const item of ADMIN_NAV_ITEMS) {
      expect(getActiveAdminNav(item.path)).toBe(item.id);
    }
  });

  it("highlights the parent from a detail route", () => {
    expect(getActiveAdminNav("/admin/prompts/42")).toBe("prompts");
    expect(getActiveAdminNav("/admin/focus-groups/abc/participants")).toBe(
      "focus-groups"
    );
  });

  /* A prefix test would match "/admin/focus-groups" against any shorter
   * sibling that happened to be a prefix of it; longest-match is what stops
   * the rail highlighting two rows. */
  it("does not let a shorter path shadow a longer one", () => {
    expect(getActiveAdminNav("/admin/focus-groups")).toBe("focus-groups");
  });

  it("falls back to the overview", () => {
    expect(getActiveAdminNav("/admin")).toBe("overview");
    expect(getActiveAdminNav("/admin/dashboard")).toBe("overview");
    expect(getActiveAdminNav("/annotator/sessions")).toBe("overview");
  });

  it("throws on an unknown id rather than rendering a blank page", () => {
    // @ts-expect-error — deliberately outside the union
    expect(() => adminNavItem("nope")).toThrow();
  });
});
