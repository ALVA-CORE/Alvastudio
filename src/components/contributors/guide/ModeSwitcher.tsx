import { useEffect, useRef, useState } from "react";
import Microphone3 from "@solar-icons/react/video/Microphone3";
import AltArrowDown from "@solar-icons/react/arrows/AltArrowDown";
import PlaylistMinimalistic from "@solar-icons/react/list/PlaylistMinimalistic";
import CheckCircle from "@solar-icons/react/ui/CheckCircle";
import { BorderBeam } from "border-beam";
import { useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

export type GuideMode = "prompt" | "stimuli";

/** The two a contributor picks. Focus group is an invitation, not a mode. */
export const GUIDE_MODES = [
  { id: "prompt", label: "Prompt reader", icon: PlaylistMinimalistic },
  { id: "stimuli", label: "Stimuli", icon: Microphone3 },
] as const;

/** Long enough to notice, short enough not to feel stuck. */
const BEAT_MS = 2400;

/**
 * The Record page's mode switch, working.
 *
 * This replaces the tab bar that used to sit above the two sets of rules.
 * Tabs taught somebody how to use a control that only exists in the guide;
 * this is the control they will actually use, in the place they will use
 * it, doing the thing it does. Picking "Stimuli" here shows the stimuli
 * rules, which is exactly what picking it on the Record page does.
 *
 * **It demonstrates itself until it is touched.** A small round button with
 * an icon in it does not announce that it opens, so left alone it opens,
 * shows what is inside, and closes again. The first interaction of any kind
 * stops that for good: a control that keeps animating under somebody's
 * thumb is fighting them.
 *
 * Built from the real control's pieces, beam included, rather than a
 * screenshot, so it cannot go stale the next time that page changes.
 */
export function ModeSwitcher({
  value,
  onChange,
}: {
  value: GuideMode;
  onChange: (next: GuideMode) => void;
}) {
  const reduced = useReducedMotion() ?? false;

  const [open, setOpen] = useState(false);
  const [touched, setTouched] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  const demoing = !touched && !reduced;

  /* Open, hold, close, pause. Four beats so the closed state is visible for
     as long as the open one, which is what makes it read as a thing being
     opened rather than a panel that flickers. */
  useEffect(() => {
    if (!demoing) return;

    const timer = window.setInterval(() => {
      /* Not while the tab is in the background: it would run for an hour
         behind another window, for nobody. */
      if (document.hidden) return;
      setOpen((value) => !value);
    }, BEAT_MS);

    return () => window.clearInterval(timer);
  }, [demoing]);

  /* Reduced motion gets it open and still, which is the state that carries
     the information. */
  useEffect(() => {
    if (reduced) setOpen(true);
  }, [reduced]);

  /**
   * Closes on a click elsewhere, the way a menu is expected to.
   *
   * Only once it is a real menu. While it is still demonstrating, a tap
   * anywhere on the sheet — including a scroll that starts with a finger
   * down on the text — would snap it shut mid-beat.
   *
   * `pointerdown` rather than `click`, so it closes on the way down and not
   * after a drag that happened to end elsewhere.
   */
  useEffect(() => {
    if (!touched || !open) return;

    const onDown = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };

    /* Deferred a frame: the click that opened this is still propagating,
       and attaching synchronously would let that same event close it. */
    const timer = window.setTimeout(() => {
      document.addEventListener("pointerdown", onDown);
    }, 0);

    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("pointerdown", onDown);
    };
  }, [touched, open]);

  const take = () => setTouched(true);

  const active = GUIDE_MODES.find((mode) => mode.id === value) ?? GUIDE_MODES[0];
  const ActiveIcon = active.icon;

  return (
    <div ref={root} className="flex items-start gap-3">
      <div className="relative shrink-0 overflow-visible rounded-full">
        <BorderBeam
          size="pulse-outside"
          colorVariant="mono"
          theme="dark"
          strength={0.9}
          duration={2.4}
          borderRadius={999}
        >
          <BorderBeam
            size="md"
            colorVariant="mono"
            theme="dark"
            strength={1}
            duration={1.9}
            borderRadius={999}
          >
            <button
              type="button"
              aria-haspopup="listbox"
              aria-expanded={open}
              aria-label={`Recording mode, ${active.label}`}
              /* Opens and closes. The demo stops on the first press, so
                 from then on this is the only thing moving it. */
              onClick={() => {
                take();
                setOpen((current) => !current);
              }}
              className="inline-flex h-10 items-center gap-1.5 rounded-full bg-alva-bg px-3 text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-alva-accent"
            >
              <ActiveIcon size={18} weight="BoldDuotone" className="text-alva-accent" />
              <AltArrowDown
                size={16}
                weight="Outline"
                className={cn(
                  "text-muted-foreground transition-transform duration-300",
                  open && "rotate-180"
                )}
              />
            </button>
          </BorderBeam>
        </BorderBeam>
      </div>

      {/* Animated by max-height rather than mounted and unmounted, so the
          card around it does not jump every couple of seconds while
          somebody is reading past it. */}
      <div
        role="listbox"
        aria-label="Kind of recording"
        className={cn(
          "min-w-0 flex-1 overflow-hidden rounded-xl border bg-alva-bg transition-all duration-300 ease-out",
          open
            ? "max-h-24 border-alva-border opacity-100"
            : "pointer-events-none max-h-0 border-transparent opacity-0"
        )}
      >
        {GUIDE_MODES.map((mode) => {
          const Icon = mode.icon;
          const selected = mode.id === value;

          return (
            <button
              key={mode.id}
              type="button"
              role="option"
              aria-selected={selected}
              tabIndex={open ? 0 : -1}
              onClick={() => {
                take();
                onChange(mode.id);
                setOpen(false);
              }}
              className={cn(
                "flex w-full items-center gap-2 px-2.5 py-2 text-left text-xs transition-colors",
                "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-alva-accent",
                selected
                  ? "bg-alva-surface text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon
                size={15}
                weight={selected ? "BoldDuotone" : "Outline"}
                className={selected ? "text-alva-accent" : "text-muted-foreground"}
              />
              <span className="flex-1 truncate">{mode.label}</span>
              {selected ? (
                <CheckCircle size={13} weight="Bold" className="shrink-0 text-alva-accent" />
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
