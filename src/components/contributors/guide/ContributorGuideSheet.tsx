import type { ComponentType } from "react";
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { DistanceArt, TakeShapeArt } from "@/components/contributors/guide/GuideArt";
import {
  NARRATION_STEPS,
  PROMPT_STEPS,
  REJECTIONS,
  SETUP_STEPS,
  type GuideIcon,
  type GuideStep,
} from "@/components/contributors/guide/guide-content";
import { ALVA_LINKS, SUPPORT_EMAIL, supportMailto } from "@/lib/links";

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

/**
 * How to get a recording approved, in one place.
 *
 * It lives on the nav rather than inside the profile because of *when* it is
 * wanted: halfway through a take that keeps coming back rejected, not while
 * somebody is editing their languages. One tap from anywhere, and it closes
 * back onto whatever they were doing — which is also why it is a sheet and
 * not a page. A page would lose the prompt they were reading.
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
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        aria-describedby={undefined}
        /* Floating, not docked.
           Inset on every side, so the nav stays visible and reachable
           underneath rather than being covered by the thing it opened — and
           rounded all round, because square bottom corners read as attached
           to an edge this is not touching.

           `bottom` clears the nav *and* the home indicator: the nav's own
           container adds the safe-area inset as padding, so a fixed rem
           value alone would sit on top of it on a notched phone.

           `flex flex-col` with `gap-0` because the sheet's base styles are
           neither, and the inner scroll below needs a column to be `flex-1`
           inside. Capped height, so that scroll is obviously the panel's and
           not the page moving underneath it. */
        className={
          "inset-x-3 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] top-auto " +
          "flex h-[70dvh] flex-col gap-0 rounded-3xl p-0 " +
          "border-alva-border bg-alva-card sm:mx-auto sm:max-w-lg"
        }
      >
        <SheetHeader className="shrink-0 px-5 pb-3 pt-5 text-left sm:text-left">
          <SheetTitle className="text-lg text-foreground">
            Getting your recordings approved
          </SheetTitle>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Every clip is checked by a person before it is paid. Here is what
            they are listening for.
          </p>
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-6">
          <Section title="Why this exists">
            <p className="text-sm leading-relaxed text-muted-foreground">
              Most voice tools are trained on foreign accents, so they get
              Nigerian voices wrong. Your recordings fix that — but only clean,
              clear ones, because poor audio teaches the technology the wrong
              things.
            </p>
          </Section>

          <Section title="Before you start">
            <Steps steps={SETUP_STEPS} />
            <Figure caption="About one hand-length. Closer distorts, further goes faint.">
              <DistanceArt />
            </Figure>
          </Section>

          <Section title="Reading sentences" eyebrow="Prompt reader">
            <Steps steps={PROMPT_STEPS} />
            <Figure caption="A beat of quiet at each end. Cut-off starts and ends are the most common rejection.">
              <TakeShapeArt />
            </Figure>
          </Section>

          <Section title="Telling stories" eyebrow="Stimuli narration">
            <p className="mb-3 text-sm leading-relaxed text-muted-foreground">
              You get a topic — something like “Tell us about a time your
              network failed at the worst moment.” Talk about it the way you
              would with a friend.
            </p>
            <Steps steps={NARRATION_STEPS} />
          </Section>

          <Section title="Why recordings get rejected">
            <p className="mb-3 text-sm leading-relaxed text-muted-foreground">
              A rejected recording is not paid. These are the reasons, and the
              fix for each.
            </p>
            <div className="space-y-2">
              {REJECTIONS.map((item) => (
                <div
                  key={item.reason}
                  className="rounded-2xl bg-alva-surface px-3.5 py-3"
                >
                  <div className="flex items-center gap-2">
                    <Danger size={15} weight="Outline" className="shrink-0 text-red-400" />
                    <p className="text-sm font-medium text-foreground">{item.reason}</p>
                  </div>

                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    {item.meaning}
                  </p>

                  {/* Set apart, because it is the only line that says what to
                      do next — and the only one somebody re-reads. */}
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
              <GuideLink href={supportMailto("Alva Studio — help")}>
                {SUPPORT_EMAIL}
              </GuideLink>
            </div>
          </Section>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Section({
  title,
  eyebrow,
  children,
}: {
  title: string;
  eyebrow?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-alva-border pt-4 first:border-t-0 first:pt-0 [&+section]:mt-5">
      {eyebrow ? (
        <p className="mb-0.5 text-[11px] uppercase tracking-wide text-alva-accent">
          {eyebrow}
        </p>
      ) : null}
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

function Figure({
  caption,
  children,
}: {
  caption: string;
  children: React.ReactNode;
}) {
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
  const external = href.startsWith("http");

  return (
    <a
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noreferrer noopener" : undefined}
      className="flex items-center justify-between rounded-xl bg-alva-surface px-3.5 py-2.5 text-sm text-foreground transition-colors hover:text-alva-accent"
    >
      {children}
      <span aria-hidden className="text-muted-foreground">
        ↗
      </span>
    </a>
  );
}
