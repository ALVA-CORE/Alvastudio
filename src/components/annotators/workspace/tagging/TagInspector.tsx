import { memo, useMemo, useState } from "react";
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
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  PANEL_SECTION_LABEL,
  PanelDivider,
} from "@/components/annotators/workspace/PanelPrimitives";
import { ScrollableTabStrip } from "@/components/annotators/workspace/tagging/ScrollableTabStrip";
import { AlvaSelect } from "@/components/shared/AlvaSelect";
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
/** Sentinel for "the selected segments carry different values here". */
const MIXED = "__mixed__";

const REMOVE_BUTTON =
  "shrink-0 rounded-full p-1 text-muted-foreground opacity-0 transition-opacity hover:text-red-400 focus-visible:opacity-100 group-hover:opacity-100";

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
  const spans = useAnnotation(selectSpans);
  const { addSpan } = useAnnotationActions();
  const tokenIndex = useMemo(() => buildTokenIndex(segments), [segments]);

  const ranges = useMemo(
    () =>
      selectedIds
        .map((id) => segmentTokenRange(tokenIndex, id))
        .filter((range): range is { start: number; end: number } => range !== null),
    [selectedIds, tokenIndex]
  );

  /**
   * What each family currently reads for the selection.
   *
   * The select used to hold no value and reset to its placeholder, so applying a
   * tag left the control looking untouched. It now reflects the tag actually on
   * the selection: one value when every selected segment agrees, `MIXED` when
   * they disagree, empty when none carry that family. Re-picking the same value
   * is a no-op, which is correct — it is already applied.
   */
  const appliedByFamily = useMemo(() => {
    const map = new Map<string, string>();

    for (const family of TAG_FAMILIES) {
      const values = ranges.map((range) => {
        const match = spans.find(
          (span) =>
            span.kind === family.kind &&
            span.startToken === range.start &&
            span.endToken === range.end
        );
        return match?.value ?? "";
      });

      if (values.length === 0 || values.every((value) => value === "")) continue;
      map.set(family.kind, values.every((value) => value === values[0]) ? values[0] : MIXED);
    }

    return map;
  }, [ranges, spans]);

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

      {/* One select per family rather than a wall of chips: four taxonomies of
          five to seven values each is thirty-odd buttons, which is a scroll,
          not a choice. The select sits UNDER its label so both get the panel's
          full width — side by side, a narrow panel squeezed the select to the
          point where option text truncated. */}
      {TAG_FAMILIES.map((family) => (
        <div key={family.kind} className="space-y-1">
          <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span
              aria-hidden
              className="size-2 shrink-0 rounded-full"
              style={{ backgroundColor: family.color }}
            />
            {family.label}
          </p>

          <AlvaSelect
            aria-label={`Apply ${family.label} tag`}
            placeholder="Select…"
            options={[
              // Only offered when the selection genuinely disagrees, so it can
              // be displayed without becoming a pickable value in the usual case.
              ...(appliedByFamily.get(family.kind) === MIXED
                ? [{ value: MIXED, label: "Mixed" }]
                : []),
              ...family.options.map((option) => ({
                value: option.value,
                label: option.label,
              })),
            ]}
            value={appliedByFamily.get(family.kind) ?? ""}
            onValueChange={(value) => {
              if (!value || value === MIXED) return;

              for (const range of ranges) {
                addSpan({
                  kind: family.kind,
                  value,
                  startToken: range.start,
                  endToken: range.end,
                  ...(family.kind === "language"
                    ? { spanSource: "annotator_added" as const }
                    : {}),
                });
              }
            }}
            className="w-full text-[11px]"
          />
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

  /** Only categories that actually have something in them get a tab. */
  const groups = useMemo(() => {
    const out = SPAN_FAMILIES.map((family) => ({
      key: family.kind as string,
      kind: family.kind as SpanKind | "non_speech",
      label: family.shortLabel,
      color: family.color,
      spans: byKind.get(family.kind) ?? [],
      count: (byKind.get(family.kind) ?? []).length,
    })).filter((group) => group.count > 0);

    if (nonSpeech.length > 0) {
      out.push({
        key: "non_speech",
        kind: "non_speech" as const,
        label: "Non-speech",
        color: NON_SPEECH_COLOR,
        spans: [],
        count: nonSpeech.length,
      });
    }

    return out;
  }, [byKind, nonSpeech]);

  const [activeGroup, setActiveGroup] = useState<string | null>(null);
  // Falls back to the first group so the tab never points at a category whose
  // last tag was just removed.
  const visibleGroup =
    groups.find((group) => group.key === activeGroup) ?? groups[0] ?? null;

  const isEmpty = groups.length === 0;

  return (
    <div className="space-y-5">
      {/* Clip-level, from asrPayload */}
      <section className="space-y-2">
        <h3 className={PANEL_SECTION_LABEL}>Clip</h3>

        {/* State on the left, action on the right, divided. Previously the
            whole row was the button and "Mark empty" was a passive label, so
            the destructive half of the control was invisible until you hit it. */}
        <div className="flex items-stretch overflow-hidden rounded-xl bg-alva-surface">
          <span
            className={cn(
              "min-w-0 flex-1 truncate px-3 py-2 text-xs",
              speechPresent ? "text-foreground" : "text-amber-300"
            )}
          >
            {speechPresent ? "Speech present" : "No speech in this clip"}
          </span>

          <span aria-hidden className="my-2 w-px shrink-0 bg-alva-border" />

          <button
            type="button"
            aria-pressed={!speechPresent}
            onClick={() => setSpeechPresent(!speechPresent)}
            className="shrink-0 px-3 py-2 text-[11px] text-muted-foreground transition-colors hover:bg-alva-card hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-alva-accent"
          >
            {speechPresent ? "Mark empty" : "Undo"}
          </button>
        </div>

        {/* Multi-select: the schema is explicit that difficulty flags co-occur
            (heavy accent with heavy noise, constantly), so this is never a
            single choice. Nine chips took four rows; a summary row plus a menu
            takes one. */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label="Difficulty flags"
              className="flex w-full items-start justify-between gap-3 border-b border-alva-border/50 py-1.5 text-left text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              <span className="shrink-0">Difficulty</span>
              <span
                className={cn(
                  // Wraps rather than truncating: a hidden flag is a flag the
                  // annotator believes is not set.
                  "min-w-0 text-right leading-snug",
                  difficultyFlags.length > 0 ? "text-amber-300" : "text-foreground"
                )}
              >
                {difficultyFlags.length === 0
                  ? "None"
                  : difficultyFlags
                      .map(
                        (value) =>
                          DIFFICULTY_FLAGS.find((flag) => flag.value === value)?.label ??
                          value
                      )
                      .join(", ")}
              </span>
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-56">
            {DIFFICULTY_FLAGS.map((flag) => (
              <DropdownMenuCheckboxItem
                key={flag.value}
                checked={difficultyFlags.includes(flag.value)}
                // Radix closes on select by default; keeping it open is the
                // point of a multi-select.
                onSelect={(event) => event.preventDefault()}
                onCheckedChange={() => toggleDifficultyFlag(flag.value)}
                className="text-xs"
              >
                {flag.label}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </section>

      <PanelDivider />

      <section className="space-y-2">
        <h3 className={PANEL_SECTION_LABEL}>Apply</h3>
        <TagApplyList selectedIds={selectedIds} />
      </section>

      <PanelDivider />

      {isEmpty ? (
        <p className="py-1 text-xs text-muted-foreground">
          No tags yet. Highlight words in the transcript, or Shift-click clips on
          the timeline and use Apply above.
        </p>
      ) : (
        <section className="space-y-2">
          {/* Categories as a scrollable strip rather than stacked sections.
              Stacked, five groups pushed the last one below the fold on any
              well-tagged clip; as tabs the panel shows one group at full height
              and the strip says at a glance which groups have anything in them. */}
          <ScrollableTabStrip label="Tag categories">
            {groups.map((group) => (
              <button
                key={group.key}
                type="button"
                role="tab"
                aria-selected={activeGroup === group.key}
                onClick={() => setActiveGroup(group.key)}
                className={cn(
                  "inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-alva-accent",
                  activeGroup === group.key
                    ? "bg-alva-surface text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <span
                  aria-hidden
                  className="size-2 shrink-0 rounded-full"
                  style={{ backgroundColor: group.color }}
                />
                {group.label}
                <span className="text-muted-foreground/70">{group.count}</span>
              </button>
            ))}
          </ScrollableTabStrip>

          <ul>
            {visibleGroup?.kind === "non_speech"
              ? nonSpeech.map((mark) => (
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
                      className={REMOVE_BUTTON}
                    >
                      <TrashBinMinimalistic size={13} weight="Outline" />
                    </button>
                  </li>
                ))
              : (visibleGroup?.spans ?? []).map((span) => (
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
                      className={REMOVE_BUTTON}
                    >
                      <TrashBinMinimalistic size={13} weight="Outline" />
                    </button>
                  </li>
                ))}
          </ul>
        </section>
      )}
    </div>
  );
});
