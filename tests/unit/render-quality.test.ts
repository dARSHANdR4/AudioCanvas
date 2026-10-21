import { describe, expect, it } from 'vitest';
import { initialQualityForConcurrency } from '../../apps/web/src/engine/scenes/render-quality';

describe('initial renderer quality', () => {
  it('starts conservatively on low-core devices to keep scene switching responsive', () => {
    expect(initialQualityForConcurrency(2)).toBe('low');
    expect(initialQualityForConcurrency(4)).toBe('low');
  });

  it('uses medium quality on ordinary devices and high quality on stronger devices', () => {
    expect(initialQualityForConcurrency(6)).toBe('medium');
    expect(initialQualityForConcurrency(8)).toBe('medium');
    expect(initialQualityForConcurrency(12)).toBe('high');
  });

  it('falls back to medium when device concurrency is unavailable or invalid', () => {
    expect(initialQualityForConcurrency(undefined)).toBe('medium');
    expect(initialQualityForConcurrency(0)).toBe('medium');
    expect(initialQualityForConcurrency(Number.NaN)).toBe('medium');
  });
});
