import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

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
const send = vi.fn(async () => ({ ...detail, status: "queued", delivery: { ...detail.delivery, total: 87 } }));

vi.mock("@/lib/api/communications", async (original) => ({
  ...(await original<typeof import("@/lib/api/communications")>()),
  createCommunication: (...args: unknown[]) => create(...(args as [])),
  previewCommunication: () => preview(),
  sendCommunication: (...args: unknown[]) => send(...(args as [])),
  listCommunications: vi.fn(async () => ({ items: [], total: 0, limit: 50, offset: 0 })),
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
    expect(frame.getAttribute("sandbox")).toBe("");
    expect(frame.srcdoc).toContain("Guidance update");
  });

  /* One press saves and counts; only the second sends. */
  it("sends on the second press, against the previewed revision", async () => {
    render(<CommsLauncher />);
    await userEvent.click(screen.getByRole("button", { name: "Email contributors" }));
    await userEvent.type(screen.getByLabelText("Header"), "Guidance update");
    await userEvent.type(screen.getByLabelText("Body"), "Please read it.");

    await userEvent.click(screen.getByRole("button", { name: /^Send$/ }));
    expect(create).toHaveBeenCalledTimes(1);
    expect(send).not.toHaveBeenCalled();

    await userEvent.click(await screen.findByRole("button", { name: /Send to 87/ }));
    await waitFor(() => expect(send).toHaveBeenCalledWith("m1", 1));
  });

  it("finds people by state, however they typed it", async () => {
    render(<CommsLauncher />);
    await userEvent.click(screen.getByRole("button", { name: "Email contributors" }));
    await userEvent.click(screen.getByRole("radio", { name: "Choose" }));
    expect(await screen.findByText("Lagos")).toBeInTheDocument();
  });
});
