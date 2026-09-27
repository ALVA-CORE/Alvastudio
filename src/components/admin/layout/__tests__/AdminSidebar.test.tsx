import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AuthProvider } from "@/lib/auth/context";
import { AdminSidebar } from "../AdminSidebar";
import { ADMIN_NAV_ITEMS } from "../adminNav";

function renderAt(pathname: string) {
  /* The rail reads the signed-in account to scope itself. With no stored
   * token the provider is inert and the user is null, which the permission
   * check treats as unrestricted — so every area renders. */
  return render(
    <MemoryRouter initialEntries={[pathname]}>
      <AuthProvider>
        <AdminSidebar />
      </AuthProvider>
    </MemoryRouter>
  );
}

describe("AdminSidebar", () => {
  it("renders every area", () => {
    renderAt("/admin/dashboard");
    const nav = screen.getByRole("navigation", { name: "Admin navigation" });
    expect(nav.querySelectorAll("button")).toHaveLength(ADMIN_NAV_ITEMS.length);

    for (const item of ADMIN_NAV_ITEMS) {
      expect(screen.getByRole("button", { name: item.label })).toBeInTheDocument();
    }
  });

  it("marks exactly one item current", () => {
    renderAt("/admin/prompts");
    const current = screen
      .getByRole("navigation", { name: "Admin navigation" })
      .querySelectorAll('[aria-current="page"]');

    expect(current).toHaveLength(1);
    expect(current[0]).toHaveAttribute("aria-label", "Prompts");
  });
});
