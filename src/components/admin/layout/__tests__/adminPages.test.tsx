import type React from "react";
import { describe, expect, it } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
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

  /* The heading is outside the loading branch, so it is there immediately —
   * the body is not. A page that renders its content on the first frame has
   * lost its skeleton, and the layout will jump when real data arrives. */
  it.each(PAGES)("%s shows a skeleton before its content", (id, Page) => {
    renderPage(Page);

    expect(document.querySelector('[aria-busy="true"]')).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 1, name: adminNavItem(id).title })
    ).toBeInTheDocument();
  });

  it.each(PAGES)("%s renders its content once loaded", async (_id, Page) => {
    renderPage(Page);
    await waitFor(() =>
      expect(document.querySelector('[aria-busy="true"]')).not.toBeInTheDocument()
    );
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
  it("links each stuck-work row to the page that can clear it", async () => {
    renderPage(AdminDashboardPage);

    const panel = (await screen.findByText("Needs attention")).closest("section");
    expect(panel).toBeTruthy();

    const rows = within(panel as HTMLElement).getAllByRole("button");
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      expect(row.textContent).toMatch(/\d/);
    }
  });
});
