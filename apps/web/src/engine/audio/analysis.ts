/** Pure, reusable audio-spectrum analysis. Keep frame buffers mutable and out of React state. */
export const FFT_SIZES = [256, 512, 1024, 2048] as const;
export type FftSize = (typeof FFT_SIZES)[number];

export const DEFAULT_AUDIO_ANALYSIS_CONFIG = {
  fftSize: 512 as FftSize,
  attack: 0.6,
  release: 0.15,
  autoGain: true,
  onsetSensitivity: 1.4,
} as const;

const PEAK_WINDOW_FRAMES = 180;
const FLUX_WINDOW_FRAMES = 43;
const MAX_AUTO_GAIN = 4;
const AUTO_GAIN_TARGET = 0.5;
const MIN_BEAT_INTERVAL_SECONDS = 0.12;
const MIN_ONSET_FLUX = 0.006;
const RMS_SCALE = 1 / (255 * 255);

export interface AudioFrame {
  time: number;
  bass: number;
  mid: number;
  treble: number;
  level: number;
  beat: boolean;
  spectrum: Uint8Array<ArrayBuffer>;
  waveform: Float32Array<ArrayBuffer>;
}

export interface AudioAnalysisConfig {
  fftSize?: FftSize;
  attack?: number;
  release?: number;
  autoGain?: boolean;
  onsetSensitivity?: number;
}

export interface AudioAnalysisState {
  readonly sampleRate: number;
  readonly fftSize: FftSize;
  readonly frame: AudioFrame;
  readonly previousSpectrum: Uint8Array<ArrayBuffer>;
  readonly bassPeakWindow: Float32Array<ArrayBuffer>;
  readonly midPeakWindow: Float32Array<ArrayBuffer>;
  readonly treblePeakWindow: Float32Array<ArrayBuffer>;
  readonly fluxWindow: Float32Array<ArrayBuffer>;
  readonly attack: number;
  readonly release: number;
  readonly autoGain: boolean;
  readonly onsetSensitivity: number;
  readonly bassStartBin: number;
  readonly bassEndBin: number;
  readonly midStartBin: number;
  readonly midEndBin: number;
  readonly trebleStartBin: number;
  readonly trebleEndBin: number;
  peakCursor: number;
  peakCount: number;
  fluxCursor: number;
  fluxCount: number;
  frameCount: number;
  smoothedBass: number;
  smoothedMid: number;
  smoothedTreble: number;
  smoothedLevel: number;
  lastBeatTime: number;
}

/** Creates all mutable analysis buffers before processing starts. */
export function createAudioAnalysisState(
  sampleRate: number,
  config: AudioAnalysisConfig = {},
): AudioAnalysisState {
  if (!Number.isFinite(sampleRate) || sampleRate <= 0) {
    throw new RangeError('sampleRate must be a positive finite number.');
  }

  const fftSize = config.fftSize ?? DEFAULT_AUDIO_ANALYSIS_CONFIG.fftSize;
  if (!FFT_SIZES.includes(fftSize)) {
    throw new RangeError('fftSize must be one of 256, 512, 1024, or 2048.');
  }

  const binCount = fftSize / 2;
  const binWidth = sampleRate / fftSize;
  const bin = (frequency: number): number => Math.min(binCount, Math.max(1, Math.ceil(frequency / binWidth)));
  const endBin = (frequency: number): number => Math.min(binCount, Math.floor(frequency / binWidth) + 1);
  const clampCoefficient = (value: number | undefined, fallback: number): number => {
    if (value === undefined || !Number.isFinite(value)) return fallback;
    return Math.min(1, Math.max(0, value));
  };

  return {
    sampleRate,
    fftSize,
    frame: {
      time: 0,
      bass: 0,
      mid: 0,
      treble: 0,
      level: 0,
      beat: false,
      spectrum: new Uint8Array(binCount),
      waveform: new Float32Array(fftSize),
    },
    previousSpectrum: new Uint8Array(binCount),
    bassPeakWindow: new Float32Array(PEAK_WINDOW_FRAMES),
    midPeakWindow: new Float32Array(PEAK_WINDOW_FRAMES),
    treblePeakWindow: new Float32Array(PEAK_WINDOW_FRAMES),
    fluxWindow: new Float32Array(FLUX_WINDOW_FRAMES),
    attack: clampCoefficient(config.attack, DEFAULT_AUDIO_ANALYSIS_CONFIG.attack),
    release: clampCoefficient(config.release, DEFAULT_AUDIO_ANALYSIS_CONFIG.release),
    autoGain: config.autoGain ?? DEFAULT_AUDIO_ANALYSIS_CONFIG.autoGain,
    onsetSensitivity:
      Number.isFinite(config.onsetSensitivity) && (config.onsetSensitivity ?? 0) > 0
        ? (config.onsetSensitivity as number)
        : DEFAULT_AUDIO_ANALYSIS_CONFIG.onsetSensitivity,
    bassStartBin: bin(20),
    bassEndBin: endBin(250),
    midStartBin: bin(250),
    midEndBin: endBin(4000),
    trebleStartBin: bin(4000),
    trebleEndBin: endBin(20000),
    peakCursor: 0,
    peakCount: 0,
    fluxCursor: 0,
    fluxCount: 0,
    frameCount: 0,
    smoothedBass: 0,
    smoothedMid: 0,
    smoothedTreble: 0,
    smoothedLevel: 0,
    lastBeatTime: Number.NEGATIVE_INFINITY,
  };
}

function bandRms(spectrum: Uint8Array, startBin: number, endBin: number): number {
  const start = Math.min(startBin, spectrum.length);
  const end = Math.min(Math.max(start, endBin), spectrum.length);
  const count = end - start;
  if (count <= 0) return 0;

  let sumSquares = 0;
  for (let index = start; index < end; index += 1) {
    const value = spectrum[index] ?? 0;
    sumSquares += value * value;
  }
  return Math.sqrt((sumSquares / count) * RMS_SCALE);
}

function rmsLevel(samples: Float32Array): number {
  if (samples.length === 0) return 0;
  let sumSquares = 0;
  for (let index = 0; index < samples.length; index += 1) {
    const value = samples[index] ?? 0;
    sumSquares += value * value;
  }
  return Math.min(1, Math.sqrt(sumSquares / samples.length));
}

function rollingPeak(window: Float32Array, count: number): number {
  let peak = 0;
  for (let index = 0; index < count; index += 1) {
    const value = window[index] ?? 0;
    if (value > peak) peak = value;
  }
  return peak;
}

function smooth(previous: number, target: number, attack: number, release: number): number {
  const coefficient = target > previous ? attack : release;
  return previous + (target - previous) * coefficient;
}

function normalizeBand(target: number, peak: number, autoGain: boolean): number {
  if (!autoGain || peak <= 0.001) return Math.min(1, Math.max(0, target));
  const gain = Math.min(MAX_AUTO_GAIN, Math.max(0.5, AUTO_GAIN_TARGET / peak));
  return Math.min(1, Math.max(0, target * gain));
}

function spectralFlux(state: AudioAnalysisState): number {
  const spectrum = state.frame.spectrum;
  const previous = state.previousSpectrum;
  const start = Math.min(state.bassStartBin, spectrum.length);
  const end = Math.min(state.midEndBin, spectrum.length);
  const count = end - start;
  if (count <= 0) return 0;

  let positiveDifference = 0;
  for (let index = start; index < end; index += 1) {
    const difference = (spectrum[index] ?? 0) - (previous[index] ?? 0);
    if (difference > 0) positiveDifference += difference / 255;
  }
  return positiveDifference / count;
}

/**
 * Updates one reusable AudioFrame from the spectrum already written into state.frame.spectrum.
 * The same function can consume live AnalyserNode spectra or offline spectra without changing
 * band extraction, smoothing, auto-gain, or onset behavior.
 */
export function updateAudioAnalysis(
  state: AudioAnalysisState,
  timeDomain: Float32Array,
  timeSeconds: number,
): AudioFrame {
  const spectrum = state.frame.spectrum;
  state.frame.waveform.fill(0);
  state.frame.waveform.set(timeDomain.subarray(0, state.frame.waveform.length));
  const rawBass = bandRms(spectrum, state.bassStartBin, state.bassEndBin);
  const rawMid = bandRms(spectrum, state.midStartBin, state.midEndBin);
  const rawTreble = bandRms(spectrum, state.trebleStartBin, state.trebleEndBin);

  state.bassPeakWindow[state.peakCursor] = rawBass;
  state.midPeakWindow[state.peakCursor] = rawMid;
  state.treblePeakWindow[state.peakCursor] = rawTreble;
  state.peakCursor = (state.peakCursor + 1) % state.bassPeakWindow.length;
  state.peakCount = Math.min(state.peakCount + 1, state.bassPeakWindow.length);

  const bass = normalizeBand(rawBass, rollingPeak(state.bassPeakWindow, state.peakCount), state.autoGain);
  const mid = normalizeBand(rawMid, rollingPeak(state.midPeakWindow, state.peakCount), state.autoGain);
  const treble = normalizeBand(rawTreble, rollingPeak(state.treblePeakWindow, state.peakCount), state.autoGain);

  state.smoothedBass = smooth(state.smoothedBass, bass, state.attack, state.release);
  state.smoothedMid = smooth(state.smoothedMid, mid, state.attack, state.release);
  state.smoothedTreble = smooth(state.smoothedTreble, treble, state.attack, state.release);
  state.smoothedLevel = smooth(state.smoothedLevel, rmsLevel(timeDomain), state.attack, state.release);

  const flux = spectralFlux(state);
  let fluxAverage = 0;
  for (let index = 0; index < state.fluxCount; index += 1) {
    fluxAverage += state.fluxWindow[index] ?? 0;
  }
  if (state.fluxCount > 0) fluxAverage /= state.fluxCount;

  const threshold = Math.max(MIN_ONSET_FLUX, fluxAverage * state.onsetSensitivity);
  const beat = state.frameCount >= 8 && flux > threshold && timeSeconds - state.lastBeatTime >= MIN_BEAT_INTERVAL_SECONDS;
  if (beat) state.lastBeatTime = timeSeconds;

  state.fluxWindow[state.fluxCursor] = flux;
  state.fluxCursor = (state.fluxCursor + 1) % state.fluxWindow.length;
  state.fluxCount = Math.min(state.fluxCount + 1, state.fluxWindow.length);
  state.previousSpectrum.set(spectrum);
  state.frameCount += 1;

  state.frame.time = Math.max(0, timeSeconds);
  state.frame.bass = state.smoothedBass;
  state.frame.mid = state.smoothedMid;
  state.frame.treble = state.smoothedTreble;
  state.frame.level = state.smoothedLevel;
  state.frame.beat = beat;
  return state.frame;
}

/** Clears smoothing/onset history while retaining all allocated buffers. */
export function resetAudioAnalysis(state: AudioAnalysisState): void {
  state.frame.spectrum.fill(0);
  state.frame.waveform.fill(0);
  state.previousSpectrum.fill(0);
  state.bassPeakWindow.fill(0);
  state.midPeakWindow.fill(0);
  state.treblePeakWindow.fill(0);
  state.fluxWindow.fill(0);
  state.peakCursor = 0;
  state.peakCount = 0;
  state.fluxCursor = 0;
  state.fluxCount = 0;
  state.frameCount = 0;
  state.smoothedBass = 0;
  state.smoothedMid = 0;
  state.smoothedTreble = 0;
  state.smoothedLevel = 0;
  state.lastBeatTime = Number.NEGATIVE_INFINITY;
  state.frame.time = 0;
  state.frame.bass = 0;
  state.frame.mid = 0;
  state.frame.treble = 0;
  state.frame.level = 0;
  state.frame.beat = false;
}
