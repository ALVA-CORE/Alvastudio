import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("../FloatingBottomNav", () => ({ FloatingBottomNav: () => <nav aria-label="Bottom nav" /> }));
vi.mock("@/components/contributors/ContributorNudges", () => ({ ContributorNudges: () => null }));

const { AppShell } = await import("../AppShell");

const at = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <AppShell>
        <p>Page</p>
      </AppShell>
    </MemoryRouter>
  );

/* Notifications has its own back arrow; the bottom nav is not shown there. */
describe("AppShell, contributor", () => {
  it("hides the bottom nav on notifications", () => {
    at("/contributor/notifications");
    expect(screen.queryByRole("navigation", { name: "Bottom nav" })).not.toBeInTheDocument();
  });

  it("shows it everywhere else", () => {
    at("/contributor/dashboard");
    expect(screen.getByRole("navigation", { name: "Bottom nav" })).toBeInTheDocument();
  });
});
