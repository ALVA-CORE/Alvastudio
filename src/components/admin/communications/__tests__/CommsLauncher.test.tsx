import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
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

vi.mock("@/lib/api/users", () => ({
  USER_PROFILES_MAX_LIMIT: 500,
  listUserProfilesPage: vi.fn(async () => ({
    items: [
      {
        user_id: "c1",
        role: "contributor",
        approved: true,
        is_active: true,
        full_name: "Esther Obi",
        email: "esther@example.com",
        created_at: "2026-11-01T00:00:00Z",
        profile: { state_of_origin: "lagos state", state_of_residence: null },
        intern_profile: null,
        annotator_profile: null,
      },
    ],
    total: 1,
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

describe("CommsLauncher", () => {
  beforeEach(() => {
    permissions = undefined;
    create.mockClear();
    send.mockClear();
  });

  it("is hidden from an admin without the Emails permission", () => {
    permissions = ["prompts"];
    render(<CommsLauncher />);
    expect(screen.queryByRole("button", { name: "Email contributors" })).not.toBeInTheDocument();
  });

  it("opens into compose, preview and sent", async () => {
    render(<CommsLauncher />);
    await userEvent.click(screen.getByRole("button", { name: "Email contributors" }));
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
    render(<CommsLauncher />);
    await userEvent.click(screen.getByRole("button", { name: "Email contributors" }));
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
    render(<CommsLauncher />);
    await userEvent.click(screen.getByRole("button", { name: "Email contributors" }));
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

    await userEvent.type(to, "esther");
    await userEvent.click(await screen.findByRole("option", { name: /Esther Obi/ }));
    expect(screen.getByText("Esther Obi")).toBeInTheDocument();

    /* Backspace on an empty field takes the last chip off. */
    await userEvent.type(to, "{Backspace}");
    await waitFor(() => expect(screen.queryByText("Esther Obi")).not.toBeInTheDocument());
  });

  it("fills Send with the upload while the hero goes up", async () => {
    upload.mockImplementation(() => new Promise(() => undefined));
    render(<CommsLauncher />);
    await userEvent.click(screen.getByRole("button", { name: "Email contributors" }));
    const file = new File(["x"], "hero.png", { type: "image/png" });
    const picker = document.querySelector('input[type="file"]') as HTMLInputElement;
    await userEvent.upload(picker, file);
    expect(await screen.findByRole("progressbar", { name: "Uploading image" })).toBeInTheDocument();
  });

  it("closes on a press outside, and keeps what was written", async () => {
    render(
      <>
        <p>Page</p>
        <CommsLauncher />
      </>
    );
    await userEvent.click(screen.getByRole("button", { name: "Email contributors" }));
    await userEvent.type(screen.getByLabelText("Header"), "Kept");

    await userEvent.click(screen.getByText("Page"));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());

    await userEvent.click(screen.getByRole("button", { name: "Email contributors" }));
    expect(screen.getByLabelText("Header")).toHaveValue("Kept");
  });
});
