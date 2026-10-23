import type { AudioFrame } from '../audio/analysis';
import type { SafetySettings } from './safety-settings-store';

const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));

function moveToward(current: number, target: number, maxDelta: number): number {
  if (target > current) return Math.min(target, current + maxDelta);
  return Math.max(target, current - maxDelta);
}

/**
 * Reusable visual-safety filter. It does not mutate the source audio frame or allocate buffers
 * per render tick. The limiter smooths abrupt audio-driven energy changes and rate-limits beats;
 * Reduced Motion additionally smooths spectrum/waveform response. It is a risk-reduction measure,
 * not a certification that arbitrary content meets every photosensitivity criterion.
 */
export class SafetyFrameProcessor {
  private readonly output: AudioFrame;
  private elapsed = 0;
  private lastAcceptedBeat = Number.NEGATIVE_INFINITY;
  private wasActive = false;

  constructor(spectrumLength = 1024, waveformLength = 2048) {
    this.output = {
      time: 0,
      bass: 0,
      mid: 0,
      treble: 0,
      level: 0,
      beat: false,
      spectrum: new Uint8Array(spectrumLength),
      waveform: new Float32Array(waveformLength),
    };
  }

  process(source: AudioFrame, dt: number, safety: SafetySettings): AudioFrame {
    const limiterEnabled = safety.flashLimiter;
    const reducedMotionEnabled = safety.reducedMotion;
    if (!limiterEnabled && !reducedMotionEnabled) {
      this.wasActive = false;
      return source;
    }

    const safeDt = Math.max(0, Math.min(Number.isFinite(dt) ? dt : 0, 0.1));
    this.elapsed += safeDt;
    if (!this.wasActive) {
      this.output.bass = 0;
      this.output.mid = 0;
      this.output.treble = 0;
      this.output.level = 0;
      this.output.beat = false;
      this.output.spectrum.fill(0);
      this.output.waveform.fill(0);
      this.lastAcceptedBeat = this.elapsed;
      this.wasActive = true;
    }

    const attackRate = limiterEnabled ? 2.4 : Number.POSITIVE_INFINITY;
    const releaseRate = limiterEnabled ? 4.2 : Number.POSITIVE_INFINITY;
    const smoothingAlpha = reducedMotionEnabled
      ? 1 - Math.exp(-safeDt / 0.24)
      : 1;

    this.output.time = source.time;
    this.output.bass = this.filterBand(source.bass, this.output.bass, safeDt, attackRate, releaseRate, smoothingAlpha);
    this.output.mid = this.filterBand(source.mid, this.output.mid, safeDt, attackRate, releaseRate, smoothingAlpha);
    this.output.treble = this.filterBand(source.treble, this.output.treble, safeDt, attackRate, releaseRate, smoothingAlpha);
    this.output.level = this.filterBand(source.level, this.output.level, safeDt, attackRate, releaseRate, smoothingAlpha);

    const beatInterval = reducedMotionEnabled ? 0.55 : limiterEnabled ? 1 / 3 : 0;
    const canAcceptBeat = this.elapsed - this.lastAcceptedBeat >= beatInterval;
    this.output.beat = source.beat && canAcceptBeat;
    if (this.output.beat) this.lastAcceptedBeat = this.elapsed;

    const sourceSpectrum = source.spectrum;
    const targetSpectrum = this.output.spectrum;
    const maxSpectrumDelta = limiterEnabled ? safeDt * 620 : Number.POSITIVE_INFINITY;
    for (let index = 0; index < targetSpectrum.length; index += 1) {
      const current = targetSpectrum[index] ?? 0;
      const sourceValue = sourceSpectrum[index] ?? 0;
      let filtered = limiterEnabled
        ? moveToward(current, sourceValue, maxSpectrumDelta)
        : sourceValue;
      if (reducedMotionEnabled) filtered = current + (filtered - current) * smoothingAlpha;
      targetSpectrum[index] = Math.round(Math.max(0, Math.min(255, filtered)));
    }

    const waveformGain = (limiterEnabled ? 0.78 : 1) * (reducedMotionEnabled ? 0.6 : 1);
    const sourceWaveform = source.waveform;
    const targetWaveform = this.output.waveform;
    for (let index = 0; index < targetWaveform.length; index += 1) {
      const current = targetWaveform[index] ?? 0;
      const sourceValue = (sourceWaveform[index] ?? 0) * waveformGain;
      targetWaveform[index] = reducedMotionEnabled
        ? current + (sourceValue - current) * smoothingAlpha
        : sourceValue;
    }

    return this.output;
  }

  private filterBand(
    sourceValue: number,
    current: number,
    dt: number,
    attackRate: number,
    releaseRate: number,
    smoothingAlpha: number,
  ): number {
    const target = clamp01(Number.isFinite(sourceValue) ? sourceValue : 0);
    const rate = target >= current ? attackRate : releaseRate;
    let filtered = Number.isFinite(rate)
      ? moveToward(current, target, dt * rate)
      : target;
    if (smoothingAlpha < 1) filtered = current + (filtered - current) * smoothingAlpha;
    return clamp01(filtered);
  }
}
