import { motion } from "framer-motion";
import Microphone3 from "@solar-icons/react/video/Microphone3";
import AltArrowLeft from "@solar-icons/react/arrows/AltArrowLeft";
import AltArrowRight from "@solar-icons/react/arrows/AltArrowRight";
import { BorderBeam } from "border-beam";
import { alvaAccentTextureClass } from "@/lib/alva-texture";
import { cn } from "@/lib/utils";

export type PromptCard = {
  /** String once these come from the API — the bank uses UUIDs, not indexes. */
  id: string | number;
  prompt: string;
};

type StudioPromptStackProps = {
  items: PromptCard[];
  current: number;
  onNext: () => void;
  onPrevious: () => void;
  /**
   * What to do with the card, after "Click [mic]".
   *
   * A prompt is read aloud; a stimulus is described in the speaker's own
   * words; a focus-group topic is discussed. Telling somebody to read a
   * scene description is telling them to do the wrong thing.
   */
  hint?: string;
  /**
   * Locks the stack while a take is in progress.
   *
   * Moving to another card mid-recording would leave the audio attached to a
   * prompt nobody was looking at, and the take is discarded on every move, so
   * it would also throw the recording away without asking.
   */
  locked?: boolean;
  className?: string;
};

const MAX_VISIBLE = 4;
const CARD_OFFSET = 20;
/**
 * One height for every card in the stack.
 *
 * Briefly this sized to the text, which broke the stack: the cards behind are
 * positioned by offset from the top, so they only read as a stack when they
 * are the same height as the card in front. Different heights left them
 * sticking out at the bottom in a heap.
 */
const CARD_HEIGHT = "h-[18.5rem]";
const SCALE_FACTOR = 0.04;

export function StudioPromptStack({
  items,
  current,
  onNext,
  onPrevious,
  hint,
  locked = false,
  className,
}: StudioPromptStackProps) {
  const len = items.length;
  const idx = ((current % len) + len) % len;
  const rotated = [...items.slice(idx), ...items.slice(0, idx)];
  const stack = rotated.slice(0, Math.min(MAX_VISIBLE, len));

  return (
    <div className={cn("relative w-full", className)}>
      {/* Height follows the top card instead of a fixed 18.5rem. A short
          prompt used to sit in a card two thirds empty, which read as
          something failing to load. The spacer carries the same text at the
          same size, so the box is exactly as tall as the words need plus the
          peek of the cards behind. */}
      {/* `overflow-x-clip`, not hidden: the top card drags past its own edge
          and was pushing the page sideways on a phone. `clip` stops that
          without creating a scroll container, so the border beam still blooms
          outside the card. */}
      <div
        className={cn(
          "relative w-full overflow-x-clip",
          CARD_HEIGHT
        )}
        style={{ paddingBottom: (stack.length - 1) * CARD_OFFSET }}
      >

        {stack
          .slice()
          .reverse()
          .map((card, reversedIndex) => {
            const index = stack.length - reversedIndex - 1;
            const isTop = index === 0;

            return (
              <motion.div
                key={card.id}
                className="absolute inset-x-0"
                style={{ transformOrigin: "top center" }}
                animate={{
                  top: index * CARD_OFFSET,
                  scale: 1 - index * SCALE_FACTOR,
                  zIndex: stack.length - index,
                }}
                transition={{ type: "spring", stiffness: 260, damping: 26 }}
                drag={isTop && !locked ? "x" : false}
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.45}
                onDragEnd={(_, info) => {
                  if (info.offset.x < -80) onNext();
                  else if (info.offset.x > 80) onPrevious();
                }}
              >
                {isTop ? (
                  <div className="relative overflow-visible rounded-[28px]">
                    <BorderBeam
                      size="pulse-outside"
                      colorVariant="mono"
                      theme="dark"
                      strength={0.95}
                      duration={2.2}
                      borderRadius={28}
                    >
                      <PromptFace prompt={card.prompt} hint={hint} active />
                    </BorderBeam>
                  </div>
                ) : (
                  /* No text on the cards behind. Only their bottom edge shows,
                     and rendering their own prompt at their own length made it
                     bleed through under the top card. */
                  <PromptFace depth={index} />
                )}
              </motion.div>
            );
          })}
      </div>

      <div className="mt-10 flex items-center justify-center gap-6">
        <button
          type="button"
          onClick={onPrevious}
          disabled={locked}
          aria-label="Previous prompt"
          className={cn(
            "transition-colors",
            locked
              ? "cursor-not-allowed text-muted-foreground/40"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <AltArrowLeft size={20} weight="Outline" />
        </button>
        <span className="text-xs text-muted-foreground">
          {locked ? "Finish this take first" : "Swipe to move"}
        </span>
        <button
          type="button"
          onClick={onNext}
          disabled={locked}
          aria-label="Next prompt"
          className={cn(
            "transition-colors",
            locked
              ? "cursor-not-allowed text-muted-foreground/40"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <AltArrowRight size={20} weight="Outline" />
        </button>
      </div>
    </div>
  );
}

function PromptFace({
  prompt,
  hint,
  active,
  depth = 0,
}: {
  /** Omitted for the cards behind, which show nothing but their edge. */
  prompt?: string;
  hint?: string;
  active?: boolean;
  depth?: number;
}) {
  const accentOpacity = Math.max(0.22, 0.72 - depth * 0.18);

  return (
    <div
      className={cn(
        "flex w-full flex-col items-center justify-center rounded-[28px] px-7 text-center shadow-[0_12px_28px_rgba(0,0,0,0.22)]",
        CARD_HEIGHT,
        active
          ? cn(alvaAccentTextureClass, "shadow-[0_20px_40px_rgba(0,0,0,0.35)]")
          : "border border-alva-accent/25"
      )}
      style={
        !active
          ? { backgroundColor: `hsl(var(--alva-accent) / ${accentOpacity})` }
          : undefined
      }
    >
      {prompt ? (
        <>
          <div
            className={cn(
              "mb-5 inline-flex items-center gap-1.5 text-xs",
              active ? "text-alva-bg/75" : "text-alva-bg/70"
            )}
          >
            Click
            <Microphone3
              size={14}
              weight="BoldDuotone"
              className={active ? "text-alva-bg" : "text-alva-bg/90"}
            />
            {hint ?? "and read the sentence aloud"}
          </div>
          <p
            className={cn(
              "text-balance text-xl font-semibold leading-snug",
              active ? "text-alva-bg" : "text-alva-bg/85"
            )}
          >
            {prompt}
          </p>
        </>
      ) : null}
    </div>
  );
}
