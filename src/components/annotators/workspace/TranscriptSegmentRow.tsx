import { memo, useCallback, useEffect, useRef, useState } from "react";
import { useAnnotation, useAnnotationActions } from "@/lib/annotation/context";
import { selectNonSpeech } from "@/lib/annotation/store";
import { useSegmentDraft } from "@/components/annotators/workspace/useSegmentDraft";
import { FieldBeam } from "@/components/shared/FieldBeam";
import CheckCircle from "@solar-icons/react/ui/CheckCircle";
import { SegmentTextEditor } from "@/components/annotators/workspace/SegmentTextEditor";
import { SpeakerAvatar } from "@/components/annotators/workspace/SpeakerAvatar";
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
  type AnnotationSpan,
  type Segment,
  type SegmentId,
  type Speaker,
  type SpeakerId,
} from "@/lib/annotation/types";
import { TaggedSegmentText } from "@/components/annotators/workspace/tagging/TaggedSegmentText";
import { TagPicker } from "@/components/annotators/workspace/tagging/TagPicker";
import type { SpanKind } from "@/lib/annotation/tags";
import type { Token } from "@/lib/annotation/tokens";
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
  /** A narration's rows name no speaker, so the gutter goes. */
  hideSpeaker?: boolean;
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
  onSpeakerChange: (id: SegmentId, speakerId: SpeakerId) => void;
  onRenameSpeaker: (speakerId: SpeakerId, name: string) => void;
  onSplit: (id: SegmentId, time: number) => void;
  onMergeWithPrevious: (id: SegmentId) => void;
  onEndInteraction: () => void;
  /* Tagging */
  tokens: Token[];
  spans: AnnotationSpan[];
  onApplyTag: (kind: SpanKind, value: string, range: { start: number; end: number }) => void;
  onRemoveTag: (spanId: string) => void;
  onAddNonSpeech: (type: string, atToken: number) => void;
};

function TranscriptSegmentRowImpl({
  segment,
  speaker,
  speakers,
  hideSpeaker = false,
  isActive,
  isHighlighted,
  isDimmed,
  isFirst,
  onSeek,
  onSelect,
  onSpeakerChange,
  onRenameSpeaker,
  onSplit,
  onMergeWithPrevious,
  onEndInteraction,
  tokens,
  spans,
  onApplyTag,
  onRemoveTag,
  onAddNonSpeech,
}: TranscriptSegmentRowProps) {
  const [renamingSpeaker, setRenamingSpeaker] = useState(false);
  const [speakerDraft, setSpeakerDraft] = useState("");
  const { setTextSelection: setSelection, setTagMenuOpen, removeNonSpeechMark, changeNonSpeechMark } =
    useAnnotationActions();
  const marks = useAnnotation(selectNonSpeech);
  const draft = useSegmentDraft(segment, tokens, spans);

  /**
   * The highlighted words, held in the store so the panel's tag lists and the
   * shortcut apply to them too. Read here only while they fall inside this
   * segment.
   */
  const textSelection = useAnnotation((state) => state.textSelection);
  const first = tokens[0]?.index ?? -1;
  const last = tokens[tokens.length - 1]?.index ?? -1;
  const selection =
    textSelection && textSelection.start >= first && textSelection.end <= last ? textSelection : null;
  const menuOpen = useAnnotation((state) => state.tagMenuOpen) && selection !== null;

  /* A click opens the editor a beat later, so a double-click can select a word instead. */
  const editTimer = useRef(0);
  useEffect(() => () => window.clearTimeout(editTimer.current), []);
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

  /**
   * Clicking an applied tag OPENS it — it does not remove it.
   *
   * Selecting the span's range brings the picker back up with that tag ticked,
   * so changing or removing it is a deliberate second action. Deleting on a
   * single click meant a stray click destroyed work with no confirmation and no
   * visible undo affordance.
   */
  const handleSpanClick = useCallback(
    (spanId: string) => {
      const span = spans.find((entry) => entry.id === spanId);
      if (!span) return;
      setSelection({ start: span.startToken, end: span.endToken });
      setTagMenuOpen(true);
    },
    [spans, setSelection, setTagMenuOpen]
  );

  /**
   * One tag button for both modes, hung under the last highlighted word: in
   * the text when reading, under the highlighted characters when editing.
   * Marked so the text's own pointer and click handlers leave it alone.
   */
  const picker = selection ? (
    <span data-tag-addon onClick={(event) => event.stopPropagation()}>
      <TagPicker
        open={menuOpen}
        onOpenChange={setTagMenuOpen}
        label={selection.start === selection.end ? "Tag word" : `Tag ${selection.end - selection.start + 1} words`}
        applied={spans.filter((span) => span.startToken <= selection.end && span.endToken >= selection.start)}
        onApply={(kind, value) => onApplyTag(kind, value, selection)}
        onRemove={onRemoveTag}
        onAddNonSpeech={(type) => {
          if (!(draft.isEditing && draft.addMark(type, selection.end))) onAddNonSpeech(type, selection.end);
        }}
      />
    </span>
  ) : null;

  /**
   * Editing ends when focus leaves the editor and its tag menu, not when it
   * leaves the textarea: opening the menu moves focus into it.
   */
  const editorRef = useRef<HTMLDivElement>(null);
  const { finishEditing } = draft;
  const leaveEditor = useCallback(() => {
    requestAnimationFrame(() => {
      const active = document.activeElement;
      if (editorRef.current?.contains(active) || active?.closest("[role='menu']")) return;
      setTagMenuOpen(false);
      finishEditing();
      onEndInteraction();
    });
  }, [finishEditing, onEndInteraction, setTagMenuOpen]);

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
      {hideSpeaker ? null : (
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
            <FieldBeam radius={6} className="min-w-0 flex-1 rounded-md">
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
                className="w-full min-w-0 rounded-md bg-alva-surface px-1.5 py-0.5 text-sm text-foreground outline-none"
              />
            </FieldBeam>
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
      )}

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
          {draft.isEditing ? (
            <div ref={editorRef} onBlur={leaveEditor}>
            <SegmentTextEditor
              autoFocus
              value={draft.draft}
              timecode={formatTimecode(segment.start)}
              onChange={draft.changeDraft}
              onSelect={() => onSelect(segment.id)}
              onEndInteraction={onEndInteraction}
              washes={draft.washes}
              onSelectText={draft.selectText}
              selectionAddon={picker}
              onSplit={handleSplit}
              onMergeWithPrevious={() => {
                if (!isFirst) onMergeWithPrevious(segment.id);
              }}
            />
            </div>
          ) : (
            <div
              role="button"
              tabIndex={0}
              aria-label={`Edit transcript at ${formatTimecode(segment.start)}`}
              onClick={(event) => {
                // Highlighting text ends in a click. Without this guard the row
                // swaps to a textarea the moment you finish selecting, which
                // unmounts the tag control before it can be used — the "it
                // flashes and disappears" bug.
                window.clearTimeout(editTimer.current);
                if (event.detail > 1) return;
                editTimer.current = window.setTimeout(() => {
                  const selection = window.getSelection();
                  if (selection && !selection.isCollapsed) return;
                  onSelect(segment.id);
                  draft.startEditing();
                }, 250);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  draft.startEditing();
                }
              }}
              // `min-h` is load-bearing: a freshly inserted segment has no text,
              // so without it this collapses to zero height and there is nothing
              // left to click to get into the editor.
              className="min-h-[1.5rem] cursor-text rounded focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-alva-accent"
            >
              <TaggedSegmentText
                segment={segment}
                tokens={tokens}
                spans={spans}
                marks={marks}
                onMarkChange={(id, type) => (type ? changeNonSpeechMark(id, type) : removeNonSpeechMark(id))}
                isActive={isActive}
                onSelectRange={setSelection}
                onSelectionDone={() => setTagMenuOpen(true)}
                addon={selection && picker ? { at: selection.end, node: picker } : null}
                onSpanClick={handleSpanClick}
              />
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
