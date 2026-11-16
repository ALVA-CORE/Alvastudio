import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import ContributorNotificationsPage from "@/pages/contributors/ContributorNotificationsPage";
import type { ApiNotification } from "@/lib/api/notifications";

const at = new Date().toISOString();

const ITEMS: ApiNotification[] = [
  { key: "prompts:u1", kind: "queue", title: "New sentences to read", body: "", created_at: at },
  { key: "stimuli:u1", kind: "queue", title: "New topics to narrate", body: "", created_at: at },
  {
    key: "announcement:a1",
    kind: "announcement",
    title: "Payday moved",
    body: "Paid on Monday.\nNot Sunday.",
    created_at: at,
    action_label: "Open wallet",
    action_url: "/contributor/dashboard",
  },
];

vi.mock("@/lib/api/notifications", () => ({
  listNotifications: vi.fn(async () => ({ items: ITEMS, total: ITEMS.length, limit: 50, offset: 0 })),
  markRead: vi.fn(async () => ({ marked: 1, unread: 0 })),
}));

function Studio() {
  const { state } = useLocation();
  return <p>Studio {(state as { mode?: string } | null)?.mode}</p>;
}

function page() {
  render(
    <MemoryRouter initialEntries={["/contributor/notifications"]}>
      <Routes>
        <Route path="/contributor/notifications" element={<ContributorNotificationsPage />} />
        <Route path="/contributor/studio" element={<Studio />} />
        <Route path="/contributor/dashboard" element={<p>Wallet page</p>} />
      </Routes>
    </MemoryRouter>
  );
  return userEvent.setup();
}

describe("contributor notifications", () => {
  it.each([
    ["New sentences to read", "Studio prompt"],
    ["New topics to narrate", "Studio stimuli"],
  ])("opens the studio on the right task from %s", async (title, landed) => {
    const user = page();
    await user.click(await screen.findByText(title));
    expect(await screen.findByText(landed)).toBeInTheDocument();
  });

  it("shows an announcement in full, with its button", async () => {
    const user = page();
    await user.click(await screen.findByText("Payday moved"));
    const sheet = await screen.findByRole("dialog");
    expect(within(sheet).getByText(/Paid on Monday\./)).toHaveClass("whitespace-pre-line");
    await user.click(within(sheet).getByRole("button", { name: "Open wallet" }));
    expect(await screen.findByText("Wallet page")).toBeInTheDocument();
  });
});
