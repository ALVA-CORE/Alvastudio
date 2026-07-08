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

const INPUT_HEIGHT = 48;
const INPUT_RADIUS = INPUT_HEIGHT / 2;

export type BeamInputProps = Omit<ComponentProps<"input">, "placeholder"> & {
  /** Floating hint — animates to the top border on focus */
  label: string;
  showPasswordToggle?: boolean;
};

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
      <BorderBeam
        size="md"
        colorVariant="mono"
        theme="dark"
        active={focused}
        strength={1}
        duration={1.96}
        borderRadius={INPUT_RADIUS}
        className="w-full overflow-hidden rounded-full"
      >
        <div className="relative rounded-full">
          <span
            className={cn(
              "pointer-events-none absolute z-10 max-w-[calc(100%-3.5rem)] truncate transition-all duration-200 ease-out",
              active
                ? "left-4 top-0 -translate-y-1/2 bg-alva-surface px-1.5 text-[11px] font-medium leading-none text-alva-accent"
                : "left-5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground"
            )}
          >
            {label}
          </span>

          <input
            ref={ref}
            type={inputType}
            value={value}
            defaultValue={defaultValue}
            placeholder=""
            className={cn(
              "flex h-12 w-full rounded-full border border-alva-border bg-alva-surface text-base text-foreground",
              "focus-visible:outline-none",
              "disabled:cursor-not-allowed disabled:opacity-50",
              active ? "px-5 pb-2.5 pt-5" : "px-5",
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
    );
  }
);

BeamInput.displayName = "BeamInput";
