import { useState, type ReactNode } from "react";
import { BorderBeam } from "border-beam";
import { cn } from "@/lib/utils";

/** Matches the `rounded-xl` every field in the product uses. */
const FIELD_RADIUS = 12;

/**
 * Runs a border beam around a field while it has focus.
 *
 * The auth screens had this and nothing else did, which meant the one place a
 * new user meets the product looked different from everywhere they go
 * afterwards. Lifting it out of `BeamInput` makes it something any field can
 * wear — an input, a textarea, a select trigger — without each one
 * re-implementing the focus tracking.
 *
 * Focus is tracked with `focusin`/`focusout` on the wrapper rather than on the
 * control itself, so a field with something inside it — a password toggle, a
 * select's chevron — keeps the beam while that part is being used.
 */
export function FieldBeam({
  children,
  className,
  /** Overrides the internal tracking for a control that manages its own state. */
  active,
  radius = FIELD_RADIUS,
}: {
  children: ReactNode;
  className?: string;
  active?: boolean;
  radius?: number;
}) {
  const [focused, setFocused] = useState(false);
  const isActive = active ?? focused;

  return (
    <BorderBeam
      size="md"
      colorVariant="mono"
      theme="dark"
      active={isActive}
      strength={1}
      duration={1.96}
      borderRadius={radius}
      className={cn("w-full overflow-hidden rounded-xl", className)}
    >
      <div
        className="relative rounded-xl"
        onFocusCapture={() => setFocused(true)}
        onBlurCapture={(event) => {
          // Only drop the beam once focus has left the field entirely.
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
            setFocused(false);
          }
        }}
      >
        {children}
      </div>
    </BorderBeam>
  );
}
