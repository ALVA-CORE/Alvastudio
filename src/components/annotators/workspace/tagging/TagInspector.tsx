import { memo, useMemo } from "react";
import TrashBinMinimalistic from "@solar-icons/react/ui/TrashBinMinimalistic";
import { useAnnotation, useAnnotationActions } from "@/lib/annotation/context";
import { selectNonSpeech, selectSegments, selectSpans } from "@/lib/annotation/store";
import { buildTokenIndex, segmentTokenRange } from "@/lib/annotation/tokens";
import {
  DIFFICULTY_FLAGS,
  NON_SPEECH_COLOR,
  SPAN_FAMILIES,
  TAG_FAMILIES,
  tagLabel,
  type SpanKind,
} from "@/lib/annotation/tags";
import {
  PANEL_SECTION_LABEL,
  PanelDivider,
} from "@/components/annotators/workspace/PanelPrimitives";
import { cn } from "@/lib/utils";

/**
 * Everything tagged on this clip, grouped by family.
 *
 * The transcript answers "what is tagged here"; this answers "what is tagged at
 * all" — the question you cannot ask by scrolling 400 rows. Clip-level fields
 * from the schema (`difficulty_flags`, `speech_present`) live here too, because
 * they belong to the clip rather than to any one span.
 */

/** Same grammar as the Details tab's section headings — one panel, one voice. */
const CHIP =
  "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-alva-accent";

/**
 * Tag families as a pick-list, applied to whatever is selected on the timeline.
 *
 * This is the batch path: Shift-click a run of clips, then choose a tag once.
 * The transcript's own picker stays the precise path — a sub-phrase inside one
 * segment — and this one covers each selected segment's FULL token range, which
 * is the only span a clip selection can honestly describe.
 */
const TagApplyList = memo(function TagApplyList({
  selectedIds,
}: {
  selectedIds: string[];
}) {
  const segments = useAnnotation(selectSegments);
  const { addSpan } = useAnnotationActions();
  const tokenIndex = useMemo(() => buildTokenIndex(segments), [segments]);

  const ranges = useMemo(
    () =>
      selectedIds
        .map((id) => segmentTokenRange(tokenIndex, id))
        .filter((range): range is { start: number; end: number } => range !== null),
    [selectedIds, tokenIndex]
  );

  if (selectedIds.length === 0) {
    return (
      <p className="py-1 text-[11px] leading-relaxed text-muted-foreground">
        Shift-click clips on the timeline to tag several at once.
      </p>
    );
  }

  if (ranges.length === 0) {
    return (
      <p className="py-1 text-[11px] text-muted-foreground">
        {selectedIds.length === 1 ? "That segment has" : "Those segments have"} no
        text to tag yet.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-[11px] text-muted-foreground">
        Applying to{" "}
        <span className="text-foreground">
          {ranges.length} segment{ranges.length === 1 ? "" : "s"}
        </span>
      </p>

      {TAG_FAMILIES.map((family) => (
        <div key={family.kind} className="space-y-1">
          <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-muted-foreground">
            <span
              aria-hidden
              className="size-2 rounded-full"
              style={{ backgroundColor: family.color }}
            />
            {family.label}
          </p>

          <div className="flex flex-wrap gap-1">
            {family.options.map((option) => (
              <button
                key={option.value}
                type="button"
                title={option.hint}
                onClick={() => {
                  for (const range of ranges) {
                    addSpan({
                      kind: family.kind,
                      value: option.value,
                      startToken: range.start,
                      endToken: range.end,
                      ...(family.kind === "language"
                        ? { spanSource: "annotator_added" as const }
                        : {}),
                    });
                  }
                }}
                className={cn(CHIP, "bg-alva-surface text-muted-foreground hover:text-foreground")}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
});

export const TagInspector = memo(function TagInspector() {
  const selectedIds = useAnnotation((state) => state.selectedSegmentIds);
  const segments = useAnnotation(selectSegments);
  const spans = useAnnotation(selectSpans);
  const nonSpeech = useAnnotation(selectNonSpeech);
  const difficultyFlags = useAnnotation((state) => state.history.present.difficultyFlags);
  const speechPresent = useAnnotation((state) => state.history.present.speechPresent);

  const { removeSpan, removeNonSpeechMark, toggleDifficultyFlag, setSpeechPresent } =
    useAnnotationActions();

  const tokenIndex = useMemo(() => buildTokenIndex(segments), [segments]);

  /** The tagged words themselves — a list of token indices is unreadable. */
  const surfaceOf = useMemo(
    () => (start: number, end: number) =>
      tokenIndex.tokens
        .slice(start, end + 1)
        .map((token) => token.text)
        .join(" "),
    [tokenIndex]
  );

  const byKind = useMemo(() => {
    const map = new Map<SpanKind, typeof spans>();
    for (const span of spans) {
      const list = map.get(span.kind);
      if (list) list.push(span);
      else map.set(span.kind, [span]);
    }
    return map;
  }, [spans]);

  const isEmpty = spans.length === 0 && nonSpeech.length === 0;

  return (
    <div className="space-y-5">
      {/* Clip-level, from asrPayload */}
      <section className="space-y-2">
        <h3 className={PANEL_SECTION_LABEL}>Clip</h3>

        <button
          type="button"
          aria-pressed={!speechPresent}
          onClick={() => setSpeechPresent(!speechPresent)}
          className={cn(
            "flex w-full items-baseline justify-between gap-3 border-b border-alva-border/50 py-1.5 text-left text-xs transition-colors",
            !speechPresent && "text-amber-300"
          )}
        >
          <span>{speechPresent ? "Speech present" : "No speech in this clip"}</span>
          <span className="text-[10px] text-muted-foreground">
            {speechPresent ? "Mark empty" : "Undo"}
          </span>
        </button>

        <div className="flex flex-wrap gap-1">
          {DIFFICULTY_FLAGS.map((flag) => {
            const on = difficultyFlags.includes(flag.value);
            return (
              <button
                key={flag.value}
                type="button"
                aria-pressed={on}
                onClick={() => toggleDifficultyFlag(flag.value)}
                className={cn(
                  CHIP,
                  on
                    ? "bg-amber-500/15 text-amber-300"
                    : "bg-alva-surface text-muted-foreground hover:text-foreground"
                )}
              >
                {flag.label}
              </button>
            );
          })}
        </div>
      </section>

      <PanelDivider />

      <section className="space-y-2">
        <h3 className={PANEL_SECTION_LABEL}>Apply</h3>
        <TagApplyList selectedIds={selectedIds} />
      </section>

      <PanelDivider />

      {isEmpty ? (
        <p className="py-1 text-xs text-muted-foreground">
          No tags yet. Highlight words in the transcript to tag them.
        </p>
      ) : (
        <>
          {SPAN_FAMILIES.map((family) => {
            const list = byKind.get(family.kind) ?? [];
            if (list.length === 0) return null;

            return (
              <section key={family.kind} className="space-y-2">
                <h3 className={PANEL_SECTION_LABEL}>
                  <span
                    aria-hidden
                    className="size-2 rounded-full"
                    style={{ backgroundColor: family.color }}
                  />
                  {family.shortLabel}
                  <span className="text-muted-foreground/60">{list.length}</span>
                </h3>

                <ul>
                  {[...list]
                    .sort((a, b) => a.startToken - b.startToken)
                    .map((span) => (
                      <li
                        key={span.id}
                        className="group flex items-start gap-2 border-b border-alva-border/50 py-1.5 last:border-0"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs text-foreground">
                            {surfaceOf(span.startToken, span.endToken) || "—"}
                          </p>
                          <p className="truncate text-[10px] text-muted-foreground">
                            {tagLabel(span.kind, span.value)}
                            {span.spanSource === "lexicon_derived" && " · from lexicon"}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => removeSpan(span.id)}
                          aria-label={`Remove ${tagLabel(span.kind, span.value)} tag`}
                          className="shrink-0 rounded-full p-1 text-muted-foreground opacity-0 transition-opacity hover:text-red-400 focus-visible:opacity-100 group-hover:opacity-100"
                        >
                          <TrashBinMinimalistic size={13} weight="Outline" />
                        </button>
                      </li>
                    ))}
                </ul>
              </section>
            );
          })}

          {nonSpeech.length > 0 && (
            <section className="space-y-2">
              <h3 className={PANEL_SECTION_LABEL}>
                <span
                  aria-hidden
                  className="size-2 rounded-full"
                  style={{ backgroundColor: NON_SPEECH_COLOR }}
                />
                Non-speech
                <span className="text-muted-foreground/60">{nonSpeech.length}</span>
              </h3>

              <ul>
                {nonSpeech.map((mark) => (
                  <li
                    key={mark.id}
                    className="group flex items-center gap-2 border-b border-alva-border/50 py-1.5 last:border-0"
                  >
                    <span className="min-w-0 flex-1 truncate text-xs text-foreground">
                      {mark.type.replace(/_/g, " ")}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeNonSpeechMark(mark.id)}
                      aria-label={`Remove ${mark.type} marker`}
                      className="shrink-0 rounded-full p-1 text-muted-foreground opacity-0 transition-opacity hover:text-red-400 focus-visible:opacity-100 group-hover:opacity-100"
                    >
                      <TrashBinMinimalistic size={13} weight="Outline" />
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
});
