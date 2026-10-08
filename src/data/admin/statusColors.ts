import type { AnnotationStatus } from "./oversight";

/**
 * One colour per outcome, everywhere on the admin surface.
 *
 * Charts were each picking their own greens and ambers, so "approved" was a
 * different green in the rings than in the sunburst and a reader had to check
 * the legend every time. Fixed here, these become learnable: green is kept,
 * amber is needs work, red is refused, blue is moving, grey is not started.
 *
 * Because they are fixed, charts that use them do not need a legend for the
 * status ring. The colour is the label.
 */
export const ANNOTATION_STATUS_COLORS: Record<AnnotationStatus, string> = {
  draft: "hsl(0 0% 44%)",
  in_progress: "hsl(199 89% 58%)",
  submitted: "hsl(262 72% 68%)",
  approved: "hsl(146 87% 54%)",
  needs_rework: "hsl(38 92% 50%)",
  rejected: "hsl(0 72% 51%)",
};

/**
 * People, not outcomes.
 *
 * Deliberately away from the status hues above, so an annotator's band can
 * never be read as a verdict. These do get a legend, because a name has no
 * natural colour.
 */
export const PERSON_COLORS = [
  "hsl(187 72% 56%)",
  "hsl(43 90% 62%)",
  "hsl(291 60% 68%)",
  "hsl(14 82% 62%)",
  "hsl(160 55% 56%)",
  "hsl(221 72% 68%)",
  "hsl(330 68% 66%)",
  "hsl(72 55% 58%)",
];
