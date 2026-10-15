/**
 * What a cell shows when there is nothing to show.
 *
 * It used to be an em dash. The pass that took em dashes out of our copy
 * replaced it with a comma everywhere it appeared, so tables started rendering
 * a lone "," in empty cells and detail panels showed a comma where a value
 * should be. That rule was about prose, and an empty-cell marker is not prose.
 *
 * One constant so the next change is one edit rather than a hundred and
 * fifty.
 */
export const NO_VALUE = "–";
