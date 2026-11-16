import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import AdminAnnouncementsPage from "@/pages/admin/AdminAnnouncementsPage";
import { ApiError } from "@/lib/api/client";
import { alvaToast } from "@/lib/alva-toast";
import type { ApiAnnouncement } from "@/lib/api/announcements";

const at = new Date().toISOString();

const DRAFT: ApiAnnouncement = {
  id: "a1",
  title: "Office closed",
  body: "Closed on Friday.",
  audience: { roles: ["intern"] },
  action_label: null,
  action_url: null,
  status: "draft",
  created_by_id: "admin",
  sent_by_id: null,
  created_at: at,
  updated_at: at,
  sent_at: null,
  withdrawn_at: null,
  expires_at: null,
  recipient_count: 42,
  read_count: 0,
};

/* No toaster is mounted here; the call is the assertion. */
vi.mock("@/lib/alva-toast", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/alva-toast")>();
  return { ...actual, alvaToast: { ...actual.alvaToast, error: vi.fn(), success: vi.fn() } };
});

const send = vi.fn();
const remove = vi.fn();
const list = vi.fn();

vi.mock("@/lib/api/announcements", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/announcements")>()),
  listAnnouncements: (query: unknown) => list(query),
  previewAudience: vi.fn(async () => ({ recipient_count: 42, unmatched_emails: [] })),
  sendAnnouncement: (id: string) => send(id),
  deleteAnnouncement: (id: string) => remove(id),
}));

function page() {
  render(
    <MemoryRouter>
      <AdminAnnouncementsPage />
    </MemoryRouter>
  );
  return userEvent.setup();
}

async function openRowMenu(user: ReturnType<typeof userEvent.setup>) {
  const [trigger] = await screen.findAllByRole("button", { name: "Actions for Office closed" });
  await user.click(trigger);
}

describe("admin announcements", () => {
  beforeEach(() => {
    list.mockReset().mockResolvedValue({ items: [DRAFT], total: 1, limit: 10, offset: 0 });
    send.mockReset().mockResolvedValue({ ...DRAFT, status: "sent", sent_at: at });
    remove.mockReset();
  });

  /* The handoff's wording: recipients are fixed when it is sent. */
  it("asks before sending, in the handoff's words", async () => {
    const user = page();
    await openRowMenu(user);
    await user.click(await screen.findByRole("menuitem", { name: "Send" }));

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("Send to 42 people now?")).toBeInTheDocument();
    expect(
      within(dialog).getByText(
        "People who join later will not get it, and it cannot be edited once sent."
      )
    ).toBeInTheDocument();

    await user.click(within(dialog).getByRole("button", { name: "Send" }));
    expect(send).toHaveBeenCalledWith("a1");
  });

  it("says a vanished announcement is gone, and reloads", async () => {
    remove.mockRejectedValue(new ApiError(404, "Announcement not found."));
    const user = page();
    await openRowMenu(user);
    await user.click(await screen.findByRole("menuitem", { name: "Delete" }));
    const loads = list.mock.calls.length;
    await user.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Delete" }));

    await waitFor(() =>
      expect(alvaToast.error).toHaveBeenCalledWith("That announcement no longer exists.")
    );
    await waitFor(() => expect(list.mock.calls.length).toBeGreaterThan(loads));
  });
});
