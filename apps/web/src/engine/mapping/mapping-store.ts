import type { SceneId } from '../scenes/scene-registry';
import type { SceneParamKey } from '../scenes/scene';
import { type AudioMapping, type AudioMappingSource } from './mapping-engine';

export const AUDIO_MAPPINGS_STORAGE_KEY = 'audiocanvas.audio-mappings.v1';

const SOURCE_VALUES = new Set<AudioMappingSource>(['bass', 'mid', 'treble', 'level', 'beat']);
const TARGET_VALUES = new Set<SceneParamKey>([
  'meshScale', 'rotationSpeed', 'particleTurbulence', 'bloomIntensity',
  'cameraShake', 'colorFlash', 'lineThickness', 'tunnelSpeed',
]);

type MappingListener = (sceneId: SceneId) => void;
type MappingCollection = Record<SceneId, AudioMapping[]>;

function mapping(id: string, source: AudioMappingSource, target: SceneParamKey, intensity = 100, smoothing = 30): AudioMapping {
  return { id, source, target, intensity, smoothing, invert: false, enabled: true };
}

function createDefaultMappings(): MappingCollection {
  return {
    'radial-wave-disk': [
      mapping('radial-bass-scale', 'bass', 'meshScale', 100, 28),
      mapping('radial-mid-rotation', 'mid', 'rotationSpeed', 85, 38),
      mapping('radial-treble-flash', 'treble', 'colorFlash', 65, 20),
    ],
    'particle-vortex': [
      mapping('vortex-bass-turbulence', 'bass', 'particleTurbulence', 100, 32),
      mapping('vortex-treble-flash', 'treble', 'colorFlash', 90, 18),
    ],
    'synthwave-tunnel': [
      mapping('tunnel-bass-speed', 'bass', 'tunnelSpeed', 85, 25),
      mapping('tunnel-mid-camera', 'mid', 'cameraShake', 55, 42),
    ],
    'waveform-scope': [
      mapping('waveform-bass-scale', 'bass', 'meshScale', 100, 25),
      mapping('waveform-mid-width', 'mid', 'lineThickness', 75, 30),
    ],
    'spectrogram-waterfall': [
      mapping('waterfall-bass-height', 'bass', 'meshScale', 90, 24),
      mapping('waterfall-mid-speed', 'mid', 'tunnelSpeed', 80, 40),
    ],
    'kaleidoscope-mandala': [
      mapping('mandala-bass-depth', 'bass', 'meshScale', 85, 25),
      mapping('mandala-mid-rotation', 'mid', 'rotationSpeed', 100, 38),
    ],
    'liquid-orb': [
      mapping('orb-bass-scale', 'bass', 'meshScale', 90, 25),
      mapping('orb-treble-shimmer', 'treble', 'colorFlash', 85, 18),
    ],
  };
}

function clamp(value: number, min: number, max: number): number {
  return Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : min;
}

function normalizeMapping(value: unknown): AudioMapping | null {
  if (typeof value !== 'object' || value === null) return null;
  const candidate = value as Partial<AudioMapping>;
  if (typeof candidate.id !== 'string' || candidate.id.length === 0) return null;
  if (!candidate.source || !SOURCE_VALUES.has(candidate.source)) return null;
  if (!candidate.target || !TARGET_VALUES.has(candidate.target)) return null;
  return {
    id: candidate.id.slice(0, 120),
    source: candidate.source,
    target: candidate.target,
    intensity: clamp(candidate.intensity ?? 100, 0, 200),
    smoothing: clamp(candidate.smoothing ?? 30, 0, 100),
    invert: candidate.invert === true,
    enabled: candidate.enabled !== false,
  };
}

function normalizeMappings(values: unknown): AudioMapping[] {
  if (!Array.isArray(values)) return [];
  return values.map(normalizeMapping).filter((value): value is AudioMapping => value !== null).slice(0, 12);
}

const listeners = new Set<MappingListener>();
let mappingsByScene = createDefaultMappings();
let initialized = false;

function notify(sceneId: SceneId): void {
  listeners.forEach((listener) => listener(sceneId));
}

function persist(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(AUDIO_MAPPINGS_STORAGE_KEY, JSON.stringify(mappingsByScene));
  } catch {
    // Keep editing available for the current session if storage is unavailable.
  }
}

/** Load stored guest mappings once; audio files and settings remain browser-local. */
export function initializeAudioMappings(): MappingCollection {
  if (initialized) return mappingsByScene;
  initialized = true;
  if (typeof window === 'undefined') return mappingsByScene;

  try {
    const stored = window.localStorage.getItem(AUDIO_MAPPINGS_STORAGE_KEY);
    if (stored === null) return mappingsByScene;
    const parsed: unknown = JSON.parse(stored);
    if (typeof parsed !== 'object' || parsed === null) return mappingsByScene;
    const candidate = parsed as Partial<Record<SceneId, unknown>>;
    const defaults = createDefaultMappings();
    const next = { ...defaults };
    for (const sceneId of Object.keys(defaults) as SceneId[]) {
      if (Array.isArray(candidate[sceneId])) next[sceneId] = normalizeMappings(candidate[sceneId]);
    }
    mappingsByScene = next;
  } catch {
    // Malformed local data must never prevent the Studio from opening.
  }
  return mappingsByScene;
}

export function getAudioMappingsForScene(sceneId: SceneId): readonly AudioMapping[] {
  return mappingsByScene[sceneId];
}

export function subscribeToAudioMappings(listener: MappingListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setAudioMappingsForScene(sceneId: SceneId, nextMappings: readonly AudioMapping[]): void {
  initializeAudioMappings();
  mappingsByScene = { ...mappingsByScene, [sceneId]: normalizeMappings(nextMappings) };
  persist();
  notify(sceneId);
}

export function updateAudioMapping(sceneId: SceneId, mappingId: string, changes: Partial<Omit<AudioMapping, 'id'>>): void {
  const current = mappingsByScene[sceneId];
  setAudioMappingsForScene(sceneId, current.map((item) => (
    item.id === mappingId ? { ...item, ...changes, id: item.id } : item
  )));
}

export function addAudioMapping(sceneId: SceneId, nextMapping: AudioMapping): void {
  setAudioMappingsForScene(sceneId, [...mappingsByScene[sceneId], nextMapping]);
}

export function removeAudioMapping(sceneId: SceneId, mappingId: string): void {
  setAudioMappingsForScene(sceneId, mappingsByScene[sceneId].filter((item) => item.id !== mappingId));
}

export function resetAudioMappings(sceneId: SceneId): void {
  setAudioMappingsForScene(sceneId, createDefaultMappings()[sceneId]);
}
