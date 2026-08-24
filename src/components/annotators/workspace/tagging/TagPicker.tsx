import { memo } from "react";
import TagHorizontal from "@solar-icons/react/money/TagHorizontal";
import TrashBinMinimalistic from "@solar-icons/react/ui/TrashBinMinimalistic";
import CheckCircle from "@solar-icons/react/ui/CheckCircle";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  NON_SPEECH_COLOR,
  NON_SPEECH_OPTIONS,
  TAG_FAMILIES,
  tagLabel,
  type SpanKind,
} from "@/lib/annotation/tags";
import type { AnnotationSpan } from "@/lib/annotation/types";
import { cn } from "@/lib/utils";

/**
 * The tag affordance that appears beside a text selection.
 *
 * Families are submenus rather than one flat list: there are thirty-odd values
 * across four taxonomies, and a flat menu of thirty is a scroll, not a choice.
 * Each family carries its hue on the trigger so the mapping between colour and
 * category is learned from the menu itself.
 */

export type TagPickerProps = {
  /** Tags already on the selected range — shown ticked, and removable. */
  applied: AnnotationSpan[];
  onApply: (kind: SpanKind, value: string) => void;
  onRemove: (spanId: string) => void;
  /** Anchored to the selection's last token. */
  onAddNonSpeech: (type: string) => void;
  /** Rendered as the trigger. Defaults to a compact tag button. */
  label?: string;
  className?: string;
};

function TagPickerImpl({
  applied,
  onApply,
  onRemove,
  onAddNonSpeech,
  label,
  className,
}: TagPickerProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Tag selection"
          className={cn(
            "inline-flex items-center gap-1 rounded-lg bg-alva-card px-1.5 py-1 text-[11px] text-muted-foreground shadow-sm transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-alva-accent",
            className
          )}
        >
          <TagHorizontal size={13} weight="Outline" />
          {label}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="w-56">
        {applied.length > 0 && (
          <>
            <DropdownMenuLabel className="text-[10px] uppercase tracking-wide text-muted-foreground">
              On this selection
            </DropdownMenuLabel>
            {applied.map((span) => (
              <DropdownMenuItem
                key={span.id}
                onSelect={() => onRemove(span.id)}
                className="gap-2 text-xs"
              >
                <span
                  aria-hidden
                  className="size-2 shrink-0 rounded-full"
                  style={{ backgroundColor: tagHue(span.kind) }}
                />
                <span className="min-w-0 flex-1 truncate">
                  {tagLabel(span.kind, span.value)}
                </span>
                <TrashBinMinimalistic
                  size={13}
                  weight="Outline"
                  className="shrink-0 text-muted-foreground"
                />
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
          </>
        )}

        {TAG_FAMILIES.map((family) => (
          <DropdownMenuSub key={family.kind}>
            <DropdownMenuSubTrigger className="gap-2 text-xs">
              <span
                aria-hidden
                className="size-2 shrink-0 rounded-full"
                style={{ backgroundColor: family.color }}
              />
              {family.label}
            </DropdownMenuSubTrigger>

            <DropdownMenuSubContent className="w-56">
              {family.options.map((option) => {
                const active = applied.some(
                  (span) => span.kind === family.kind && span.value === option.value
                );

                return (
                  <DropdownMenuItem
                    key={option.value}
                    onSelect={() => onApply(family.kind, option.value)}
                    className="gap-2 text-xs"
                    title={option.hint}
                  >
                    <span className="min-w-0 flex-1 truncate">{option.label}</span>
                    {active && (
                      <CheckCircle
                        size={13}
                        weight="Bold"
                        className="shrink-0 text-alva-accent"
                      />
                    )}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        ))}

        <DropdownMenuSeparator />

        <DropdownMenuSub>
          <DropdownMenuSubTrigger className="gap-2 text-xs">
            <span
              aria-hidden
              className="size-2 shrink-0 rounded-full"
              style={{ backgroundColor: NON_SPEECH_COLOR }}
            />
            Non-speech event
          </DropdownMenuSubTrigger>

          <DropdownMenuSubContent className="w-52">
            {NON_SPEECH_OPTIONS.map((option) => (
              <DropdownMenuItem
                key={option.value}
                onSelect={() => onAddNonSpeech(option.value)}
                className="text-xs"
              >
                {option.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function tagHue(kind: SpanKind): string {
  return TAG_FAMILIES.find((family) => family.kind === kind)?.color ?? "#A1A1AA";
}

export const TagPicker = memo(TagPickerImpl);
