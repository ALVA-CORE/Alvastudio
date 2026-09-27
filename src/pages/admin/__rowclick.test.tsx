import { describe, expect, it } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import AdminReviewsPage from "@/pages/admin/AdminReviewsPage";

describe("row click", () => {
  it("opens the detail panel", async () => {
    render(
      <MemoryRouter>
        <AdminReviewsPage />
      </MemoryRouter>
    );

    await waitFor(() =>
      expect(document.querySelector('[aria-busy="true"]')).not.toBeInTheDocument()
    );

    const cell = await screen.findByText(/^REC-/);
    await userEvent.click(cell);

    await waitFor(() => {
      const dialogs = screen.queryAllByRole("dialog");
      expect(dialogs.length).toBeGreaterThan(0);
    });
  });
});
