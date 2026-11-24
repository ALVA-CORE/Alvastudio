import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAnnotationActions, useAnnotationStore } from "@/lib/annotation/context";
import { selectNonSpeech, selectSegments } from "@/lib/annotation/store";
import { tagColor } from "@/lib/annotation/tags";
import { extractMarkers, injectMarkers, isMarkerWord, markerText } from "@/lib/annotation/markers";
import { buildTokenIndex, tokenizeText, type Token } from "@/lib/annotation/tokens";
import type { AnnotationSpan, Segment } from "@/lib/annotation/types";
import { alvaToast } from "@/lib/alva-toast";

/**
 * One segment's edit mode.
 *
 * The textarea holds a draft: the text with this segment's marks written in
 * as `[laugh]`, so they stay in view while editing. Every keystroke is read
 * back into clean text and marks, so the store never holds a marker as a
 * word and autosave never sends one. The draft is the textarea's own value,
 * so the caret never jumps.
 */
export function useSegmentDraft(segment: Segment, tokens: Token[], spans: AnnotationSpan[]) {
  const store = useAnnotationStore();
  const { setSegmentText, setSegmentTextAndMarks, setTextSelection } = useAnnotationActions();
  const [isEditing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const draftRef = useRef(draft);
  draftRef.current = draft;

  /* This segment's marks and its first token, read fresh from the store. */
  const ownMarks = useCallback(() => {
    const state = store.getState();
    const index = buildTokenIndex(selectSegments(state));
    const offset = index.offsets.get(segment.id) ?? 0;
    const count = index.counts.get(segment.id) ?? 0;
    const own = selectNonSpeech(state).filter((mark) => mark.atToken >= offset && mark.atToken < offset + count);
    return { offset, own };
  }, [store, segment.id]);

  const drafted = useCallback(
    (text: string) => {
      const { offset, own } = ownMarks();
      return injectMarkers(text, own.map((mark) => ({ type: mark.type, afterWord: mark.atToken - offset })));
    },
    [ownMarks]
  );

  const startEditing = useCallback(() => {
    setDraft(drafted(segment.text));
    setEditing(true);
  }, [drafted, segment.text]);

  const changeDraft = useCallback(
    (raw: string) => {
      setDraft(raw);
      const { text, marks } = extractMarkers(raw);
      const { offset, own } = ownMarks();
      const next = marks.map((mark) => ({ type: mark.type, atToken: offset + mark.afterWord }));
      const same =
        next.length === own.length &&
        next.every((mark, i) => mark.type === own[i].type && mark.atToken === own[i].atToken);
      if (same) setSegmentText(segment.id, text);
      else setSegmentTextAndMarks(segment.id, text, own.map((mark) => mark.id), next);
    },
    [ownMarks, segment.id, setSegmentText, setSegmentTextAndMarks]
  );

  /* An undo while editing changes the text from outside: start again from it. */
  useEffect(() => {
    if (isEditing && extractMarkers(draftRef.current).text !== segment.text) setDraft(drafted(segment.text));
  }, [isEditing, segment.text, drafted]);

  const finishEditing = useCallback(() => {
    setEditing(false);
    const { unknown } = extractMarkers(draftRef.current);
    if (unknown.length) {
      alvaToast.show(`${unknown.join(", ")} isn't a tag yet, so it stays in the text until you remove it.`, {
        variant: "default",
      });
    }
  }, []);

  /* The transcript's words as they sit in the draft, which also holds markers. */
  const draftTokens = useMemo(
    () =>
      tokenizeText(draft)
        .filter((word) => !isMarkerWord(word.text))
        .map((word, i) => ({ ...word, index: (tokens[0]?.index ?? 0) + i })),
    [draft, tokens]
  );

  /* Tag colours as character ranges in the draft, drawn behind the text. */
  const washes = useMemo(
    () =>
      draftTokens.flatMap((token) => {
        const top = spans.filter((span) => span.startToken <= token.index && span.endToken >= token.index).at(-1);
        return top
          ? [{ start: token.charStart, end: token.charEnd, color: `color-mix(in srgb, ${tagColor(top.kind)} 22%, transparent)` }]
          : [];
      }),
    [draftTokens, spans]
  );

  /* Highlighted characters, as the words they touch. */
  const selectText = useCallback(
    (range: { start: number; end: number } | null) => {
      const touched = range
        ? draftTokens.filter((token) => token.charEnd > range.start && token.charStart < range.end)
        : [];
      setTextSelection(touched.length ? { start: touched[0].index, end: touched[touched.length - 1].index } : null);
    },
    [draftTokens, setTextSelection]
  );

  /* A mark picked from the menu while editing goes in after the word, like a typed one. */
  const addMark = useCallback(
    (type: string, atToken: number) => {
      const word = draftTokens.find((token) => token.index === atToken);
      if (!word) return false;
      changeDraft(`${draft.slice(0, word.charEnd)} ${markerText(type)}${draft.slice(word.charEnd)}`);
      return true;
    },
    [draftTokens, draft, changeDraft]
  );

  return { isEditing, draft, startEditing, changeDraft, finishEditing, washes, selectText, addMark };
}
