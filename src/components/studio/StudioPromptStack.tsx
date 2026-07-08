import { motion, AnimatePresence } from "framer-motion";
import Microphone3 from "@solar-icons/react/video/Microphone3";
import AltArrowLeft from "@solar-icons/react/arrows/AltArrowLeft";
import AltArrowRight from "@solar-icons/react/arrows/AltArrowRight";
import { BorderBeam } from "border-beam";
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
const CARD_OFFSET = 12;
const SCALE_FACTOR = 0.05;

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
    <div className={cn("relative", className)}>
      <div className="relative mx-auto h-[19rem] w-full max-w-[22rem]">
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
                dragElastic={0.5}
                onDragEnd={(_, info) => {
                  if (info.offset.x < -80) onNext();
                  else if (info.offset.x > 80) onPrevious();
                }}
              >
                <div className="relative overflow-hidden rounded-[28px]">
                  {isTop && (
                    <BorderBeam
                      size="md"
                      colorVariant="mono"
                      theme="dark"
                      strength={1}
                      duration={2}
                      borderRadius={28}
                    >
                      <PromptFace prompt={card.prompt} active />
                    </BorderBeam>
                  )}
                  {!isTop && <PromptFace prompt={card.prompt} />}
                </div>
              </motion.div>
            );
          })}
      </div>

      <div className="mt-4 flex items-center justify-center gap-6">
        <button
          type="button"
          onClick={onPrevious}
          aria-label="Previous prompt"
          className="text-muted-foreground transition-colors hover:text-foreground"
        >
          <AltArrowLeft size={20} weight="Outline" />
        </button>
        <AnimatePresence mode="wait">
          <motion.span
            key={idx}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="text-xs text-muted-foreground"
          >
            Swipe to move
          </motion.span>
        </AnimatePresence>
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

function PromptFace({ prompt, active }: { prompt: string; active?: boolean }) {
  return (
    <div
      className={cn(
        "flex h-[19rem] w-full flex-col items-center justify-center rounded-[28px] px-6 text-center",
        active
          ? "bg-alva-card shadow-[0_20px_40px_rgba(0,0,0,0.35)]"
          : "bg-alva-surface/70"
      )}
    >
      <div
        className={cn(
          "mb-5 inline-flex items-center gap-1.5 text-xs",
          active ? "text-muted-foreground" : "text-muted-foreground/70"
        )}
      >
        <Microphone3 size={14} weight="BoldDuotone" className="text-alva-accent" />
        Read this sentence aloud
      </div>
      <p
        className={cn(
          "text-balance text-xl font-semibold leading-snug",
          active ? "text-foreground" : "text-foreground/70"
        )}
      >
        {prompt}
      </p>
    </div>
  );
}
