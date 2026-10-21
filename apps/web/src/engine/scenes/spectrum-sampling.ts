/** Samples a spectrum at a normalized position (0..1), interpolating between adjacent bins. */
export function sampleSpectrum(spectrum: ArrayLike<number>, position: number): number {
  if (spectrum.length === 0 || !Number.isFinite(position)) return 0;

  const clampedPosition = Math.min(1, Math.max(0, position));
  const scaledIndex = clampedPosition * (spectrum.length - 1);
  const lowerIndex = Math.floor(scaledIndex);
  const upperIndex = Math.min(spectrum.length - 1, lowerIndex + 1);
  const mix = scaledIndex - lowerIndex;
  const lower = spectrum[lowerIndex] ?? 0;
  const upper = spectrum[upperIndex] ?? lower;
  const magnitude = lower + (upper - lower) * mix;

  return Math.min(1, Math.max(0, magnitude / 255));
}
