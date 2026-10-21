/** Shape quiet normalized band values for clear visual motion without altering measured audio data. */
export function visualEnergy(value: number, gain = 1.65, curve = 0.72): number {
  if (!Number.isFinite(value) || !Number.isFinite(gain) || !Number.isFinite(curve)) return 0;
  const normalized = Math.min(1, Math.max(0, value));
  const safeCurve = Math.min(2, Math.max(0.1, curve));
  const safeGain = Math.min(4, Math.max(0, gain));
  return Math.min(1, Math.pow(normalized, safeCurve) * safeGain);
}

/** A quick, deterministic beat envelope which falls smoothly between detected onsets. */
export function updateBeatEnvelope(current: number, beat: boolean, dt: number, decay = 3.6): number {
  const safeDt = Number.isFinite(dt) ? Math.max(0, Math.min(0.1, dt)) : 0;
  const safeDecay = Number.isFinite(decay) ? Math.max(0, decay) : 3.6;
  return beat ? 1 : Math.max(0, current - safeDt * safeDecay);
}
