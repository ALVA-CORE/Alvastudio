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

/** How far each older toast peeks out from under the one in front. */
const STACK_GAP = 11;

/** And how much smaller, so depth reads without the gap having to be large. */
const STACK_SHRINK = 0.055;

/**
 * Three at most, piled rather than listed.
 *
 * They used to be a column: a second toast pushed the first down the screen,
 * which moved a message somebody was mid-way through reading and made three
 * at once take up a third of a phone. Stacked, the newest sits in front and
 * the ones behind peek out below it, so the position of the thing being read
 * never changes and the pile has a fixed height however many arrive.
 *
 * `alvaToast` keeps the newest first, which is also front-most here.
 */
export function AlvaToaster() {
  const [items, setItems] = useState<AlvaToastItem[]>([]);

  useEffect(() => subscribeToAlvaToasts(setItems), []);

  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-[200] flex justify-center px-4">
      <div className="relative w-full max-w-sm">
        <AnimatePresence initial={false}>
          {items.map((item, index) => (
            <ToastPill
              key={item.id}
              item={item}
              index={index}
              count={items.length}
            />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

function ToastPill({
  item,
  index,
  count,
}: {
  item: AlvaToastItem;
  /** 0 is the newest, and the one in front. */
  index: number;
  count: number;
}) {
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
    /* Two elements, not one. The outer holds the stack position and the inner
       is dragged: a single node cannot animate `y` for its place in the pile
       and have `y` driven by a pointer at the same time, and the toast would
       snap back to the top of the stack the moment it was picked up. */
    <motion.div
      className="absolute inset-x-0 top-0 flex justify-center"
      style={{ zIndex: count - index, transformOrigin: "top center" }}
      initial={{ y: -28, opacity: 0, scale: 0.96 }}
      animate={{
        y: index * STACK_GAP,
        opacity: 1,
        scale: 1 - index * STACK_SHRINK,
      }}
      exit={{ y: -20, opacity: 0, scale: 0.96 }}
      transition={{ type: "spring", stiffness: 420, damping: 32 }}
    >
      <motion.div
        drag
        dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
        dragElastic={0.75}
        onDragEnd={handleDragEnd}
        whileDrag={{ scale: 0.98, cursor: "grabbing" }}
        /* Fully round, at one line or two. A fixed radius was close enough
           to a pill on a short message and visibly a rounded rectangle on a
           long one, so the shape changed with the sentence. Two lines is the
           ceiling: past that it is a page, not a toast.

           `items-center` rather than `items-start`: with one line of text
           next to a 24px icon, aligning both to the top leaves the text
           sitting high against the circle. */
        className="pointer-events-auto inline-flex max-w-[min(100%,24rem)] cursor-grab touch-none items-center gap-2.5 rounded-full bg-alva-card px-4 py-2.5 shadow-[0_12px_32px_rgba(0,0,0,0.35)] active:cursor-grabbing"
      >
        {(item.icon || DefaultIcon) && (
          <span
            className={cn(
                "flex size-6 shrink-0 items-center justify-center rounded-full",
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
    </motion.div>
  );
}
