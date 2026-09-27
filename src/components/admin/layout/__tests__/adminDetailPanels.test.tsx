import type React from "react";
import { describe, expect, it } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import AdminReviewsPage from "@/pages/admin/AdminReviewsPage";
import AdminAnnotationsPage from "@/pages/admin/AdminAnnotationsPage";
import AdminFocusGroupsPage from "@/pages/admin/AdminFocusGroupsPage";
import AdminPaymentsPage from "@/pages/admin/AdminPaymentsPage";
import AdminUsersPage from "@/pages/admin/AdminUsersPage";
import AdminPromptsPage from "@/pages/admin/AdminPromptsPage";

/**
 * Every table row opens something.
 *
 * This exists because all six of these were once wired in the page's state and
 * imports but never actually rendered — the JSX insertion silently missed, and
 * nothing caught it because no test clicked a row. A panel you cannot open is
 * indistinguishable from one that was never built.
 */
const PAGES: Array<[string, () => React.ReactElement]> = [
  ["reviews", AdminReviewsPage],
  ["annotations", AdminAnnotationsPage],
  ["focus groups", AdminFocusGroupsPage],
  ["payments", AdminPaymentsPage],
  ["users", AdminUsersPage],
  ["prompts", AdminPromptsPage],
];

describe("admin detail panels", () => {
  it.each(PAGES)("%s opens a panel when a row is clicked", async (_name, Page) => {
    render(
      <MemoryRouter>
        <Page />
      </MemoryRouter>
    );

    await waitFor(() =>
      expect(document.querySelector('[aria-busy="true"]')).not.toBeInTheDocument()
    );

    const rows = document.querySelectorAll("tbody tr");
    expect(rows.length).toBeGreaterThan(0);

    expect(screen.queryAllByRole("dialog")).toHaveLength(0);
    await userEvent.click(rows[0] as HTMLElement);

    await waitFor(() =>
      expect(screen.queryAllByRole("dialog").length).toBeGreaterThan(0)
    );
  });
});
