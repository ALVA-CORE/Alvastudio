import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { ContributorGuideSheet } from "@/components/contributors/guide/ContributorGuideSheet";
import { REJECTIONS } from "@/components/contributors/guide/guide-content";
import { ALVA_LINKS, SUPPORT_EMAIL } from "@/lib/links";

describe("ContributorGuideSheet", () => {
  /* The section people reach for after a rejection, hunting one row. Every
     reason has to be there, and every reason has to carry its fix — a reason
     without one is a diagnosis with no treatment. */
  it("lists every rejection reason with the fix for it", () => {
    render(<ContributorGuideSheet open onOpenChange={() => {}} />);
    const sheet = screen.getByRole("dialog");

    for (const item of REJECTIONS) {
      expect(within(sheet).getByText(item.reason)).toBeInTheDocument();
      expect(within(sheet).getByText(item.fix)).toBeInTheDocument();
    }
  });

  /* Outbound links open away from the app, and `target="_blank"` without
     `rel` hands the new tab a handle on this one. */
  it("sends the outside links out safely", () => {
    render(<ContributorGuideSheet open onOpenChange={() => {}} />);
    const links = within(screen.getByRole("dialog")).getAllByRole("link");

    for (const href of [ALVA_LINKS.payments, ALVA_LINKS.terms, ALVA_LINKS.privacy]) {
      const match = links.find((anchor) => anchor.getAttribute("href") === href);

      expect(match, `no link to ${href}`).toBeDefined();
      expect(match).toHaveAttribute("target", "_blank");
      expect(match?.getAttribute("rel")).toContain("noopener");
    }
  });

  /* Support is a mailto, so it must NOT get target/rel — a new tab for a
     mail client is a blank tab left behind. */
  it("keeps support as a plain mailto", () => {
    render(<ContributorGuideSheet open onOpenChange={() => {}} />);

    const link = screen.getByRole("link", { name: SUPPORT_EMAIL });
    expect(link.getAttribute("href")).toContain(`mailto:${SUPPORT_EMAIL}`);
    expect(link).not.toHaveAttribute("target");
  });
});
