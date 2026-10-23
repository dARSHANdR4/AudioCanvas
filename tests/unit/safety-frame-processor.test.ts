import { describe, expect, it } from 'vitest';
import type { AudioFrame } from '../../apps/web/src/engine/audio/analysis';
import { SafetyFrameProcessor } from '../../apps/web/src/engine/scenes/safety-frame-processor';
import type { SafetySettings } from '../../apps/web/src/engine/scenes/safety-settings-store';

const makeFrame = (options: Partial<Pick<AudioFrame, 'bass' | 'mid' | 'treble' | 'level' | 'beat'>> = {}): AudioFrame => ({
  time: 1,
  bass: options.bass ?? 0,
  mid: options.mid ?? 0,
  treble: options.treble ?? 0,
  level: options.level ?? 0,
  beat: options.beat ?? false,
  spectrum: new Uint8Array(32),
  waveform: new Float32Array(64),
});

const limiterOnly: SafetySettings = { flashLimiter: true, reducedMotion: false };
const reducedOnly: SafetySettings = { flashLimiter: false, reducedMotion: true };

describe('SafetyFrameProcessor', () => {
  it('passes frames through unchanged when both safety options are off', () => {
    const processor = new SafetyFrameProcessor(32, 64);
    const source = makeFrame({ bass: 0.9, beat: true });

    expect(processor.process(source, 1 / 60, { flashLimiter: false, reducedMotion: false })).toBe(source);
  });

  it('limits an abrupt rise in audio energy and spectrum bins', () => {
    const processor = new SafetyFrameProcessor(32, 64);
    const quiet = makeFrame();
    const loud = makeFrame({ bass: 1, mid: 1, treble: 1, level: 1 });
    loud.spectrum.fill(255);

    processor.process(quiet, 1 / 60, limiterOnly);
    const filtered = processor.process(loud, 1 / 60, limiterOnly);

    expect(filtered.bass).toBeGreaterThan(0);
    expect(filtered.bass).toBeLessThan(0.1);
    expect(filtered.level).toBeLessThan(0.1);
    expect(filtered.spectrum[0]).toBeLessThan(20);
    expect(filtered).not.toBe(loud);
    expect(loud.bass).toBe(1);
    expect(loud.spectrum[0]).toBe(255);
  });

  it('limits accepted beat accents to no more than three per second with flash limiter enabled', () => {
    const processor = new SafetyFrameProcessor(32, 64);
    const frame = makeFrame({ bass: 0.5, beat: true });
    let accepted = 0;

    for (let index = 0; index < 20; index += 1) {
      const output = processor.process(frame, 0.1, limiterOnly);
      if (output.beat) accepted += 1;
    }

    expect(accepted).toBeLessThanOrEqual(6);
    expect(accepted).toBeGreaterThan(0);
  });

  it('smooths and attenuates waveform changes in reduced-motion mode', () => {
    const processor = new SafetyFrameProcessor(32, 64);
    const frame = makeFrame();
    frame.waveform.fill(1);

    const output = processor.process(frame, 1 / 60, reducedOnly);
    expect(output.waveform[0]).toBeGreaterThan(0);
    expect(output.waveform[0]).toBeLessThan(0.1);
    expect(output.bass).toBe(0);
  });

  it('adapts buffers when the user changes FFT size without allocating per frame', () => {
    const processor = new SafetyFrameProcessor(32, 64);
    processor.process(makeFrame(), 1 / 60, limiterOnly);

    const smallerFrame: AudioFrame = {
      time: 2,
      bass: 0.4,
      mid: 0.2,
      treble: 0.1,
      level: 0.3,
      beat: false,
      spectrum: new Uint8Array(16).fill(80),
      waveform: new Float32Array(8).fill(0.25),
    };
    const filtered = processor.process(smallerFrame, 1 / 60, limiterOnly);

    expect(filtered.spectrum.length).toBe(16);
    expect(filtered.waveform.length).toBe(8);
  });

  it('reuses its output object and typed buffers across render frames', () => {
    const processor = new SafetyFrameProcessor(32, 64);
    const first = processor.process(makeFrame({ bass: 0.2 }), 1 / 60, limiterOnly);
    const spectrum = first.spectrum;
    const waveform = first.waveform;
    const second = processor.process(makeFrame({ bass: 0.3 }), 1 / 60, limiterOnly);

    expect(second).toBe(first);
    expect(second.spectrum).toBe(spectrum);
    expect(second.waveform).toBe(waveform);
  });
});
