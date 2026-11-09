import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

const calls: boolean[] = [];
let state = { users: [] as { id: string; fullName: string }[], isLoading: false, error: null as string | null };

vi.mock("@/hooks/useAdminUsers", () => ({
  useAdminUsers: (enabled: boolean) => {
    calls.push(enabled);
    return { ...state, setActive: vi.fn(), approve: vi.fn(), remove: vi.fn(), save: vi.fn() };
  },
}));
vi.mock("@/components/admin/users/UserDetailPanel", () => ({
  UserDetailPanel: ({ open, user }: { open: boolean; user: { fullName: string } | null }) =>
    open ? <p>Panel for {user?.fullName}</p> : null,
}));

const { UserPanelHost } = await import("../UserPanelHost");

describe("UserPanelHost", () => {
  /* The account list is the expensive part, so nothing is read until asked. */
  it("reads no accounts until somebody is opened", () => {
    calls.length = 0;
    render(<UserPanelHost userId={null} onClose={() => undefined} />);
    expect(calls.every((enabled) => enabled === false)).toBe(true);
  });

  it("opens the person once their account is in", async () => {
    calls.length = 0;
    state = { users: [], isLoading: false, error: null };
    const { rerender } = render(<UserPanelHost userId="u2" onClose={() => undefined} />);
    expect(calls.at(-1)).toBe(true);
    /* An empty list before it has loaded is not "missing". */
    expect(screen.queryByText(/Panel for/)).not.toBeInTheDocument();

    state = { users: [{ id: "u1", fullName: "Esther Obi" }, { id: "u2", fullName: "Ada Obi" }], isLoading: false, error: null };
    rerender(<UserPanelHost userId="u2" onClose={() => undefined} />);
    await waitFor(() => expect(screen.getByText("Panel for Ada Obi")).toBeInTheDocument());
  });
});
