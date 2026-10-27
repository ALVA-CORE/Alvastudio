import { useEffect, useRef, useState, type ComponentType } from "react";
import type { IconProps } from "@solar-icons/react/lib/types";
import VolumeCross from "@solar-icons/react/video/VolumeCross";
import UsersGroupRounded from "@solar-icons/react/users/UsersGroupRounded";
import BellOff from "@solar-icons/react/notifications/BellOff";
import Ruler from "@solar-icons/react/tools/Ruler";
import Sofa from "@solar-icons/react/home/Sofa";
import HandStars from "@solar-icons/react/hands/HandStars";
import Smartphone from "@solar-icons/react/devices/Smartphone";
import TextField from "@solar-icons/react/text-formatting/TextField";
import TextSquare from "@solar-icons/react/text-formatting/TextSquare";
import Stopwatch from "@solar-icons/react/time/Stopwatch";
import Soundwave from "@solar-icons/react/video/Soundwave";
import Restart from "@solar-icons/react/arrows/Restart";
import PlayCircle from "@solar-icons/react/video/PlayCircle";
import Translation from "@solar-icons/react/it/Translation";
import Target from "@solar-icons/react/ui/Target";
import ChatRoundDots from "@solar-icons/react/messages/ChatRoundDots";
import MicrophoneLarge from "@solar-icons/react/video/MicrophoneLarge";
import LockKeyhole from "@solar-icons/react/security/LockKeyhole";
import ShieldUser from "@solar-icons/react/security/ShieldUser";
import Global from "@solar-icons/react/map/Global";
import CheckCircle from "@solar-icons/react/ui/CheckCircle";
import Danger from "@solar-icons/react/ui/Danger";
import AltArrowDown from "@solar-icons/react/arrows/AltArrowDown";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { TextureButton } from "@/components/ui/texture-button";
import { DistanceArt, TakeShapeArt } from "@/components/contributors/guide/GuideArt";
import {
  NARRATION_STEPS,
  PROMPT_STEPS,
  REJECTIONS,
  SETUP_STEPS,
  type GuideIcon,
  type GuideStep,
} from "@/components/contributors/guide/guide-content";
import { ALVA_LINKS } from "@/lib/links";
import { cn } from "@/lib/utils";

const ICONS: Record<GuideIcon, ComponentType<IconProps>> = {
  quiet: VolumeCross,
  alone: UsersGroupRounded,
  phone: BellOff,
  distance: Ruler,
  room: Sofa,
  still: HandStars,
  device: Smartphone,
  text: TextField,
  whole: TextSquare,
  pause: Stopwatch,
  natural: Soundwave,
  retake: Restart,
  playback: PlayCircle,
  language: Translation,
  topic: Target,
  unscripted: ChatRoundDots,
  keepGoing: MicrophoneLarge,
  private: LockKeyhole,
  clean: ShieldUser,
  mix: Global,
};

type Mode = "prompt" | "narration";

/**
 * How to get a recording approved, in one place.
 *
 * It lives on the nav rather than inside the profile because of *when* it is
 * wanted: halfway through a take that keeps coming back rejected, not while
 * somebody is editing their languages. One tap from anywhere, and it closes
 * back onto whatever they were doing, which is also why it is a sheet rather
 * than a page. A page would lose the prompt they were reading.
 *
 * **The two recording kinds are tabs**, not two stacked sections. They are
 * alternatives: nobody doing a prompt read needs the narration rules in
 * front of them, and scrolling past six irrelevant steps to reach the part
 * that applies is how a guide gets abandoned halfway.
 *
 * **The rejection table is not a table.** Nine rows by three columns on a
 * phone is either a horizontal scroll or type nobody can read, and this is
 * the section people reach for *after* a rejection, hunting one specific
 * row. Cards instead, with the fix set apart, because the fix is the only
 * line that says what to do next.
 *
 * The drawings earn their place for the same reason: distance and the shape
 * of a take are both relationships, and a sentence describing a relationship
 * is the sentence people skim.
 */
export function ContributorGuideSheet({
  open,
  onOpenChange,
  /**
   * Holds the sheet shut until it has been read to the end.
   *
   * Only for the one time it opens by itself, after a first sign-in. A
   * person who taps the help button is looking something up and must be
   * able to leave; a person who never opened it is being shown the rules
   * their pay depends on, and "it is in the guide" is not a defence if the
   * guide closed on the first tap outside it.
   *
   * It is a hold, never a trap. The progress ring on the button says how far
   * is left, and reaching the end releases it for good.
   */
  mustRead = false,
  onRead,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mustRead?: boolean;
  onRead?: () => void;
}) {
  const [mode, setMode] = useState<Mode>("prompt");
  const [progress, setProgress] = useState(0);
  const [reachedEnd, setReachedEnd] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);

  const locked = mustRead && !reachedEnd;

  /* Measured on scroll and once on open, because a short viewport can be at
     the end before anybody has scrolled at all, and a bar stuck at zero on a
     fully visible page is just wrong. */
  useEffect(() => {
    if (!open) return;

    const element = scroller.current;
    if (!element) return;

    const measure = () => {
      const scrollable = element.scrollHeight - element.clientHeight;
      /* Nothing to scroll means it is all on screen, which is read. */
      const ratio =
        scrollable <= 4 ? 1 : Math.min(1, element.scrollTop / scrollable);

      setProgress(ratio);
      /* A couple of pixels of slack: sub-pixel heights and rubber-band
         scrolling mean the last pixel is not always reachable, and a person
         who has read everything should not be held by a rounding error. */
      if (ratio >= 0.995) setReachedEnd(true);
    };

    measure();
    element.addEventListener("scroll", measure, { passive: true });

    /* Switching tabs changes the height under them, so the fraction has to
       be recomputed rather than left describing the old content. */
    const observer = new ResizeObserver(measure);
    observer.observe(element);

    return () => {
      element.removeEventListener("scroll", measure);
      observer.disconnect();
    };
  }, [open, mode]);

  useEffect(() => {
    if (reachedEnd) onRead?.();
  }, [reachedEnd, onRead]);

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        /* Swallows the outside click and the escape key while held, which is
           the whole mechanism. Nothing else changes. */
        if (!next && locked) return;
        onOpenChange(next);
      }}
    >
      <SheetContent
        side="bottom"
        aria-describedby={undefined}
        hideClose={locked}
        onInteractOutside={(event) => locked && event.preventDefault()}
        onEscapeKeyDown={(event) => locked && event.preventDefault()}
        /* Floating, not docked.
           Inset on every side, so the nav stays visible and reachable
           underneath rather than being covered by the thing it opened, and
           rounded all round, because square bottom corners read as attached
           to an edge this is not touching.

           `bottom` clears the nav and the home indicator: the nav's own
           container adds the safe-area inset as padding, so a fixed rem
           value alone would sit on top of it on a notched phone.

           `flex flex-col` with `gap-0` because the sheet's base styles are
           neither, and the inner scroll below needs a column to be `flex-1`
           inside. */
        className={
          "inset-x-3 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] top-auto " +
          "flex h-[70dvh] flex-col gap-0 overflow-hidden rounded-3xl p-0 " +
          "border-alva-border bg-alva-card sm:mx-auto sm:max-w-lg"
        }
      >
        {/* The border fills as they scroll.
            Drawn as an inset ring rather than a bar at the top, so the
            progress belongs to the panel instead of sitting above its
            content. Clipped by width, which is one composited property. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-10 overflow-hidden rounded-3xl"
        >
          <div
            className="h-full rounded-3xl ring-2 ring-inset ring-alva-accent transition-[width] duration-200 ease-out"
            style={{ width: `${Math.round(progress * 100)}%` }}
          />
        </div>

        <SheetHeader className="shrink-0 px-5 pb-3 pt-5 text-left sm:text-left">
          <SheetTitle className="text-lg text-foreground">
            Getting your recordings approved
          </SheetTitle>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Every clip is checked by a person before it is paid. Here is what
            they are listening for.
          </p>
        </SheetHeader>

        <div
          ref={scroller}
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-5"
        >
          <Section title="Before you start">
            <Steps steps={SETUP_STEPS} />
            <Figure caption="About one hand-length. Closer distorts, further goes faint.">
              <DistanceArt />
            </Figure>
          </Section>

          <Section title="While you record">
            {/* Two kinds of recording, one at a time. The switch is visible
                and labelled rather than a swipe somebody has to discover. */}
            <div
              role="tablist"
              aria-label="Kind of recording"
              className="mb-3 flex gap-1 rounded-full bg-alva-surface p-1"
            >
              <Tab
                id="prompt"
                active={mode}
                onSelect={setMode}
                icon={TextField}
                label="Reading sentences"
              />
              <Tab
                id="narration"
                active={mode}
                onSelect={setMode}
                icon={ChatRoundDots}
                label="Telling stories"
              />
            </div>

            {mode === "prompt" ? (
              <div role="tabpanel" aria-label="Reading sentences">
                <Steps steps={PROMPT_STEPS} />
                <Figure caption="A beat of quiet at each end. Cut-off starts and ends are the most common rejection.">
                  <TakeShapeArt />
                </Figure>
              </div>
            ) : (
              <div role="tabpanel" aria-label="Telling stories">
                <p className="mb-3 text-sm leading-relaxed text-muted-foreground">
                  You get a topic, something like “Tell us about a time your
                  network failed at the worst moment.” Talk about it the way
                  you would with a friend.
                </p>
                <Steps steps={NARRATION_STEPS} />
              </div>
            )}
          </Section>

          <Section title="Why recordings get rejected">
            <p className="mb-3 text-sm leading-relaxed text-muted-foreground">
              A rejected recording is not paid. These are the reasons, and the
              fix for each.
            </p>
            <div className="space-y-2">
              {REJECTIONS.map((item) => (
                <div key={item.reason} className="rounded-2xl bg-alva-surface px-3.5 py-3">
                  <div className="flex items-center gap-2">
                    <Danger size={15} weight="Outline" className="shrink-0 text-red-400" />
                    <p className="text-sm font-medium text-foreground">{item.reason}</p>
                  </div>

                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    {item.meaning}
                  </p>

                  {/* Set apart, because it is the only line that says what to
                      do next, and the only one somebody re-reads. */}
                  <div className="mt-2 flex items-start gap-2 border-t border-alva-border pt-2">
                    <CheckCircle
                      size={14}
                      weight="Outline"
                      className="mt-px shrink-0 text-alva-accent"
                    />
                    <p className="text-xs leading-relaxed text-foreground">{item.fix}</p>
                  </div>
                </div>
              ))}
            </div>
          </Section>

          <Section title="More">
            <div className="space-y-1.5">
              <GuideLink href={ALVA_LINKS.payments}>How you get paid</GuideLink>
              <GuideLink href={ALVA_LINKS.terms}>Terms and conditions</GuideLink>
              <GuideLink href={ALVA_LINKS.privacy}>Privacy policy</GuideLink>
            </div>
          </Section>

          {/* Only on the forced read. Reaching it is what releases the hold,
              so it has to be the last thing in the scroller, and it says so
              rather than leaving somebody to guess why nothing closes. */}
          {mustRead ? (
            <div className="mt-5 border-t border-alva-border pt-4">
              <TextureButton
                variant="alva"
                size="lg"
                disabled={!reachedEnd}
                onClick={() => onOpenChange(false)}
              >
                {reachedEnd ? "Got it" : "Scroll to the end to continue"}
              </TextureButton>
            </div>
          ) : null}
        </div>

        {/* A nudge, not a control. It fades out once they are moving, since
            by then they know the panel scrolls. */}
        {locked && progress < 0.08 ? (
          <span
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-3 z-20 flex justify-center"
          >
            <span className="flex items-center gap-1 rounded-full bg-alva-bg/90 px-2.5 py-1 text-[11px] text-muted-foreground">
              <AltArrowDown size={12} weight="Outline" />
              Read to the end
            </span>
          </span>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

function Tab({
  id,
  active,
  onSelect,
  icon: Icon,
  label,
}: {
  id: Mode;
  active: Mode;
  onSelect: (next: Mode) => void;
  icon: ComponentType<IconProps>;
  label: string;
}) {
  const selected = active === id;

  return (
    <button
      type="button"
      role="tab"
      aria-selected={selected}
      onClick={() => onSelect(id)}
      className={cn(
        "flex flex-1 items-center justify-center gap-1.5 rounded-full px-2 py-2 text-xs font-medium transition-colors",
        selected
          ? "bg-alva-accent text-alva-bg"
          : "text-muted-foreground hover:text-foreground"
      )}
    >
      <Icon size={14} weight={selected ? "BoldDuotone" : "Outline"} />
      {label}
    </button>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-alva-border pt-4 first:border-t-0 first:pt-0 [&+section]:mt-5">
      <h3 className="mb-2.5 text-sm font-semibold text-foreground">{title}</h3>
      {children}
    </section>
  );
}

function Steps({ steps }: { steps: GuideStep[] }) {
  return (
    <ul className="space-y-2.5">
      {steps.map((step) => {
        const Icon = ICONS[step.icon];
        return (
          <li key={step.title} className="flex gap-3">
            <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-alva-surface">
              <Icon size={16} weight="Outline" className="text-alva-accent" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">{step.title}</p>
              <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                {step.detail}
              </p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function Figure({ caption, children }: { caption: string; children: React.ReactNode }) {
  return (
    <figure className="mt-3 rounded-2xl bg-alva-surface px-3 py-3">
      {children}
      <figcaption className="mt-1.5 text-center text-[11px] leading-relaxed text-muted-foreground">
        {caption}
      </figcaption>
    </figure>
  );
}

/** Opens outside the app, so it says so and carries the usual safety rel. */
function GuideLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      className="flex items-center justify-between rounded-xl bg-alva-surface px-3.5 py-2.5 text-sm text-foreground transition-colors hover:text-alva-accent"
    >
      {children}
      <span aria-hidden className="text-muted-foreground">
        ↗
      </span>
    </a>
  );
}
