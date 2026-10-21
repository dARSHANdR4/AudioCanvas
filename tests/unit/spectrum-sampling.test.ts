import { describe, expect, it } from 'vitest';
import { sampleSpectrum } from '../../apps/web/src/engine/scenes/spectrum-sampling';

describe('sampleSpectrum', () => {
  it('normalizes a byte spectrum to a 0..1 magnitude', () => {
    expect(sampleSpectrum(new Uint8Array([0, 127, 255]), 0)).toBe(0);
    expect(sampleSpectrum(new Uint8Array([0, 127, 255]), 1)).toBe(1);
  });

  it('interpolates between neighboring FFT bins', () => {
    expect(sampleSpectrum(new Uint8Array([0, 255]), 0.5)).toBe(0.5);
  });

  it('returns zero for an empty spectrum or a non-finite position', () => {
    expect(sampleSpectrum(new Uint8Array(), 0.5)).toBe(0);
    expect(sampleSpectrum(new Uint8Array([255]), Number.NaN)).toBe(0);
  });

  it('clamps positions outside the normalized range', () => {
    expect(sampleSpectrum(new Uint8Array([32, 255]), -1)).toBeCloseTo(32 / 255);
    expect(sampleSpectrum(new Uint8Array([32, 255]), 2)).toBe(1);
  });
});
