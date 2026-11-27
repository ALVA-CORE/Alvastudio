import { useEffect, useRef } from "react";
import CheckCircle from "@solar-icons/react/ui/CheckCircle";
import Magnifier from "@solar-icons/react/search/Magnifier";
import { NON_SPEECH_COLOR } from "@/lib/annotation/tags";
import type { SoundTag } from "@/lib/annotation/markers";
import { cn } from "@/lib/utils";

/**
 * Sound tags, as every list of them shows them: the `[` list while typing,
 * and the menu that changes a tag.
 *
 * Picked on mouse down, so the text box keeps focus and edit mode stays open.
 */
export function SoundTagList({
  tags,
  current,
  highlight = -1,
  onPick,
  search,
  typed,
  footer,
}: {
  /** Already filtered (`findSoundTags`). */
  tags: SoundTag[];
  /** The tag being changed, ticked. */
  current?: string;
  /** Keyboard position in `tags`, for the `[` list. */
  highlight?: number;
  onPick: (type: string) => void;
  /** A search box at the top, where there is no typing to search by. */
  search?: { value: string; onChange: (value: string) => void };
  /** The `[` list: what is typed after the `[`, shown as its search. */
  typed?: string;
  footer?: React.ReactNode;
}) {
  /* The arrow keys move past the visible rows; keep the picked one in view. */
  const listRef = useRef<HTMLUListElement>(null);
  useEffect(() => {
    listRef.current?.querySelector('[aria-selected="true"]')?.scrollIntoView?.({ block: "nearest" });
  }, [highlight, tags]);

  return (
    <div className="w-56 overflow-hidden rounded-xl border border-alva-border bg-alva-card shadow-lg">
      {search ? (
        <label className="flex items-center gap-2 border-b border-alva-border px-3 py-2">
          <Magnifier size={14} weight="Linear" className="shrink-0 text-muted-foreground" />
          <input
            autoFocus
            value={search.value}
            onChange={(event) => search.onChange(event.target.value)}
            placeholder="Search sounds"
            aria-label="Search sounds"
            className="min-w-0 flex-1 bg-transparent text-xs text-foreground outline-none placeholder:text-muted-foreground"
          />
        </label>
      ) : null}
      {typed !== undefined ? (
        <div className="flex items-center gap-2 border-b border-alva-border px-3 py-2 text-xs">
          <Magnifier size={14} weight="Linear" className="shrink-0 text-muted-foreground" />
          {typed ? (
            <span className="min-w-0 flex-1 truncate text-foreground">{typed}</span>
          ) : (
            <span className="min-w-0 flex-1 truncate text-muted-foreground">Keep typing to search</span>
          )}
          <span className="shrink-0 tabular-nums text-muted-foreground">{tags.length}</span>
        </div>
      ) : null}
      <ul ref={listRef} role="listbox" aria-label="Sound tags" className="max-h-64 overflow-y-auto py-1">
        {tags.length === 0 ? <li className="px-3 py-2 text-xs text-muted-foreground">No sound by that name</li> : null}
        {tags.map((tag, index) => (
          <li
            key={tag.type}
            role="option"
            aria-selected={index === highlight}
            onMouseDown={(event) => {
              event.preventDefault();
              onPick(tag.type);
            }}
            className={cn(
              "flex cursor-pointer items-center gap-2 px-3 py-1.5 text-xs hover:bg-alva-surface",
              index === highlight && "bg-alva-surface"
            )}
          >
            <span style={{ color: NON_SPEECH_COLOR }}>[{tag.marker}]</span>
            <span className="min-w-0 flex-1 truncate text-muted-foreground">{tag.label}</span>
            {tag.type === current ? <CheckCircle size={13} weight="Bold" className="text-alva-accent" /> : null}
          </li>
        ))}
      </ul>
      {footer}
    </div>
  );
}
