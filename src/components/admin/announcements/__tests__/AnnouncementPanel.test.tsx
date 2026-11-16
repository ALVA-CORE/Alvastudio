import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";


const api = {
  previewAudience: vi.fn(),
  listAnnouncements: vi.fn(),
  createAnnouncement: vi.fn(),
  updateAnnouncement: vi.fn(),
  sendAnnouncement: vi.fn(),
  deleteAnnouncement: vi.fn(),
  withdrawAnnouncement: vi.fn(),
};
vi.mock("@/lib/api/announcements", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/announcements")>()),
  ...Object.fromEntries(Object.entries(api).map(([name, fn]) => [name, (...args: unknown[]) => fn(...args)])),
}));

const { AnnouncementPanel } = await import("../AnnouncementPanel");
const { useAnnouncementComposer } = await import("@/hooks/useAnnouncements");

const draft = {
  id: "d1",
  title: "Studio closed Monday",
  body: "We are closed.",
  audience: { roles: ["intern"] },
  action_label: null,
  action_url: null,
  expires_at: null,
  status: "draft",
  recipient_count: 7,
  read_count: 0,
  sent_at: null,
  updated_at: new Date().toISOString(),
};

function Panel() {
  const composer = useAnnouncementComposer();
  return (
    <AnnouncementPanel
      composer={composer}
      directory={[
        {
          id: "u1",
          name: "Ada Obi",
          email: "ada@x.test",
          role: "intern",
          stateOfOrigin: null,
          stateOfResidence: null,
          approved: true,
        } as never,
      ]}
      onClose={() => {}}
    />
  );
}

beforeEach(() => {
  for (const fn of Object.values(api)) fn.mockReset();
  api.previewAudience.mockResolvedValue({ recipient_count: 42, unmatched_emails: ["nobody@x.test"] });
  api.listAnnouncements.mockResolvedValue({ items: [draft], total: 1, limit: 50, offset: 0 });
  api.createAnnouncement.mockResolvedValue({ ...draft, id: "new" });
  api.deleteAnnouncement.mockResolvedValue(undefined);
});

describe("AnnouncementPanel", () => {
  it("counts who it reaches, and marks an email with no account", async () => {
    render(<Panel />);
    await userEvent.type(screen.getByLabelText("Emails"), "nobody@x.test ");
    expect(await screen.findByText("This reaches 42 people.")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText("nobody@x.test")).toHaveClass("text-destructive"));
  });

  /* Like email's To: type a name, pick the person, get their address. */
  it("suggests people as you type, and shows how to paste several", async () => {
    render(<Panel />);
    const field = screen.getByLabelText("Emails");
    expect(field).toHaveAttribute("placeholder", "Separate with commas");
    await userEvent.type(field, "ada");
    await userEvent.click(await screen.findByRole("option", { name: /Ada Obi/ }));
    await waitFor(() => expect(screen.queryByRole("listbox")).not.toBeInTheDocument());
    expect(screen.getByText("ada@x.test")).toBeInTheDocument();
  });

  it("saves a draft, and a draft picked from Drafts is edited, not copied", async () => {
    render(<Panel />);
    await userEvent.type(screen.getByLabelText("Title"), "Hello");
    await userEvent.type(screen.getByLabelText("Message"), "Hi all");
    await userEvent.click(screen.getByRole("button", { name: "Save draft" }));
    await waitFor(() => expect(api.createAnnouncement).toHaveBeenCalledTimes(1));

    await userEvent.click(screen.getByRole("tab", { name: "Drafts" }));
    await userEvent.click(await screen.findByText("Studio closed Monday"));
    expect(await screen.findByLabelText("Title")).toHaveValue("Studio closed Monday");
  });

  it("deletes a draft after asking", async () => {
    render(<Panel />);
    await userEvent.click(screen.getByRole("tab", { name: "Drafts" }));
    await userEvent.click(await screen.findByRole("button", { name: "Delete Studio closed Monday" }));
    const confirm = await screen.findByRole("dialog", { name: "Delete this draft?" });
    await userEvent.click(within(confirm).getByRole("button", { name: "Delete" }));
    await waitFor(() => expect(api.deleteAnnouncement).toHaveBeenCalledWith("d1"));
  });
});

