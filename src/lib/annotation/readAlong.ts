/**
 * The word under the playhead.
 *
 * Words carry their own times (24 Nov), but not all of them: a word edited
 * before then was saved with none, and a typed one waits for alignment. So
 * each word gets a start: its own where it has one, and where it doesn't, a
 * share of the gap between the timed words either side (or the segment's
 * edges). The lit word is the last one that has started, so it only ever
 * moves forward and holds through pauses.
 */
export function wordStarts(
  times: ({ start: number } | null)[] | undefined,
  count: number,
  segmentStart: number,
  segmentEnd: number
): number[] {
  const known = times && times.length === count ? times : [];
  const starts: number[] = [];
  let i = 0;
  while (i < count) {
    const own = known[i];
    if (own) {
      starts.push(own.start);
      i += 1;
      continue;
    }
    /* A run of untimed words, spread between what is known around it. */
    let j = i;
    while (j < count && !known[j]) j += 1;
    const from = i === 0 ? segmentStart : starts[i - 1];
    const to = j < count ? known[j]!.start : segmentEnd;
    const step = (to - from) / (j - i + (i === 0 ? 0 : 1));
    for (let k = i; k < j; k += 1) starts.push(from + step * (k - i + (i === 0 ? 0 : 1)));
    i = j;
  }
  return starts;
}

/** The index of the last word that has started by `now`, or -1 before the first. */
export function activeWord(starts: number[], now: number): number {
  let lit = -1;
  for (let i = 0; i < starts.length && starts[i] <= now; i += 1) lit = i;
  return lit;
}
