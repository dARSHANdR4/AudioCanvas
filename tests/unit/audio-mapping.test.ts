import { describe, expect, it } from 'vitest';
import { evaluateAudioMappings, readMappingSource, type AudioMapping } from '../../apps/web/src/engine/mapping/mapping-engine';
import type { AudioFrame } from '../../apps/web/src/engine/audio/analysis';
import type { SceneParamDescriptor } from '../../apps/web/src/engine/scenes/scene';

const schema: readonly SceneParamDescriptor[] = [
  { key: 'meshScale', label: 'Mesh scale', min: 0, max: 2, defaultValue: 1 },
  { key: 'rotationSpeed', label: 'Rotation speed', min: 0, max: 2, defaultValue: 0.18 },
];

function frame(overrides: Partial<Pick<AudioFrame, 'bass' | 'mid' | 'treble' | 'level' | 'beat'>> = {}): AudioFrame {
  return {
    time: 1, bass: 0, mid: 0, treble: 0, level: 0, beat: false,
    spectrum: new Uint8Array(256), waveform: new Float32Array(512), ...overrides,
  };
}

function mapping(overrides: Partial<AudioMapping> = {}): AudioMapping {
  return {
    id: 'bass-scale', source: 'bass', target: 'meshScale',
    intensity: 100, smoothing: 0, invert: false, enabled: true, ...overrides,
  };
}

describe('audio mapping evaluator', () => {
  it('reads normalized audio bands and beat triggers', () => {
    expect(readMappingSource(frame({ bass: 0.72 }), 'bass')).toBe(0.72);
    expect(readMappingSource(frame({ beat: true }), 'beat')).toBe(1);
    expect(readMappingSource(frame({ treble: 4 }), 'treble')).toBe(1);
  });

  it('maps bass energy into a scene parameter at configured intensity', () => {
    expect(evaluateAudioMappings(frame({ bass: 1 }), [mapping()], schema, 1 / 60).meshScale).toBe(2);
  });

  it('reverses the source response when invert is enabled', () => {
    expect(evaluateAudioMappings(frame({ bass: 1 }), [mapping({ invert: true })], schema, 1 / 60).meshScale).toBe(1);
  });

  it('leaves scene defaults untouched for disabled mappings', () => {
    expect(evaluateAudioMappings(frame({ bass: 1 }), [mapping({ enabled: false })], schema, 1 / 60).meshScale).toBe(1);
  });

  it('clamps intensity and combined mappings to the scene parameter range', () => {
    const params = evaluateAudioMappings(
      frame({ bass: 1, mid: 1 }),
      [mapping({ intensity: 200 }), mapping({ id: 'mid-scale', source: 'mid', intensity: 200 })],
      schema,
      1 / 60,
    );
    expect(params.meshScale).toBe(2);
  });

  it('smooths rapid changes when smoothing is enabled', () => {
    const smoothingState = new Map<string, number>([['bass-scale', 0]]);
    const params = evaluateAudioMappings(frame({ bass: 1 }), [mapping({ smoothing: 100 })], schema, 1 / 60, smoothingState);
    expect(params.meshScale).toBeGreaterThan(1);
    expect(params.meshScale).toBeLessThan(2);
  });

  it('ignores a target not exposed by the selected scene schema', () => {
    const params = evaluateAudioMappings(frame({ bass: 1 }), [mapping({ target: 'particleTurbulence' })], schema, 1 / 60);
    expect(params.meshScale).toBe(1);
  });
});
