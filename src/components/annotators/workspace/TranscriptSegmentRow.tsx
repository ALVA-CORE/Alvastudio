import { memo, useCallback, useState } from "react";
import CheckCircle from "@solar-icons/react/ui/CheckCircle";
import { SegmentTextEditor } from "@/components/annotators/workspace/SegmentTextEditor";
import { SpeakerAvatar } from "@/components/annotators/workspace/SpeakerAvatar";
import {
  ActiveSegmentText,
  StaticSegmentText,
} from "@/components/annotators/workspace/SegmentKaraokeText";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatTimecode, segmentDuration } from "@/lib/annotation/segments";
import {
  speakerDisplayName,
  type Segment,
  type SegmentId,
  type Speaker,
  type SpeakerId,
} from "@/lib/annotation/types";
import { cn } from "@/lib/utils";

/**
 * One transcript segment.
 *
 * Speaker identity in a fixed left gutter, a rail, then the timed text between
 * its two timecodes. The rail *line* never changes — not its width, not its
 * colour. Focus is expressed purely as a faded aura behind it, so a scrolling
 * page has no jitter from lines thickening and thinning.
 *
 * The text has two modes: a read-along display (muted, with the spoken word
 * lifted to foreground) and a textarea once you click in. A textarea cannot
 * carry per-word styling, so the swap is what makes the read-along possible.
 *
 * Memoised and fed primitives only — it must never subscribe to `currentTime`.
 */

export type TranscriptSegmentRowProps = {
  segment: Segment;
  speaker: Speaker | undefined;
  speakers: Speaker[];
  /** Playhead is inside this segment. Drives the read-along highlight only. */
  isActive: boolean;
  /**
   * The selected row — and the only lit rail, so exactly one can ever be
   * highlighted. Deliberately NOT tied to the playhead: if playback lit rails
   * too, Escape would clear the selection and appear to do nothing, because the
   * segment you just clicked is also the one the playhead moved to. Where
   * playback has reached is shown by the read-along text instead.
   */
  isHighlighted: boolean;
  isDimmed: boolean;
  isFirst: boolean;
  onSeek: (time: number) => void;
  onSelect: (id: SegmentId) => void;
  onTextChange: (id: SegmentId, text: string) => void;
  onSpeakerChange: (id: SegmentId, speakerId: SpeakerId) => void;
  onRenameSpeaker: (speakerId: SpeakerId, name: string) => void;
  onSplit: (id: SegmentId, time: number) => void;
  onMergeWithPrevious: (id: SegmentId) => void;
  onEndInteraction: () => void;
};

function TranscriptSegmentRowImpl({
  segment,
  speaker,
  speakers,
  isActive,
  isHighlighted,
  isDimmed,
  isFirst,
  onSeek,
  onSelect,
  onTextChange,
  onSpeakerChange,
  onRenameSpeaker,
  onSplit,
  onMergeWithPrevious,
  onEndInteraction,
}: TranscriptSegmentRowProps) {
  const [isEditing, setEditing] = useState(false);
  const [renamingSpeaker, setRenamingSpeaker] = useState(false);
  const [speakerDraft, setSpeakerDraft] = useState("");
  const resolved = speaker ?? FALLBACK_SPEAKER;

  const commitRename = () => {
    setRenamingSpeaker(false);
    const next = speakerDraft.trim();
    if (next && next !== speakerDisplayName(resolved)) onRenameSpeaker(resolved.id, next);
  };

  const handleActivate = useCallback(() => {
    onSelect(segment.id);
    onSeek(segment.start);
  }, [onSeek, onSelect, segment.id, segment.start]);

  const handleSplit = useCallback(
    (caretRatio: number) => {
      onSplit(segment.id, segment.start + segmentDuration(segment) * caretRatio);
    },
    [onSplit, segment]
  );



  return (
    <div
      role="listitem"
      className={cn("group flex gap-3 px-3 py-2 transition-opacity", isDimmed && "opacity-35")}
    >
      {/* Speaker gutter. The avatar is the picker; the name is the rename
          affordance. Splitting them means the frequent action (reading who is
          speaking) never risks opening a menu by accident. */}
      <div className="flex w-[9.5rem] shrink-0 items-start gap-1.5 pt-0.5">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label={`Change speaker for segment at ${formatTimecode(segment.start)}`}
              className="shrink-0 rounded-full transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-alva-accent"
            >
              <SpeakerAvatar speaker={resolved} size="md" />
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuLabel className="text-[10px] uppercase tracking-wide text-muted-foreground">
              Assign speaker
            </DropdownMenuLabel>

            {speakers.map((option) => (
              <DropdownMenuItem
                key={option.id}
                onSelect={() => onSpeakerChange(segment.id, option.id)}
                className="gap-2 text-xs"
              >
                <SpeakerAvatar speaker={option} size="sm" />
                <span className="min-w-0 flex-1 truncate">{speakerDisplayName(option)}</span>
                {option.id === segment.speakerId ? (
                  <CheckCircle size={14} weight="Bold" className="shrink-0 text-alva-accent" />
                ) : null}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {renamingSpeaker ? (
          <input
            autoFocus
            value={speakerDraft}
            onChange={(event) => setSpeakerDraft(event.target.value)}
            onBlur={commitRename}
            onKeyDown={(event) => {
              event.stopPropagation();
              if (event.key === "Enter") commitRename();
              if (event.key === "Escape") setRenamingSpeaker(false);
            }}
            aria-label="Speaker name"
            className="min-w-0 flex-1 rounded-md bg-alva-surface px-1.5 py-0.5 text-sm text-foreground outline-none focus-visible:ring-1 focus-visible:ring-alva-accent"
          />
        ) : (
          <button
            type="button"
            onDoubleClick={() => {
              setSpeakerDraft(speakerDisplayName(resolved));
              setRenamingSpeaker(true);
            }}
            title="Double-click to rename"
            className="min-w-0 flex-1 truncate rounded-md py-0.5 text-left text-sm text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-alva-accent"
          >
            {speakerDisplayName(resolved)}
          </button>
        )}
      </div>

      {/* Rail. The line is constant — only the aura behind it changes, and it
          hugs the line rather than filling a column. */}
      <button
        type="button"
        onClick={handleActivate}
        aria-label={`Select segment at ${formatTimecode(segment.start)}`}
        aria-pressed={isHighlighted}
        className="flex shrink-0 justify-center rounded-full px-1 py-0.5 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-alva-accent"
        style={{
          backgroundColor: isHighlighted
            ? `color-mix(in srgb, ${resolved.color} 26%, transparent)`
            : "transparent",
        }}
      >
        <span aria-hidden className="h-full w-px rounded-full bg-alva-border" />
      </button>

      {/* Timed text, bracketed by its two timecodes. */}
      <div className="min-w-0 flex-1">
        <button
          type="button"
          onClick={handleActivate}
          aria-label={`Play from ${formatTimecode(segment.start)}`}
          className="rounded text-[11px] tabular-nums text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-alva-accent"
        >
          {formatTimecode(segment.start)}
        </button>

        <div className="py-0.5">
          {isEditing ? (
            <SegmentTextEditor
              autoFocus
              value={segment.text}
              timecode={formatTimecode(segment.start)}
              onChange={(text) => onTextChange(segment.id, text)}
              onSelect={() => onSelect(segment.id)}
              onEndInteraction={() => {
                setEditing(false);
                onEndInteraction();
              }}
              onSplit={handleSplit}
              onMergeWithPrevious={() => {
                if (!isFirst) onMergeWithPrevious(segment.id);
              }}
            />
          ) : (
            <div
              role="button"
              tabIndex={0}
              aria-label={`Edit transcript at ${formatTimecode(segment.start)}`}
              onClick={() => {
                onSelect(segment.id);
                setEditing(true);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  setEditing(true);
                }
              }}
              className="cursor-text rounded focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-alva-accent"
            >
              {isActive ? (
                <ActiveSegmentText segment={segment} />
              ) : (
                <StaticSegmentText segment={segment} />
              )}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => {
            onSelect(segment.id);
            onSeek(segment.end);
          }}
          aria-label={`Play from ${formatTimecode(segment.end)}`}
          className="rounded text-[11px] tabular-nums text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-alva-accent"
        >
          {formatTimecode(segment.end)}
        </button>
      </div>
    </div>
  );
}

/** Keeps the row renderable when a doc references a speaker that no longer exists. */
const FALLBACK_SPEAKER: Speaker = {
  id: "unknown",
  label: "Unassigned",
  role: "participant",
  color: "#A1A1AA",
};

export const TranscriptSegmentRow = memo(TranscriptSegmentRowImpl);
