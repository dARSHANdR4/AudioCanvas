import type { AudioFrame } from '../audio/analysis';
import { DEFAULT_SCENE_PARAMS, type ParamFrame, type SceneParamDescriptor, type SceneParamKey } from '../scenes/scene';

export const AUDIO_MAPPING_SOURCES = [
  { value: 'bass', label: 'Bass' },
  { value: 'mid', label: 'Mid' },
  { value: 'treble', label: 'Treble' },
  { value: 'level', label: 'Overall level' },
  { value: 'beat', label: 'Beat trigger' },
] as const;

export type AudioMappingSource = (typeof AUDIO_MAPPING_SOURCES)[number]['value'];

export interface AudioMapping {
  id: string;
  source: AudioMappingSource;
  target: SceneParamKey;
  /** Mapping strength from 0 to 200 percent. */
  intensity: number;
  /** One-pole smoothing amount from 0 (off) to 100 (slowest). */
  smoothing: number;
  invert: boolean;
  enabled: boolean;
}

export type MappingSmoothingState = Map<string, number>;

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

export function readMappingSource(frame: AudioFrame, source: AudioMappingSource): number {
  switch (source) {
    case 'bass': return clamp(frame.bass, 0, 1);
    case 'mid': return clamp(frame.mid, 0, 1);
    case 'treble': return clamp(frame.treble, 0, 1);
    case 'level': return clamp(frame.level, 0, 1);
    case 'beat': return frame.beat ? 1 : 0;
  }
}

/**
 * Converts an audio frame to scene parameters without putting per-frame audio
 * data into React state. Mappings contribute around each target's declared
 * default; mappings aimed at one target combine and are range-clamped.
 */
export function evaluateAudioMappings(
  audioFrame: AudioFrame,
  mappings: readonly AudioMapping[],
  schema: readonly SceneParamDescriptor[],
  dtSeconds: number,
  smoothingState: MappingSmoothingState = new Map<string, number>(),
): ParamFrame {
  const descriptors = new Map<SceneParamKey, SceneParamDescriptor>();
  const params: ParamFrame = { ...DEFAULT_SCENE_PARAMS };
  for (const descriptor of schema) {
    descriptors.set(descriptor.key, descriptor);
    params[descriptor.key] = descriptor.defaultValue;
  }

  const activeIds = new Set<string>();
  for (const mapping of mappings) {
    if (!mapping.enabled) continue;
    const descriptor = descriptors.get(mapping.target);
    if (descriptor === undefined) continue;
    activeIds.add(mapping.id);

    const rawValue = readMappingSource(audioFrame, mapping.source);
    const previousValue = smoothingState.get(mapping.id);
    const smoothing = clamp(mapping.smoothing, 0, 100) / 100;
    const tauSeconds = 0.02 + smoothing * 0.75;
    const alpha = smoothing === 0
      ? 1
      : 1 - Math.exp(-Math.max(0, Math.min(0.25, dtSeconds)) / tauSeconds);
    const smoothedValue = previousValue === undefined
      ? rawValue
      : previousValue + (rawValue - previousValue) * alpha;
    smoothingState.set(mapping.id, smoothedValue);

    const directedValue = mapping.invert ? 1 - smoothedValue : smoothedValue;
    const strength = clamp(mapping.intensity, 0, 200) / 100;
    const baseValue = params[mapping.target] ?? descriptor.defaultValue;
    const contribution = directedValue * strength * (descriptor.max - descriptor.min) * 0.5;
    params[mapping.target] = clamp(baseValue + contribution, descriptor.min, descriptor.max);
  }

  for (const id of smoothingState.keys()) {
    if (!activeIds.has(id)) smoothingState.delete(id);
  }
  return params;
}
