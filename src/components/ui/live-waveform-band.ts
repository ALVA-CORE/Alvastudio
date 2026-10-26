/**
 * Where a bar sits in the spectrum, as 0 at the centre and 1 at either edge.
 *
 * Static mode is mirrored about the middle. Mapped straight across, the
 * spectrum puts nearly all of a voice's energy in the first few bins and the
 * strip is permanently busy on the left and dead on the right, which reads as
 * a broken meter rather than a quiet one. Reading outward from the centre
 * makes it symmetric, which is what somebody expects of something sitting
 * under a microphone.
 *
 * Its own module so the waveform file keeps exporting only its component,
 * which is what fast refresh needs to swap it without remounting.
 */
export function bandAt(index: number, count: number) {
  const half = Math.max(1, Math.ceil(count / 2));
  return Math.abs(index - (count - 1) / 2) / half;
}
