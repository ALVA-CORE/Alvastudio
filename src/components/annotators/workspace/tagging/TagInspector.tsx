import { memo, useMemo } from "react";
import TrashBinMinimalistic from "@solar-icons/react/ui/TrashBinMinimalistic";
import { useAnnotation, useAnnotationActions } from "@/lib/annotation/context";
import { selectNonSpeech, selectSegments, selectSpans } from "@/lib/annotation/store";
import { buildTokenIndex } from "@/lib/annotation/tokens";
import {
  DIFFICULTY_FLAGS,
  NON_SPEECH_COLOR,
  TAG_FAMILIES,
  tagLabel,
  type SpanKind,
} from "@/lib/annotation/tags";
import { cn } from "@/lib/utils";

/**
 * Everything tagged on this clip, grouped by family.
 *
 * The transcript answers "what is tagged here"; this answers "what is tagged at
 * all" — the question you cannot ask by scrolling 400 rows. Clip-level fields
 * from the schema (`difficulty_flags`, `speech_present`) live here too, because
 * they belong to the clip rather than to any one span.
 */

const SECTION_LABEL =
  "text-[10px] font-semibold uppercase tracking-wide text-muted-foreground";

const CHIP =
  "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-alva-accent";

export const TagInspector = memo(function TagInspector() {
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
        <h3 className={SECTION_LABEL}>Clip</h3>

        <button
          type="button"
          aria-pressed={!speechPresent}
          onClick={() => setSpeechPresent(!speechPresent)}
          className={cn(
            "flex w-full items-center justify-between rounded-xl bg-alva-surface px-3 py-2.5 text-left text-xs transition-colors",
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

      {isEmpty ? (
        <p className="rounded-xl bg-alva-surface px-3 py-4 text-center text-xs text-muted-foreground">
          No tags yet. Highlight words in the transcript to tag them.
        </p>
      ) : (
        <>
          {TAG_FAMILIES.map((family) => {
            const list = byKind.get(family.kind) ?? [];
            if (list.length === 0) return null;

            return (
              <section key={family.kind} className="space-y-2">
                <h3 className={cn(SECTION_LABEL, "flex items-center gap-1.5")}>
                  <span
                    aria-hidden
                    className="size-2 rounded-full"
                    style={{ backgroundColor: family.color }}
                  />
                  {family.shortLabel}
                  <span className="text-muted-foreground/60">{list.length}</span>
                </h3>

                <ul className="space-y-1">
                  {[...list]
                    .sort((a, b) => a.startToken - b.startToken)
                    .map((span) => (
                      <li
                        key={span.id}
                        className="group flex items-start gap-2 rounded-xl bg-alva-surface px-2.5 py-2"
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
              <h3 className={cn(SECTION_LABEL, "flex items-center gap-1.5")}>
                <span
                  aria-hidden
                  className="size-2 rounded-full"
                  style={{ backgroundColor: NON_SPEECH_COLOR }}
                />
                Non-speech
                <span className="text-muted-foreground/60">{nonSpeech.length}</span>
              </h3>

              <ul className="space-y-1">
                {nonSpeech.map((mark) => (
                  <li
                    key={mark.id}
                    className="group flex items-center gap-2 rounded-xl bg-alva-surface px-2.5 py-2"
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
