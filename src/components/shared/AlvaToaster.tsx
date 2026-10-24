import { useEffect, useState } from "react";
import { AnimatePresence, motion, type PanInfo } from "framer-motion";
import CheckCircle from "@solar-icons/react/ui/CheckCircle";
import CloseCircle from "@solar-icons/react/ui/CloseCircle";
import InfoCircle from "@solar-icons/react/ui/InfoCircle";
import {
  alvaToast,
  subscribeToAlvaToasts,
  type AlvaToastItem,
  type AlvaToastVariant,
} from "@/lib/alva-toast";
import { cn } from "@/lib/utils";

const VARIANT_ICON: Record<
  AlvaToastVariant,
  typeof CheckCircle | null
> = {
  default: InfoCircle,
  success: CheckCircle,
  error: CloseCircle,
  accent: null,
};

const SWIPE_OFFSET = 48;
const SWIPE_VELOCITY = 280;

export function AlvaToaster() {
  const [items, setItems] = useState<AlvaToastItem[]>([]);

  useEffect(() => subscribeToAlvaToasts(setItems), []);

  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-[200] flex flex-col items-center gap-2 px-4">
      <AnimatePresence initial={false}>
        {items.map((item) => (
          <ToastPill key={item.id} item={item} />
        ))}
      </AnimatePresence>
    </div>
  );
}

function ToastPill({ item }: { item: AlvaToastItem }) {
  const DefaultIcon = VARIANT_ICON[item.variant];

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    const swiped =
      Math.abs(info.offset.x) > SWIPE_OFFSET ||
      Math.abs(info.offset.y) > SWIPE_OFFSET ||
      Math.abs(info.velocity.x) > SWIPE_VELOCITY ||
      Math.abs(info.velocity.y) > SWIPE_VELOCITY;

    if (swiped) {
      alvaToast.dismiss(item.id);
    }
  };

  return (
    <motion.div
      layout
      drag
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      dragElastic={0.75}
      onDragEnd={handleDragEnd}
      whileDrag={{ scale: 0.98, cursor: "grabbing" }}
      initial={{ y: -28, opacity: 0, scale: 0.96 }}
      animate={{ y: 0, opacity: 1, scale: 1 }}
      exit={{ y: -20, opacity: 0, scale: 0.96 }}
      transition={{ type: "spring", stiffness: 420, damping: 32 }}
      /* A pill while the message fits on one line, a rounded slab when it
         does not. The radius is half the one-line height, so a short toast is
         still a pill and a long one grows into a shape that holds two lines
         rather than cutting a sentence off mid-word. Two is the ceiling: past
         that it is a page, not a toast. */
      className="pointer-events-auto inline-flex max-w-[min(100%,24rem)] cursor-grab touch-none items-start gap-2.5 rounded-[18px] bg-alva-card px-4 py-2.5 shadow-[0_12px_32px_rgba(0,0,0,0.35)] active:cursor-grabbing"
    >
      {(item.icon || DefaultIcon) && (
        <span
          className={cn(
            /* `mt-px` sits it on the first line's optical centre once the
               text is smaller than the icon. */
            "mt-px flex size-6 shrink-0 items-center justify-center rounded-full",
            item.variant === "accent" && "bg-alva-accent text-alva-bg",
            item.variant === "success" && "bg-alva-accent/15 text-alva-accent",
            item.variant === "error" && "bg-destructive/15 text-destructive",
            item.variant === "default" && "bg-alva-surface text-muted-foreground"
          )}
        >
          {item.icon ? (
            item.icon
          ) : DefaultIcon ? (
            <DefaultIcon size={14} weight="Bold" />
          ) : null}
        </span>
      )}
      <p
        title={item.message}
        className="line-clamp-2 min-w-0 text-left text-xs font-medium leading-snug text-foreground"
      >
        {item.message}
      </p>
    </motion.div>
  );
}
