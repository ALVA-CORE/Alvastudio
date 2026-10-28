import { describe, expect, it, vi } from "vitest";
import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ContributorGuideSheet } from "@/components/contributors/guide/ContributorGuideSheet";
import {
  NARRATION_STEPS,
  PROMPT_STEPS,
  REJECTIONS,
  SETUP_STEPS,
} from "@/components/contributors/guide/guide-content";
import { ALVA_LINKS } from "@/lib/links";

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

  /**
   * One kind of recording at a time, chosen with the Record page's own
   * control rather than a tab bar invented for this sheet.
   *
   * Picking Stimuli here shows the stimuli rules, exactly as picking it on
   * the Record page changes what gets recorded. The labels are that page's
   * too: a guide that renames the thing it explains gives somebody a second
   * thing to learn.
   */
  it("switches the rules from the recording-mode control", async () => {
    const user = userEvent.setup();
    render(<ContributorGuideSheet open onOpenChange={() => {}} />);
    const sheet = screen.getByRole("dialog");

    expect(within(sheet).getByText(PROMPT_STEPS[0].title)).toBeInTheDocument();
    expect(within(sheet).queryByText(NARRATION_STEPS[0].title)).not.toBeInTheDocument();

    await user.click(
      within(sheet).getByRole("button", { name: /Recording mode, Prompt reader/ })
    );
    await user.click(within(sheet).getByRole("option", { name: /Stimuli/ }));

    expect(within(sheet).getByText(NARRATION_STEPS[0].title)).toBeInTheDocument();
    expect(within(sheet).queryByText(PROMPT_STEPS[0].title)).not.toBeInTheDocument();
  });

  /* The copy is read by people, so it is written the way people write. */
  it("carries no em dashes", () => {
    const copy = [...SETUP_STEPS, ...PROMPT_STEPS, ...NARRATION_STEPS]
      .flatMap((step) => [step.title, step.detail])
      .concat(REJECTIONS.flatMap((item) => [item.reason, item.meaning, item.fix]));

    for (const line of copy) expect(line).not.toContain("\u2014");
  });

  /**
   * Reading is two passes.
   *
   * The tabs hold different rules and only one is ever on screen, so
   * scrolling the prompt tab to the bottom is half the guide read. Counting
   * scroll alone would let somebody finish without ever seeing the stimuli
   * rules, then be rejected for breaking them.
   */
  it("will not count the guide read until both modes have been", async () => {
    const user = userEvent.setup();
    render(<ContributorGuideSheet open mustRead onOpenChange={() => {}} />);

    /* jsdom gives every element a zero scroll height, so the scroller
       reports "nothing to scroll", which the component treats as read. That
       is the right behaviour for a short screen, and it makes this test
       about the half that is left: the other mode. */
    /* The footer names the other half and takes them to it. It used to be
       a disabled button naming a thing it would not take anybody to,
       leaving them to work out that the answer was a dropdown half a screen
       above. */
    const next = screen.getByRole("button", { name: /Now read the Stimuli rules/ });
    expect(next).toBeEnabled();

    /* jsdom has no layout, so `scrollTo` is stubbed to record the ask. What
       matters is that the panel is the thing told to move — not
       `scrollIntoView`, which walks up every scrollable ancestor and from
       inside a portalled fixed dialog moved none of them. */
    const sheet = screen.getByRole("dialog");
    const scroller = sheet.querySelector(".overflow-y-auto") as HTMLElement;
    const scrollTo = vi.fn();
    scroller.scrollTo = scrollTo as unknown as HTMLElement["scrollTo"];

    await user.click(next);

    expect(screen.getByText(NARRATION_STEPS[0].title)).toBeInTheDocument();
    expect(scrollTo).toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Got it" })).toBeEnabled();
  });

  /* The close control doubles as the meter, so it has to say where they are
     rather than looking broken. */
  it("names how far through it is while it is held shut", () => {
    render(<ContributorGuideSheet open mustRead onOpenChange={() => {}} />);

    expect(
      screen.getByRole("button", { name: /Read to the end to close, 50% done/ })
    ).toBeDisabled();
  });

  /**
   * The forced read, which only happens when the guide opens itself.
   *
   * Somebody who tapped the button is looking something up and must be able
   * to leave. Somebody who never opened it is being shown the rules their
   * pay depends on, and "it is in the guide" is not a defence if the guide
   * closed on the first tap outside it.
   */
  it("will not close before the end when it opened itself", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(<ContributorGuideSheet open mustRead onOpenChange={onOpenChange} />);

    await user.keyboard("{Escape}");
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  /* And the counterpart: opened by hand, it closes by hand. */
  it("closes freely when somebody opened it themselves", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(<ContributorGuideSheet open onOpenChange={onOpenChange} />);

    await user.keyboard("{Escape}");
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});

describe("ModeSwitcher", () => {
  /* It opens and it closes. The demo runs only until it is touched, so
     after the first press this button is the only thing moving it. */
  it("toggles open and shut from the trigger", async () => {
    const user = userEvent.setup();
    render(<ContributorGuideSheet open onOpenChange={() => {}} />);

    const trigger = screen.getByRole("button", { name: /Recording mode/ });
    expect(trigger).toHaveAttribute("aria-expanded", "false");

    await user.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");

    await user.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });

  /* Picking a mode closes the menu and leaves the scroll position where it
     was. The control sits halfway down the sheet, so jumping to the top
     threw somebody above the title and made them scroll back down past
     everything they had just read to reach the thing they had just used. */
  it("closes on a pick without moving the page", async () => {
    const user = userEvent.setup();
    render(<ContributorGuideSheet open onOpenChange={() => {}} />);

    const sheet = screen.getByRole("dialog");
    const scroller = sheet.querySelector(".overflow-y-auto") as HTMLElement;
    scroller.scrollTop = 120;

    await user.click(screen.getByRole("button", { name: /Recording mode/ }));
    await user.click(screen.getByRole("option", { name: /Stimuli/ }));

    expect(screen.getByRole("button", { name: /Recording mode/ })).toHaveAttribute(
      "aria-expanded",
      "false"
    );
    expect(scroller.scrollTop).toBe(120);
  });
});

describe("ModeSwitcher, on arrival", () => {
  /**
   * It opens when it is scrolled to, once, and does not close itself.
   *
   * It used to cycle open and shut on a timer, which is worse than no
   * demonstration at all: the options vanish just as somebody starts
   * reading them, and the card underneath moves every couple of seconds.
   */
  it("opens itself when the card comes into view, and stays open", () => {
    const observed: Array<(entries: unknown[]) => void> = [];
    const disconnect = vi.fn();

    vi.stubGlobal(
      "IntersectionObserver",
      class {
        constructor(callback: (entries: unknown[]) => void) {
          observed.push(callback);
        }
        observe() {}
        unobserve() {}
        disconnect = disconnect;
        takeRecords() {
          return [];
        }
      }
    );

    render(<ContributorGuideSheet open onOpenChange={() => {}} />);
    const trigger = screen.getByRole("button", { name: /Recording mode/ });
    expect(trigger).toHaveAttribute("aria-expanded", "false");

    act(() => {
      observed.forEach((fire) => fire([{ isIntersecting: true }]));
    });
    expect(trigger).toHaveAttribute("aria-expanded", "true");

    /* Scrolling past it again must not reopen a menu somebody has closed,
       so it stops watching after the first hit. */
    expect(disconnect).toHaveBeenCalled();

    act(() => {
      observed.forEach((fire) => fire([{ isIntersecting: false }]));
    });
    expect(trigger).toHaveAttribute("aria-expanded", "true");

    vi.unstubAllGlobals();
  });
});
