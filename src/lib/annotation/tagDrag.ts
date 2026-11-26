import type { DragEvent } from "react";
import { markerText } from "./markers";
import type { SpanKind } from "./tags";

/**
 * A tag dragged from the side panel onto the transcript.
 *
 * The browser hides a drag's data until the drop, but the text has to know
 * the tag's colour while it hovers, so the tag in flight is kept here too.
 */
export type DraggedTag = { kind: SpanKind; value: string; color: string } | { sound: string; color: string };

export const TAG_DRAG = "application/x-alva-tag";

let inFlight: DraggedTag | null = null;

export function startTagDrag(event: DragEvent, tag: DraggedTag) {
  inFlight = tag;
  event.dataTransfer.effectAllowed = "copy";
  event.dataTransfer.setData(TAG_DRAG, JSON.stringify(tag));
  /* A sound also travels as its marker, so dropping it into the edit box
     types `[laugh]` where it lands. A word tag carries no text, so the edit
     box won't take it. */
  if ("sound" in tag) event.dataTransfer.setData("text/plain", markerText(tag.sound));
}

export function endTagDrag() {
  inFlight = null;
}

/** The tag being dragged, or null when none is. */
export function draggedTag(): DraggedTag | null {
  return inFlight;
}
