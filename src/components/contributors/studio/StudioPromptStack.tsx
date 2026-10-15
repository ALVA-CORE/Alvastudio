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
  className?: string;
};

const MAX_VISIBLE = 4;
const CARD_OFFSET = 20;
/** Enough for the controls to sit where the eye expects on a short prompt. */
const MIN_CARD_REM = 12;
const SCALE_FACTOR = 0.04;

export function StudioPromptStack({
  items,
  current,
  onNext,
  onPrevious,
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
        className="relative w-full overflow-x-clip"
        style={{ minHeight: `${MIN_CARD_REM}rem` }}
      >
        {/* Sets the height: the top card's own text, plus room for the backs
            to peek below it. */}
        <div
          aria-hidden
          className="invisible px-7 pb-8 pt-16 text-center text-xl font-semibold leading-snug"
          style={{ paddingBottom: 32 + stack.length * CARD_OFFSET }}
        >
          {stack[0]?.prompt}
        </div>

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
                  /* Measured from the top of the box, so a back card at the
                     same offset would sit under the middle of the top card.
                     They are pushed to its bottom edge instead. */
                  top:
                    index === 0
                      ? 0
                      : `calc(100% - ${(stack.length - index) * CARD_OFFSET}px)`,
                  scale: 1 - index * SCALE_FACTOR,
                  zIndex: stack.length - index,
                }}
                transition={{ type: "spring", stiffness: 260, damping: 26 }}
                drag={isTop ? "x" : false}
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
                      <PromptFace prompt={card.prompt} active />
                    </BorderBeam>
                  </div>
                ) : (
                  /* The cards behind are edges, not cards. They used to render
                     their own text at their own length, which showed through
                     under the top card and made the stack look broken. They
                     are a fixed sliver now, which is all that is visible of
                     them anyway. */
                  <PromptBack depth={index} />
                )}
              </motion.div>
            );
          })}
      </div>

      <div className="mt-10 flex items-center justify-center gap-6">
        <button
          type="button"
          onClick={onPrevious}
          aria-label="Previous prompt"
          className="text-muted-foreground transition-colors hover:text-foreground"
        >
          <AltArrowLeft size={20} weight="Outline" />
        </button>
        <span className="text-xs text-muted-foreground">Swipe to move</span>
        <button
          type="button"
          onClick={onNext}
          aria-label="Next prompt"
          className="text-muted-foreground transition-colors hover:text-foreground"
        >
          <AltArrowRight size={20} weight="Outline" />
        </button>
      </div>
    </div>
  );
}

/** A card behind the top one. Just its lit edge. */
function PromptBack({ depth }: { depth: number }) {
  return (
    <div
      aria-hidden
      className="h-16 w-full rounded-[28px] shadow-[0_12px_28px_rgba(0,0,0,0.22)]"
      style={{
        backgroundColor: `hsl(var(--alva-accent) / ${Math.max(
          0.22,
          0.6 - depth * 0.18
        )})`,
      }}
    />
  );
}

function PromptFace({
  prompt,
  active,
  depth = 0,
}: {
  prompt: string;
  active?: boolean;
  depth?: number;
}) {
  const accentOpacity = Math.max(0.22, 0.72 - depth * 0.18);

  return (
    <div
      className={cn(
        "flex w-full flex-col items-center justify-center rounded-[28px] px-7 py-8 text-center shadow-[0_12px_28px_rgba(0,0,0,0.22)]",
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
        and read the sentence aloud
      </div>
      <p
        className={cn(
          "text-balance text-xl font-semibold leading-snug",
          active ? "text-alva-bg" : "text-alva-bg/85"
        )}
      >
        {prompt}
      </p>
    </div>
  );
}
