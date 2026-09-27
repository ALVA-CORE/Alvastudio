import type React from "react";
import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ADMIN_NAV_ITEMS, adminNavItem } from "../adminNav";
import AdminDashboardPage from "@/pages/admin/AdminDashboardPage";
import AdminPromptsPage from "@/pages/admin/AdminPromptsPage";
import AdminUsersPage from "@/pages/admin/AdminUsersPage";
import AdminCorpusPage from "@/pages/admin/AdminCorpusPage";
import AdminReviewsPage from "@/pages/admin/AdminReviewsPage";
import AdminAnnotationsPage from "@/pages/admin/AdminAnnotationsPage";
import AdminFocusGroupsPage from "@/pages/admin/AdminFocusGroupsPage";
import AdminPaymentsPage from "@/pages/admin/AdminPaymentsPage";
import AdminAudioPage from "@/pages/admin/AdminAudioPage";

/** Every page but Settings, which needs the auth provider to say who you are. */
const PAGES = [
  ["overview", AdminDashboardPage],
  ["prompts", AdminPromptsPage],
  ["users", AdminUsersPage],
  ["corpus", AdminCorpusPage],
  ["reviews", AdminReviewsPage],
  ["annotations", AdminAnnotationsPage],
  ["focus-groups", AdminFocusGroupsPage],
  ["payments", AdminPaymentsPage],
  ["audio", AdminAudioPage],
] as const;

function renderPage(Page: () => React.ReactElement) {
  return render(
    <MemoryRouter>
      <Page />
    </MemoryRouter>
  );
}

describe("admin pages", () => {
  it.each(PAGES)("%s renders with its own heading", (id, Page) => {
    renderPage(Page);
    expect(
      screen.getByRole("heading", { level: 1, name: adminNavItem(id).title })
    ).toBeInTheDocument();
  });

  /* Every one of these screens is drawn from sample data. A page that looks
   * finished and is quietly inventing its numbers is the failure mode this
   * whole surface has to avoid, so the disclosure is a test, not a nicety. */
  it.each(PAGES)("%s says it is on sample data", (_id, Page) => {
    renderPage(Page);
    expect(screen.getByText(/Sample data/)).toBeInTheDocument();
  });

  it("covers every nav item that has a page", () => {
    const covered = new Set(PAGES.map(([id]) => id));
    const missing = ADMIN_NAV_ITEMS.filter(
      (item) => item.id !== "settings" && !covered.has(item.id)
    );
    expect(missing.map((item) => item.id)).toEqual([]);
  });
});

describe("admin overview", () => {
  it("links each stuck-work row to the page that can clear it", () => {
    renderPage(AdminDashboardPage);

    const panel = screen.getByText("Needs attention").closest("section");
    expect(panel).toBeTruthy();

    const rows = within(panel as HTMLElement).getAllByRole("button");
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      expect(row.textContent).toMatch(/\d/);
    }
  });
});
