import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("@/lib/api/notifications", () => ({ unreadCount: vi.fn(async () => ({ unread: 3 })) }));
const { HomeHeader } = await import("../HomeHeader");

/* The same count the staff bell shows. */
describe("HomeHeader", () => {
  it("shows how many notifications are unread", async () => {
    render(
      <MemoryRouter>
        <HomeHeader firstName="Ada" />
      </MemoryRouter>
    );
    expect(await screen.findByRole("link", { name: "Notifications, 3 unread" })).toHaveTextContent("3");
  });
});
