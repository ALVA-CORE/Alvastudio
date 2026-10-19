import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CreateUserDialog } from "../CreateUserDialog";

function renderDialog() {
  const onCreate = vi.fn();
  render(
    <CreateUserDialog open onOpenChange={vi.fn()} onCreate={onCreate} />
  );
  return { onCreate };
}

describe("CreateUserDialog", () => {
  /* Contributors sign themselves up. One made here would have no consent
   * record and no onboarding profile, so the option must not exist. */
  it("does not offer contributor as a role", async () => {
    renderDialog();
    await userEvent.click(screen.getByRole("combobox", { name: "Role" }));

    expect(screen.getByRole("option", { name: "Annotator" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Intern" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Admin" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "Contributor" })).not.toBeInTheDocument();
  });

  /* An admin who can read a colleague's password is a liability, and one
   * typed into a form gets reused. The invite sets it instead. */
  it("never asks for a password", () => {
    renderDialog();
    expect(document.querySelector('input[type="password"]')).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Send invite" })).toBeInTheDocument();
  });

  it("only shows page access for admins", async () => {
    renderDialog();
    expect(screen.queryByText("Page access")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("combobox", { name: "Role" }));
    await userEvent.click(screen.getByRole("option", { name: "Admin" }));

    expect(screen.getByText("Page access")).toBeInTheDocument();
  });

  /* Role is the whole authority model at the API. The picker stays on screen
   * because the concept may return, but it must not look operable: a control
   * that sets nothing is worse than no control. */
  it("does not let anyone set page access, and says why", async () => {
    renderDialog();
    await userEvent.click(screen.getByRole("combobox", { name: "Role" }));
    await userEvent.click(screen.getByRole("option", { name: "Admin" }));

    expect(screen.getByText("Not enforced yet")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Page access" })).toBeDisabled();
  });

  it("refuses an invalid email", async () => {
    const { onCreate } = renderDialog();

    await userEvent.type(screen.getByLabelText("Full name"), "Chioma Okafor");
    await userEvent.type(screen.getByLabelText("Email"), "nope");
    await userEvent.click(screen.getByRole("button", { name: "Send invite" }));

    expect(onCreate).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("creates a staff account with no permissions attached", async () => {
    const { onCreate } = renderDialog();

    await userEvent.type(screen.getByLabelText("Full name"), "Chioma Okafor");
    await userEvent.type(screen.getByLabelText("Email"), "chioma@alvacoreai.com");
    await userEvent.click(screen.getByRole("button", { name: "Send invite" }));

    expect(onCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        fullName: "Chioma Okafor",
        email: "chioma@alvacoreai.com",
        role: "annotator",
        permissions: [],
      })
    );
  });
});
