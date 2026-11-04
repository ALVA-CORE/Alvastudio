import type { ReactNode } from "react";
import MenuDots from "@solar-icons/react/ui/MenuDots";
import { ThinkingOrb } from "thinking-orbs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export type RowAction = {
  label: string;
  icon?: ReactNode;
  onSelect: () => void;
  disabled?: boolean;
  /** Drawn in the destructive colour, after a separator. */
  destructive?: boolean;
};

/**
 * The three-dot menu at the end of a table row.
 *
 * The same trigger the identity, duplicates and feedback tables draw, lifted
 * out so new tables use it rather than a fourth copy. Buttons in a row make
 * a stray click somebody's account; a menu puts one deliberate step in
 * front of every action, and keeps the row to its data.
 *
 * Destructive actions go last, below a separator, away from the rest.
 */
export function RowActionsMenu({
  label,
  actions,
  busy = false,
  disabled = false,
  className,
}: {
  /** Read by screen readers: "Actions for Esther Obi". */
  label: string;
  actions: RowAction[];
  /** An action from this row is running: the dots become a spinner. */
  busy?: boolean;
  disabled?: boolean;
  className?: string;
}) {
  const safe = actions.filter((action) => !action.destructive);
  const destructive = actions.filter((action) => action.destructive);

  return (
    <div className={cn("flex justify-end", className)}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild disabled={disabled || busy}>
          <button
            type="button"
            aria-label={label}
            aria-busy={busy || undefined}
            onClick={(event) => event.stopPropagation()}
            className="flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-alva-surface hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-alva-accent disabled:opacity-50"
          >
            {busy ? (
              <ThinkingOrb state="composing" size={20} theme="dark" aria-hidden />
            ) : (
              <MenuDots size={16} weight="Bold" className="rotate-90" />
            )}
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          align="end"
          className="w-48"
          onClick={(event) => event.stopPropagation()}
        >
          {safe.map((action) => (
            <DropdownMenuItem
              key={action.label}
              className="gap-2"
              disabled={action.disabled}
              onSelect={action.onSelect}
            >
              {action.icon}
              {action.label}
            </DropdownMenuItem>
          ))}
          {destructive.length > 0 && safe.length > 0 ? <DropdownMenuSeparator /> : null}
          {destructive.map((action) => (
            <DropdownMenuItem
              key={action.label}
              className="gap-2 text-destructive focus:text-destructive"
              disabled={action.disabled}
              onSelect={action.onSelect}
            >
              {action.icon}
              {action.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
