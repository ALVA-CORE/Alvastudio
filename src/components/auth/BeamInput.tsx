import {
  forwardRef,
  useState,
  type ComponentProps,
  type FocusEvent,
  type ChangeEvent,
} from "react";
import { BorderBeam } from "border-beam";
import Eye from "@solar-icons/react/security/Eye";
import EyeClosed from "@solar-icons/react/security/EyeClosed";
import { cn } from "@/lib/utils";

/** Rounded, not a pill. Matches the `rounded-xl` on the field itself. */
const INPUT_RADIUS = 12;

export type BeamInputProps = Omit<ComponentProps<"input">, "placeholder"> & {
  /** Floating hint. Animates from inside the field to just above it. */
  label: string;
  showPasswordToggle?: boolean;
};

/**
 * The lifted label rides the field's top border, with nothing behind it.
 *
 * It used to carry a `bg-alva-surface` patch to hide the border line running
 * through the text. The patch was the problem: one surface sitting on
 * another, and a visible rectangle wherever the two did not match exactly.
 * Without it the text simply crosses the edge, which is the look this was
 * imitating in the first place.
 *
 * The field also no longer repads itself when the label lifts. The extra top
 * padding existed to drop the value clear of the label, and it nudged the
 * content down the moment somebody started typing. It was never needed: the label's
 * baseline sits above the field's text box at every size here.
 */
export const BeamInput = forwardRef<HTMLInputElement, BeamInputProps>(
  (
    {
      className,
      label,
      type = "text",
      showPasswordToggle = false,
      value,
      defaultValue,
      onFocus,
      onBlur,
      onChange,
      ...props
    },
    ref
  ) => {
    const [focused, setFocused] = useState(false);
    const [visible, setVisible] = useState(false);
    const [filled, setFilled] = useState(
      Boolean(value?.toString().length || defaultValue?.toString().length)
    );

    const active =
      focused ||
      filled ||
      Boolean(value !== undefined && String(value).length > 0);

    const inputType = showPasswordToggle
      ? visible
        ? "text"
        : "password"
      : type;

    const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
      setFilled(e.target.value.length > 0);
      onChange?.(e);
    };

    return (
      <div className="relative overflow-visible pt-2">
        <span
          className={cn(
            "pointer-events-none absolute z-20 max-w-[calc(100%-3.5rem)] truncate transition-all duration-200 ease-out",
            active
              ? "left-4 top-2 -translate-y-1/2 text-[11px] font-medium leading-none text-alva-accent"
              : "left-5 top-[calc(0.5rem+24px)] -translate-y-1/2 text-sm text-muted-foreground"
          )}
        >
          {label}
        </span>

        <BorderBeam
          size="md"
          colorVariant="mono"
          theme="dark"
          active={focused}
          strength={1}
          duration={1.96}
          borderRadius={INPUT_RADIUS}
          className="w-full overflow-hidden rounded-xl"
        >
          <div className="relative rounded-xl">
            <input
              ref={ref}
              /* The visible label is a positioned span, not a `<label for>`,
                 because it animates from inside the field to above it. So the
                 input carries the name itself: without this every field on
                 every auth form is unlabelled to a screen reader. */
              aria-label={props["aria-label"] ?? label}
              type={inputType}
              value={value}
              defaultValue={defaultValue}
              placeholder=""
              className={cn(
                "flex h-12 w-full rounded-xl border border-transparent bg-alva-surface text-base text-foreground",
                // Borderless throughout: the BorderBeam wrapping this field is the
                // focus affordance, and a second ring inside it reads as a double border.
                "focus-visible:outline-none",
                "disabled:cursor-not-allowed disabled:opacity-50",
                "px-5",
                showPasswordToggle && "pr-12",
                className
              )}
              onFocus={(e: FocusEvent<HTMLInputElement>) => {
                setFocused(true);
                onFocus?.(e);
              }}
              onBlur={(e: FocusEvent<HTMLInputElement>) => {
                setFocused(false);
                onBlur?.(e);
              }}
              onChange={handleChange}
              {...props}
            />

            {showPasswordToggle && (
              <button
                type="button"
                tabIndex={-1}
                aria-label={visible ? "Hide password" : "Show password"}
                onClick={() => setVisible((v) => !v)}
                className="absolute right-4 top-1/2 z-10 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
              >
                {visible ? (
                  <EyeClosed size={20} weight="Linear" />
                ) : (
                  <Eye size={20} weight="Linear" />
                )}
              </button>
            )}
          </div>
        </BorderBeam>
      </div>
    );
  }
);

BeamInput.displayName = "BeamInput";
