import type { CameraPreset, CameraProfileSnapshot, CameraToggle } from './camera-controls-store';
import type { SceneId } from './scene-registry';

export type CameraProfilePreset = CameraPreset | 'custom';

export type CameraVector = CameraProfileSnapshot['position'];
export type SceneCameraProfile = CameraProfileSnapshot;

export interface CameraPreferences {
  sensitivity: number;
  enabled: Record<CameraToggle, boolean>;
}

export interface NamedCameraComposition {
  id: string;
  name: string;
  createdAt: number;
  profile: SceneCameraProfile;
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
export const MAX_NAMED_CAMERA_COMPOSITIONS = 12;
const MAX_COMPOSITION_NAME_LENGTH = 40;

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

function createDefaultCompositions(): Record<SceneId, NamedCameraComposition[]> {
  return Object.fromEntries(SCENE_IDS.map((sceneId) => [sceneId, [] as NamedCameraComposition[]])) as Record<SceneId, NamedCameraComposition[]>;
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

function cloneComposition(composition: NamedCameraComposition): NamedCameraComposition {
  return { ...composition, profile: cloneProfile(composition.profile) };
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

function normalizeComposition(value: unknown, fallback: SceneCameraProfile): NamedCameraComposition | null {
  if (!isRecord(value) || typeof value.id !== 'string' || typeof value.name !== 'string' || !isRecord(value.profile)) {
    return null;
  }
  const id = value.id.trim();
  const name = value.name.trim().slice(0, MAX_COMPOSITION_NAME_LENGTH);
  const createdAt = finiteNumber(value.createdAt, Number.NaN);
  if (id.length === 0 || name.length === 0 || !Number.isFinite(createdAt)) return null;
  return { id, name, createdAt, profile: normalizeProfile(value.profile, fallback) };
}

function createCompositionId(): string {
  const uniquePart = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : String(Date.now()) + '-' + Math.random().toString(36).slice(2, 10);
  return 'camera-' + uniquePart;
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
let compositions = createDefaultCompositions();
let initialized = false;
const settingsListeners = new Set<() => void>();
const DEFAULT_PROFILE_SNAPSHOT = createDefaultProfile();
const DEFAULT_PREFERENCES_SNAPSHOT = createDefaultPreferences();
const DEFAULT_NAMED_COMPOSITIONS_SNAPSHOT: readonly NamedCameraComposition[] = Object.freeze([]);

function notifySettingsChanged(): void {
  settingsListeners.forEach((listener) => listener());
}

function persist(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(CAMERA_STUDIO_STORAGE_KEY, JSON.stringify({ profiles, preferences, compositions }));
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
    const nextCompositions = createDefaultCompositions();
    const storedCompositions = isRecord(parsed.compositions) ? parsed.compositions : {};
    for (const sceneId of SCENE_IDS) {
      const storedForScene = storedCompositions[sceneId];
      if (!Array.isArray(storedForScene)) continue;
      for (const item of storedForScene) {
        if (nextCompositions[sceneId].length >= MAX_NAMED_CAMERA_COMPOSITIONS) break;
        const normalized = normalizeComposition(item, nextProfiles[sceneId]);
        if (normalized === null) continue;
        const duplicateName = nextCompositions[sceneId].some(
          (existing) => existing.name.toLowerCase() === normalized.name.toLowerCase(),
        );
        if (!duplicateName) nextCompositions[sceneId].push(normalized);
      }
    }

    profiles = nextProfiles;
    preferences = normalizePreferences(parsed.preferences, createDefaultPreferences());
    compositions = nextCompositions;
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

export function getSceneCameraCompositions(sceneId: SceneId): NamedCameraComposition[] {
  initializeCameraStudioSettings();
  return (compositions[sceneId] ?? []).map(cloneComposition);
}

/** Stable composition snapshot for React's useSyncExternalStore. */
export function getSceneCameraCompositionsSnapshot(sceneId: SceneId): readonly NamedCameraComposition[] {
  return compositions[sceneId] ?? DEFAULT_NAMED_COMPOSITIONS_SNAPSHOT;
}

export function getDefaultSceneCameraCompositionsSnapshot(): readonly NamedCameraComposition[] {
  return DEFAULT_NAMED_COMPOSITIONS_SNAPSHOT;
}

/** Save a reusable snapshot for only the requested scene. Returns null for invalid/duplicate names or the per-scene limit. */
export function saveNamedCameraComposition(
  sceneId: SceneId,
  name: string,
  profile?: SceneCameraProfile,
): NamedCameraComposition | null {
  initializeCameraStudioSettings();
  const normalizedName = name.trim().slice(0, MAX_COMPOSITION_NAME_LENGTH);
  const sceneCompositions = compositions[sceneId] ?? [];
  if (
    normalizedName.length === 0 ||
    sceneCompositions.length >= MAX_NAMED_CAMERA_COMPOSITIONS ||
    sceneCompositions.some((item) => item.name.toLowerCase() === normalizedName.toLowerCase())
  ) {
    return null;
  }

  const composition: NamedCameraComposition = {
    id: createCompositionId(),
    name: normalizedName,
    createdAt: Date.now(),
    profile: normalizeProfile(profile ?? profiles[sceneId] ?? createDefaultProfile(), createDefaultProfile()),
  };
  compositions = { ...compositions, [sceneId]: [...sceneCompositions, composition] };
  persist();
  notifySettingsChanged();
  return cloneComposition(composition);
}

export function deleteNamedCameraComposition(sceneId: SceneId, compositionId: string): boolean {
  initializeCameraStudioSettings();
  const current = compositions[sceneId] ?? [];
  const next = current.filter((item) => item.id !== compositionId);
  if (next.length === current.length) return false;
  compositions = { ...compositions, [sceneId]: next };
  persist();
  notifySettingsChanged();
  return true;
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
