import { describe, expect, it } from 'vitest';
import { updateBeatEnvelope, visualEnergy } from '../../apps/web/src/engine/scenes/visual-response';

describe('visual response shaping', () => {
  it('amplifies quiet normalized band energy into a visible response', () => {
    expect(visualEnergy(0.05)).toBeGreaterThan(0.05);
    expect(visualEnergy(0.2)).toBeGreaterThan(0.2);
    expect(visualEnergy(0)).toBe(0);
  });

  it('clamps inputs and output to a finite 0..1 range', () => {
    expect(visualEnergy(-1)).toBe(0);
    expect(visualEnergy(4)).toBe(1);
    expect(visualEnergy(Number.NaN)).toBe(0);
  });

  it('starts a beat impulse immediately and decays smoothly without another beat', () => {
    expect(updateBeatEnvelope(0, true, 1 / 60)).toBe(1);
    expect(updateBeatEnvelope(1, false, 1 / 60)).toBeCloseTo(0.94);
    expect(updateBeatEnvelope(0.1, false, 1 / 60)).toBeCloseTo(0.04);
  });
});
