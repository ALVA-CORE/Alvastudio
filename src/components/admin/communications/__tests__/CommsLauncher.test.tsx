import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import userEvent from "@testing-library/user-event";

/* ProseMirror measures the page as it types, and jsdom has no layout. */
const rect = { x: 0, y: 0, top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0, toJSON: () => ({}) };
const rects = () => Object.assign([rect], { item: () => rect }) as unknown as DOMRectList;
Range.prototype.getClientRects = rects;
Range.prototype.getBoundingClientRect = () => rect as DOMRect;
Element.prototype.getClientRects = rects;
document.elementFromPoint = () => null;

let permissions: string[] | undefined;
vi.mock("@/lib/auth/context", () => ({
  useAuth: () => ({ user: { role: "admin", adminPermissions: permissions } }),
}));

const person = (user_id: string, role: string, full_name: string, state: string | null) => ({
  user_id,
  role,
  approved: true,
  is_active: true,
  full_name,
  email: `${user_id}@example.com`,
  created_at: "2026-11-01T00:00:00Z",
  profile: state ? { state_of_origin: state, state_of_residence: null } : null,
  intern_profile: null,
  annotator_profile: null,
});
const directory: Record<string, ReturnType<typeof person>[]> = {
  contributor: [person("c1", "contributor", "Esther Obi", "lagos state")],
  intern: [person("i1", "intern", "Ifeoma Ade", null)],
  annotator: [],
};

vi.mock("@/lib/api/users", () => ({
  USER_PROFILES_MAX_LIMIT: 500,
  listUserProfilesPage: vi.fn(async ({ role }: { role: string }) => ({
    items: directory[role] ?? [],
    total: (directory[role] ?? []).length,
    limit: 500,
    offset: 0,
  })),
}));

const detail = {
  id: "m1",
  revision: 1,
  status: "draft",
  delivery: { total: 0, pending: 0, sent: 0, failed: 0, skipped: 0, removed: 0 },
};
const create = vi.fn(async () => detail);
const preview = vi.fn(async () => ({
  revision: 1,
  recipient_count: 87,
  unavailable_recipient_count: 0,
  email_available: true,
  subject: "",
  html: "",
  text: "",
}));
const upload = vi.fn();
const send = vi.fn(async () => ({ ...detail, status: "queued", delivery: { ...detail.delivery, total: 87 } }));

vi.mock("@/lib/api/communications", async (original) => ({
  ...(await original<typeof import("@/lib/api/communications")>()),
  createCommunication: (...args: unknown[]) => create(...(args as [])),
  previewCommunication: () => preview(),
  sendCommunication: (...args: unknown[]) => send(...(args as [])),
  listCommunications: vi.fn(async () => ({ items: [], total: 0, limit: 50, offset: 0 })),
  uploadCommunicationImage: (...args: unknown[]) => upload(...args),
}));

const { CommsLauncher } = await import("../CommsLauncher");

const navigated = vi.fn();
function Where() {
  navigated(useLocation());
  return null;
}

/* The launcher navigates, for Announcement, so it sits in a router. */
const renderLauncher = () =>
  render(
    <MemoryRouter>
      <CommsLauncher />
      <Where />
    </MemoryRouter>
  );

/* One button springs out Email and Announcement; Email opens the panel. */
const openEmail = async () => {
  await userEvent.click(screen.getByRole("button", { name: "Messages" }));
  await userEvent.click(await screen.findByRole("button", { name: "Email" }));
};

describe("CommsLauncher", () => {
  it("springs out Email and Announcement, and Announcement opens a new one", async () => {
    renderLauncher();
    await userEvent.click(screen.getByRole("button", { name: "Messages" }));
    expect(await screen.findByRole("button", { name: "Email" })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Announcement" }));
    expect(navigated).toHaveBeenLastCalledWith(
      expect.objectContaining({ pathname: "/admin/announcements", state: { compose: true } })
    );
  });

  beforeEach(() => {
    permissions = undefined;
    create.mockClear();
    send.mockClear();
  });

  it("is hidden from an admin without the Emails permission", () => {
    permissions = ["prompts"];
    renderLauncher();
    expect(screen.queryByRole("button", { name: "Messages" })).not.toBeInTheDocument();
  });

  it("opens into compose, preview and sent", async () => {
    renderLauncher();
    await openEmail();
    expect(screen.getByRole("tab", { name: "Compose" })).toHaveAttribute("aria-selected", "true");

    await userEvent.type(screen.getByLabelText("Header"), "Guidance update");
    await userEvent.click(screen.getByRole("tab", { name: "Preview" }));
    const frame = (await screen.findByTitle("Email preview")) as HTMLIFrameElement;
    /* Readable for the fit, and nothing more: no scripts, forms or popups. */
    expect(frame.getAttribute("sandbox")).toBe("allow-same-origin");
    expect(frame.srcdoc).toContain("Guidance update");
  });

  /* One press saves and counts; only the second sends. */
  it("sends on the second press, against the previewed revision", async () => {
    renderLauncher();
    await openEmail();
    await userEvent.type(screen.getByLabelText("Header"), "Guidance update");
    await userEvent.click(screen.getByRole("textbox", { name: "Body" }));
    await userEvent.keyboard("Please read it.");

    await userEvent.click(screen.getByRole("button", { name: /^Send$/ }));
    expect(create).toHaveBeenCalledTimes(1);
    expect(send).not.toHaveBeenCalled();

    await userEvent.click(await screen.findByRole("button", { name: /Send to 87/ }));
    await waitFor(() => expect(send).toHaveBeenCalledWith("m1", 1));
  });

  /* The To row: a state, however it was typed, or a person, as chips. */
  it("picks a whole state or one person in the To row", async () => {
    renderLauncher();
    await openEmail();
    const to = screen.getByRole("combobox", { name: "To" });

    await userEvent.type(to, "lag");
    await userEvent.click(await screen.findByRole("option", { name: /Lagos/ }));
    expect(screen.getByText("Lagos")).toBeInTheDocument();
    /* Everyone is now only a suggestion, not a chip. */
    await waitFor(() =>
      expect(
        screen.queryAllByText("Everyone").every((node) => node.closest('[role="listbox"]'))
      ).toBe(true)
    );

    /* People are in the list before anything is typed. */
    await userEvent.click(to);
    await userEvent.click(await screen.findByRole("option", { name: /Esther Obi/ }));
    expect(
      screen.getAllByText("Esther Obi").some((node) => !node.closest('[role="listbox"]'))
    ).toBe(true);

    /* Backspace on an empty field takes the last chip off. */
    await userEvent.type(to, "{Backspace}");
    await waitFor(() =>
      expect(
        screen.queryAllByText("Esther Obi").every((node) => node.closest('[role="listbox"]'))
      ).toBe(true)
    );
  });

  /* Hand-picked people go as `selected_people`, whatever their role. */
  it("sends a contributor and an intern picked by name as selected_people", async () => {
    renderLauncher();
    await openEmail();
    await userEvent.type(screen.getByLabelText("Header"), "Hello");
    await userEvent.click(screen.getByRole("textbox", { name: "Body" }));
    await userEvent.keyboard("Read it.");

    const to = screen.getByRole("combobox", { name: "To" });
    await userEvent.click(to);
    await userEvent.click(await screen.findByRole("option", { name: /Esther Obi/ }));
    await userEvent.click(to);
    await userEvent.click(await screen.findByRole("option", { name: /Ifeoma Ade/ }));

    await userEvent.click(screen.getByRole("button", { name: /^Send$/ }));
    await waitFor(() => expect(create).toHaveBeenCalled());
    expect((create.mock.calls.at(-1) as unknown[] | undefined)?.[0]).toMatchObject({
      audience: "selected_people",
      recipient_ids: ["c1", "i1"],
    });
  });

  /* "Everyone" is all three roles now; contributors alone are "Contributors". */
  it("starts on Contributors and sends Everyone as a group", async () => {
    renderLauncher();
    await openEmail();
    await userEvent.type(screen.getByLabelText("Header"), "Hello");
    await userEvent.click(screen.getByRole("textbox", { name: "Body" }));
    await userEvent.keyboard("Read it.");
    expect(screen.getByText("Contributors")).toBeInTheDocument();

    await userEvent.type(screen.getByRole("combobox", { name: "To" }), "every");
    await userEvent.click(await screen.findByRole("option", { name: /Everyone/ }));

    await userEvent.click(screen.getByRole("button", { name: /^Send$/ }));
    await waitFor(() => expect(create).toHaveBeenCalled());
    const draft = (create.mock.calls.at(-1) as unknown[] | undefined)?.[0];
    expect(draft).toMatchObject({ audience: "everyone" });
    expect(draft).not.toHaveProperty("recipient_ids");
  });

  it("fills Send with the upload while the hero goes up", async () => {
    upload.mockImplementation(() => new Promise(() => undefined));
    renderLauncher();
    await openEmail();
    const file = new File(["x"], "hero.png", { type: "image/png" });
    const picker = document.querySelector('input[type="file"]') as HTMLInputElement;
    await userEvent.upload(picker, file);
    expect(await screen.findByRole("progressbar", { name: "Uploading image" })).toBeInTheDocument();
  });

  it("closes on a press outside, and keeps what was written", async () => {
    render(
      <MemoryRouter>
        <p>Page</p>
        <CommsLauncher />
      </MemoryRouter>
    );
    await openEmail();
    await userEvent.type(screen.getByLabelText("Header"), "Kept");

    await userEvent.click(screen.getByText("Page"));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());

    await openEmail();
    expect(screen.getByLabelText("Header")).toHaveValue("Kept");
  });

  /* The two images the templates already use, or your own, in one place. */
  it("uploads the everyday image once, and sends no image for the brand one", async () => {
    localStorage.clear();
    upload.mockReset().mockResolvedValue({ id: "img-everyday", url: "https://api/x.jpg", width: 1200, height: 600 });
    const realFetch = globalThis.fetch;
    globalThis.fetch = vi.fn(async () => new Response(new Blob(["png"], { type: "image/png" }))) as typeof fetch;
    try {
      renderLauncher();
      await openEmail();

      await userEvent.click(screen.getByRole("radio", { name: "Everyday image" }));
      await waitFor(() => expect(upload).toHaveBeenCalledTimes(1));
      await waitFor(() =>
        expect(screen.getByRole("radio", { name: "Everyday image" })).toHaveAttribute("aria-checked", "true")
      );

      await userEvent.click(screen.getByRole("radio", { name: "Brand image" }));
      await userEvent.click(screen.getByRole("radio", { name: "Everyday image" }));
      expect(upload).toHaveBeenCalledTimes(1);

      await userEvent.click(screen.getByRole("radio", { name: "Brand image" }));
      await userEvent.type(screen.getByLabelText("Header"), "Update");
      await userEvent.click(screen.getByRole("textbox", { name: "Body" }));
      await userEvent.keyboard("Read it.");
      await userEvent.click(screen.getByRole("button", { name: /^Send$/ }));
      await waitFor(() => expect(create).toHaveBeenCalled());
      expect((create.mock.calls.at(-1) as unknown[] | undefined)?.[0]).not.toHaveProperty("hero_image_id");
    } finally {
      globalThis.fetch = realFetch;
    }
  });
});

