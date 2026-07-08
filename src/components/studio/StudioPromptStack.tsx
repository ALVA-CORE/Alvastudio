import { motion } from "framer-motion";
import Microphone3 from "@solar-icons/react/video/Microphone3";
import AltArrowLeft from "@solar-icons/react/arrows/AltArrowLeft";
import AltArrowRight from "@solar-icons/react/arrows/AltArrowRight";
import { BorderBeam } from "border-beam";
import { alvaAccentTextureClass } from "@/lib/alva-texture";
import { cn } from "@/lib/utils";

export type PromptCard = {
  id: number;
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
const CARD_OFFSET = 16;
const SCALE_FACTOR = 0.045;

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
      <div className="relative h-[18.5rem] w-full">
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
                  <PromptFace prompt={card.prompt} depth={index} />
                )}
              </motion.div>
            );
          })}
      </div>

      <div className="mt-5 flex items-center justify-center gap-6">
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

function PromptFace({
  prompt,
  active,
  depth = 0,
}: {
  prompt: string;
  active?: boolean;
  depth?: number;
}) {
  return (
    <div
      className={cn(
        "flex h-[18.5rem] w-full flex-col items-center justify-center rounded-[28px] px-6 text-center",
        active
          ? cn(alvaAccentTextureClass, "shadow-[0_20px_40px_rgba(0,0,0,0.35)]")
          : "border border-alva-border bg-alva-card"
      )}
      style={
        !active
          ? { opacity: Math.max(0.55, 0.92 - depth * 0.12) }
          : undefined
      }
    >
      <div
        className={cn(
          "mb-5 inline-flex items-center gap-1.5 text-xs",
          active ? "text-alva-bg/75" : "text-muted-foreground"
        )}
      >
        Click
        <Microphone3
          size={14}
          weight="BoldDuotone"
          className={active ? "text-alva-bg" : "text-alva-accent"}
        />
        and read the sentence aloud
      </div>
      <p
        className={cn(
          "text-balance text-xl font-semibold leading-snug",
          active ? "text-alva-bg" : "text-foreground/80"
        )}
      >
        {prompt}
      </p>
    </div>
  );
}
