import type { CameraPreset, CameraProfileSnapshot, CameraToggle } from './camera-controls-store';
import type { SceneId } from './scene-registry';

export type CameraProfilePreset = CameraPreset | 'custom';

export interface CameraVector {
  x: number;
  y: number;
  z: number;
}

export interface SceneCameraProfile {
  preset: CameraProfilePreset;
  position: CameraVector;
  target: CameraVector;
  up: CameraVector;
  rollDegrees: number;
  objectRotationDegrees: Record<ObjectAxis, number>;
}

export interface CameraPreferences {
  sensitivity: number;
  enabled: Record<CameraToggle, boolean>;
}

type CameraPreferencePatch = Partial<Omit<CameraPreferences, 'enabled'>> & {
  enabled?: Partial<Record<CameraToggle, boolean>>;
};

const SCENE_IDS: readonly SceneId[] = [
  'radial-wave-disk',
  'particle-vortex',
  'synthwave-tunnel',
  'waveform-scope',
  'spectrogram-waterfall',
  'kaleidoscope-mandala',
  'liquid-orb',
];

const CAMERA_PRESETS: readonly CameraPreset[] = ['front', 'side', 'top', 'low-angle', 'cinematic'];
export const CAMERA_STUDIO_STORAGE_KEY = 'audiocanvas.camera-studio.v1';

function createDefaultProfile(): SceneCameraProfile {
  return {
    preset: 'front',
    position: { x: 0, y: 0, z: 10.3 },
    target: { x: 0, y: 0, z: 0 },
    up: { x: 0, y: 1, z: 0 },
    rollDegrees: 0,
    objectRotationDegrees: { x: 0, y: 0, z: 0 },
  };
}

function createDefaultProfiles(): Record<SceneId, SceneCameraProfile> {
  return Object.fromEntries(SCENE_IDS.map((sceneId) => [sceneId, createDefaultProfile()])) as Record<SceneId, SceneCameraProfile>;
}

function createDefaultPreferences(): CameraPreferences {
  return { sensitivity: 1, enabled: { rotate: true, pan: true, zoom: true } };
}

function cloneProfile(profile: SceneCameraProfile): SceneCameraProfile {
  return {
    ...profile,
    position: { ...profile.position },
    target: { ...profile.target },
    up: { ...profile.up },
    objectRotationDegrees: { ...profile.objectRotationDegrees },
  };
}

function clonePreferences(preferences: CameraPreferences): CameraPreferences {
  return { ...preferences, enabled: { ...preferences.enabled } };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function finiteNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function readVector(value: unknown, fallback: CameraVector): CameraVector {
  if (!isRecord(value)) return { ...fallback };
  return {
    x: finiteNumber(value.x, fallback.x),
    y: finiteNumber(value.y, fallback.y),
    z: finiteNumber(value.z, fallback.z),
  };
}

function clampDegrees(value: unknown, fallback: number): number {
  return Math.max(-180, Math.min(180, finiteNumber(value, fallback)));
}

function normalizeProfile(value: unknown, fallback: SceneCameraProfile): SceneCameraProfile {
  if (!isRecord(value)) return cloneProfile(fallback);
  const rawRotation = isRecord(value.objectRotationDegrees) ? value.objectRotationDegrees : {};
  const rawPreset = value.preset;
  const preset: CameraProfilePreset = rawPreset === 'custom' || (
    typeof rawPreset === 'string' && CAMERA_PRESETS.includes(rawPreset as CameraPreset)
  ) ? rawPreset as CameraProfilePreset : fallback.preset;

  return {
    preset,
    position: readVector(value.position, fallback.position),
    target: readVector(value.target, fallback.target),
    up: readVector(value.up, fallback.up),
    rollDegrees: clampDegrees(value.rollDegrees, fallback.rollDegrees),
    objectRotationDegrees: {
      x: clampDegrees(rawRotation.x, fallback.objectRotationDegrees.x),
      y: clampDegrees(rawRotation.y, fallback.objectRotationDegrees.y),
      z: clampDegrees(rawRotation.z, fallback.objectRotationDegrees.z),
    },
  };
}

function normalizePreferences(value: unknown, fallback: CameraPreferences): CameraPreferences {
  if (!isRecord(value)) return clonePreferences(fallback);
  const rawEnabled = isRecord(value.enabled) ? value.enabled : {};
  return {
    sensitivity: Math.max(0.4, Math.min(2, finiteNumber(value.sensitivity, fallback.sensitivity))),
    enabled: {
      rotate: typeof rawEnabled.rotate === 'boolean' ? rawEnabled.rotate : fallback.enabled.rotate,
      pan: typeof rawEnabled.pan === 'boolean' ? rawEnabled.pan : fallback.enabled.pan,
      zoom: typeof rawEnabled.zoom === 'boolean' ? rawEnabled.zoom : fallback.enabled.zoom,
    },
  };
}

let profiles = createDefaultProfiles();
let preferences = createDefaultPreferences();
let initialized = false;
const settingsListeners = new Set<() => void>();
const DEFAULT_PROFILE_SNAPSHOT = createDefaultProfile();
const DEFAULT_PREFERENCES_SNAPSHOT = createDefaultPreferences();

function notifySettingsChanged(): void {
  settingsListeners.forEach((listener) => listener());
}

function persist(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(CAMERA_STUDIO_STORAGE_KEY, JSON.stringify({ profiles, preferences }));
  } catch {
    // Keep Camera Studio usable for this session when local storage is unavailable.
  }
}

export function initializeCameraStudioSettings(): void {
  if (initialized) return;
  initialized = true;
  if (typeof window === 'undefined') return;

  try {
    const raw = window.localStorage.getItem(CAMERA_STUDIO_STORAGE_KEY);
    if (raw === null) return;
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) return;

    const nextProfiles = createDefaultProfiles();
    const storedProfiles = isRecord(parsed.profiles) ? parsed.profiles : {};
    for (const sceneId of SCENE_IDS) {
      nextProfiles[sceneId] = normalizeProfile(storedProfiles[sceneId], nextProfiles[sceneId]);
    }
    profiles = nextProfiles;
    preferences = normalizePreferences(parsed.preferences, createDefaultPreferences());
    notifySettingsChanged();
  } catch {
    // Malformed or unavailable local data must not prevent the Studio from opening.
  }
}

export function getSceneCameraProfile(sceneId: SceneId): SceneCameraProfile {
  initializeCameraStudioSettings();
  return cloneProfile(profiles[sceneId] ?? createDefaultProfile());
}

/** Stable snapshot for React's useSyncExternalStore; callers should not mutate it. */
export function getSceneCameraProfileSnapshot(sceneId: SceneId): SceneCameraProfile {
  return profiles[sceneId] ?? DEFAULT_PROFILE_SNAPSHOT;
}

export function getCameraPreferencesSnapshot(): CameraPreferences {
  return preferences;
}

export function getDefaultSceneCameraProfileSnapshot(): SceneCameraProfile {
  return DEFAULT_PROFILE_SNAPSHOT;
}

export function getDefaultCameraPreferencesSnapshot(): CameraPreferences {
  return DEFAULT_PREFERENCES_SNAPSHOT;
}

export function subscribeToCameraStudioSettings(listener: () => void): () => void {
  settingsListeners.add(listener);
  return () => { settingsListeners.delete(listener); };
}

/** Updates in-memory profile data; pass persistNow=false while OrbitControls is damping. */
export function setSceneCameraProfile(
  sceneId: SceneId,
  profile: SceneCameraProfile,
  persistNow = true,
  notifyChange = persistNow,
): void {
  initializeCameraStudioSettings();
  profiles = { ...profiles, [sceneId]: normalizeProfile(profile, createDefaultProfile()) };
  if (persistNow) persist();
  if (notifyChange) notifySettingsChanged();
}

export function resetSceneCameraProfile(sceneId: SceneId): SceneCameraProfile {
  const profile = createDefaultProfile();
  setSceneCameraProfile(sceneId, profile);
  return cloneProfile(profile);
}

export function getCameraPreferences(): CameraPreferences {
  initializeCameraStudioSettings();
  return clonePreferences(preferences);
}

export function setCameraPreferences(patch: CameraPreferencePatch): CameraPreferences {
  initializeCameraStudioSettings();
  preferences = normalizePreferences({
    ...preferences,
    ...patch,
    enabled: { ...preferences.enabled, ...patch.enabled },
  }, preferences);
  persist();
  notifySettingsChanged();
  return clonePreferences(preferences);
}

/** Flushes debounced view changes from OrbitControls to browser storage. */
export function persistCameraStudioSettings(): void {
  initializeCameraStudioSettings();
  persist();
}
