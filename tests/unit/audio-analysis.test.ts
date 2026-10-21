import { describe, expect, it } from 'vitest';
import {
  createAudioAnalysisState,
  resetAudioAnalysis,
  updateAudioAnalysis,
} from '../../apps/web/src/engine/audio/analysis';

describe('M1 audio analysis', () => {
  it('TC-04: a 440 Hz tone reacts in Mid, not Bass or Treble', () => {
    const state = createAudioAnalysisState(44_100, { fftSize: 512, autoGain: true });
    const timeDomain = new Float32Array(512);

    for (let frameIndex = 0; frameIndex < 20; frameIndex += 1) {
      state.frame.spectrum.fill(0);
      // FFT bin 5 is centred near 431 Hz at 44.1 kHz / 512.
      state.frame.spectrum[5] = 200;
      updateAudioAnalysis(state, timeDomain, frameIndex / 60);
    }

    expect(state.frame.mid).toBeGreaterThan(0.05);
    expect(state.frame.bass).toBeLessThan(0.005);
    expect(state.frame.treble).toBeLessThan(0.005);
  });

  it('TC-05: onset detection emits beat flags near 500 ms for a 120 BPM kick loop', () => {
    const state = createAudioAnalysisState(44_100, { fftSize: 512, autoGain: false });
    const timeDomain = new Float32Array(512);
    const beatTimes: number[] = [];

    for (let frameIndex = 0; frameIndex < 150; frameIndex += 1) {
      state.frame.spectrum.fill(0);
      if (frameIndex % 30 === 0) state.frame.spectrum[2] = 255;
      const frame = updateAudioAnalysis(state, timeDomain, frameIndex / 60);
      if (frame.beat) beatTimes.push(frame.time);
    }

    expect(beatTimes.length).toBeGreaterThanOrEqual(4);
    for (let index = 1; index < beatTimes.length; index += 1) {
      expect(beatTimes[index]! - beatTimes[index - 1]!).toBeCloseTo(0.5, 1);
    }
  });

  it('reuses the same frame and spectrum buffers on every update', () => {
    const state = createAudioAnalysisState(44_100);
    const timeDomain = new Float32Array(512);
    const originalFrame = state.frame;
    const originalSpectrum = state.frame.spectrum;

    for (let index = 0; index < 30; index += 1) {
      state.frame.spectrum.fill(index % 2 === 0 ? 12 : 24);
      expect(updateAudioAnalysis(state, timeDomain, index / 60)).toBe(originalFrame);
      expect(state.frame.spectrum).toBe(originalSpectrum);
    }
  });

  it('keeps all normalized outputs finite and in range', () => {
    const state = createAudioAnalysisState(48_000, { fftSize: 2048 });
    const timeDomain = new Float32Array(2048);
    state.frame.spectrum.fill(255);
    const frame = updateAudioAnalysis(state, timeDomain, 0.25);

    for (const value of [frame.bass, frame.mid, frame.treble, frame.level]) {
      expect(Number.isFinite(value)).toBe(true);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(1);
    }
  });

  it('resets analysis history without replacing typed arrays', () => {
    const state = createAudioAnalysisState(44_100);
    const spectrum = state.frame.spectrum;
    state.frame.spectrum[5] = 220;
    updateAudioAnalysis(state, new Float32Array(512), 0.25);

    resetAudioAnalysis(state);

    expect(state.frame.spectrum).toBe(spectrum);
    expect(state.frame.beat).toBe(false);
    expect(state.frame.mid).toBe(0);
    expect(state.frame.spectrum.every((value) => value === 0)).toBe(true);
  });
});

  it('captures time-domain samples for waveform scenes without replacing the shared typed buffer', () => {
    const state = createAudioAnalysisState(44_100, { fftSize: 512 });
    const samples = new Float32Array(512);
    samples[0] = -0.75;
    samples[255] = 0.5;
    const originalWaveform = state.frame.waveform;

    const frame = updateAudioAnalysis(state, samples, 0.1);

    expect(frame.waveform).toBe(originalWaveform);
    expect(frame.waveform[0]).toBeCloseTo(-0.75);
    expect(frame.waveform[255]).toBeCloseTo(0.5);
    resetAudioAnalysis(state);
    expect(frame.waveform.every((sample) => sample === 0)).toBe(true);
  });
