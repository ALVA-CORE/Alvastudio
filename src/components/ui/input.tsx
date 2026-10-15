import * as React from "react"

import { FieldBeam } from "@/components/shared/FieldBeam"
import { cn } from "@/lib/utils"

/**
 * Every text field in the product.
 *
 * Wrapped in `FieldBeam`, so focusing any input runs the same border beam the
 * auth screens use. That was the one place it appeared before, which made the
 * first screen a new user sees behave unlike every screen after it.
 *
 * `wrapperClassName` exists because the beam adds a wrapping element, and
 * layout classes have to go on it rather than on `className`.
 *
 * `className` lands on the `<input>`, which sits INSIDE the beam's box. A
 * margin there pushes the field down within the beam and leaves a bright gap
 * along the top edge — the beam is drawn around the wrapper, which is still
 * where it was. Spacing, width, grid span: all `wrapperClassName`.
 */
const Input = React.forwardRef<
  HTMLInputElement,
  React.ComponentProps<"input"> & { wrapperClassName?: string }
>(({ className, wrapperClassName, type, ...props }, ref) => {
  return (
    <FieldBeam className={wrapperClassName}>
      <input
        type={type}
        className={cn(
          // Rounded, not a pill, and borderless throughout: the beam is the
          // focus affordance, and a ring inside it reads as a double border.
          "flex h-11 w-full rounded-xl border border-transparent bg-alva-surface px-4 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-0 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className
        )}
        ref={ref}
        {...props}
      />
    </FieldBeam>
  )
})
Input.displayName = "Input"

export { Input }
