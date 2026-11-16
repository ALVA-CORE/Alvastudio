import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { NotificationsMenu } from "@/components/shared/NotificationsMenu";
import type { ApiNotification } from "@/lib/api/notifications";

const markRead = vi.fn<(body: unknown) => Promise<{ marked: number; unread: number }>>(
  async () => ({ marked: 1, unread: 0 })
);
let items: ApiNotification[] = [];

vi.mock("@/lib/api/notifications", () => ({
  listNotifications: vi.fn(async () => ({ items, total: items.length, limit: 30, offset: 0 })),
  markRead: (body: unknown) => markRead(body),
}));

const at = new Date().toISOString();

function announcement(url: string): ApiNotification {
  return {
    key: "announcement:a1",
    kind: "announcement",
    title: "Office closed",
    body: "Closed on Friday.\nBack on Monday.",
    created_at: at,
    read: false,
    action_label: "Read more",
    action_url: url,
  };
}

function bell() {
  return render(
    <MemoryRouter initialEntries={["/home"]}>
      <Routes>
        <Route path="/home" element={<NotificationsMenu />} />
        <Route path="/intern/profile" element={<p>Profile page</p>} />
        <Route path="/intern/review" element={<p>Review desk</p>} />
      </Routes>
    </MemoryRouter>
  );
}

async function open() {
  const user = userEvent.setup();
  bell();
  await user.click(await screen.findByRole("button", { name: /Notifications, 1 unread/ }));
  return user;
}

describe("the staff bell", () => {
  beforeEach(() => markRead.mockClear());

  it("keeps an announcement's line breaks", async () => {
    items = [announcement("/intern/profile")];
    await open();
    const body = await screen.findByText(/Closed on Friday/);
    expect(body).toHaveClass("whitespace-pre-line");
  });

  it("follows a studio path in place, and marks it read", async () => {
    items = [announcement("/intern/profile")];
    const user = await open();
    await user.click(await screen.findByRole("button", { name: "Read more" }));
    expect(await screen.findByText("Profile page")).toBeInTheDocument();
    expect(markRead).toHaveBeenCalledWith({ keys: ["announcement:a1"] });
  });

  it("opens an https link in a new tab", async () => {
    const opened = vi.spyOn(window, "open").mockReturnValue(null);
    items = [announcement("https://alvacore.example/news")];
    const user = await open();
    await user.click(await screen.findByRole("button", { name: "Read more" }));
    expect(opened).toHaveBeenCalledWith("https://alvacore.example/news", "_blank", "noopener,noreferrer");
    opened.mockRestore();
  });

  it("sends an intern's waiting clips to the review desk", async () => {
    items = [
      {
        key: "queue:intern",
        kind: "queue",
        title: "Clips are waiting for your review",
        body: "3 clips are on your desk.",
        created_at: at,
        read: false,
        recording_id: "r1",
      },
    ];
    const user = await open();
    await user.click(await screen.findByText("Clips are waiting for your review"));
    expect(await screen.findByText("Review desk")).toBeInTheDocument();
  });
});
