import type { SceneId } from '../scenes/scene-registry';
import type { SceneTheme } from '../scenes/scene';

export interface SceneThemePreset extends SceneTheme {
  name: string;
  description: string;
}

export const SCENE_THEME_PRESETS = [
  { id: 'cyberpunk', name: 'Cyberpunk', description: 'Electric cyan, ultraviolet, and hot pink.', colors: ['#00F5FF', '#8D7AFF', '#FF2BD6'] },
  { id: 'aurora', name: 'Aurora', description: 'Cool mint, glacial blue, and soft violet.', colors: ['#60F2C2', '#73B7FF', '#C084FC'] },
  { id: 'ember', name: 'Ember', description: 'Warm amber, coral, and golden highlights.', colors: ['#FFB454', '#FF5D73', '#FFD166'] },
  { id: 'ocean', name: 'Ocean', description: 'Lagoon teal, deep blue, and indigo.', colors: ['#3BE7D6', '#2687FF', '#7B61FF'] },
  { id: 'monochrome', name: 'Monochrome', description: 'Silver white, cool grey, and slate.', colors: ['#F5F5FF', '#9EA4C8', '#5A607B'] },
] as const satisfies readonly SceneThemePreset[];

export type SceneThemePresetId = (typeof SCENE_THEME_PRESETS)[number]['id'];
export const DEFAULT_SCENE_THEME_PRESET_ID: SceneThemePresetId = 'cyberpunk';
export const SCENE_THEMES_STORAGE_KEY = 'audiocanvas.scene-themes.v1';

type ThemeListener = (sceneId: SceneId) => void;
type ThemeSelectionCollection = Record<SceneId, SceneThemePresetId>;
const SCENE_IDS: readonly SceneId[] = [
  'radial-wave-disk', 'particle-vortex', 'synthwave-tunnel', 'waveform-scope',
  'spectrogram-waterfall', 'kaleidoscope-mandala', 'liquid-orb',
];

function createDefaultSelections(): ThemeSelectionCollection {
  return Object.fromEntries(SCENE_IDS.map((sceneId) => [sceneId, DEFAULT_SCENE_THEME_PRESET_ID])) as ThemeSelectionCollection;
}

function findPreset(presetId: string): SceneThemePreset {
  return SCENE_THEME_PRESETS.find((preset) => preset.id === presetId) ?? SCENE_THEME_PRESETS[0]!;
}

function isPresetId(value: unknown): value is SceneThemePresetId {
  return typeof value === 'string' && SCENE_THEME_PRESETS.some((preset) => preset.id === value);
}

const listeners = new Set<ThemeListener>();
let selections = createDefaultSelections();
let initialized = false;

function notify(sceneId: SceneId): void {
  listeners.forEach((listener) => listener(sceneId));
}

function persist(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(SCENE_THEMES_STORAGE_KEY, JSON.stringify(selections));
  } catch {
    // Keep theme selection usable for this session when local storage is unavailable.
  }
}

export function initializeSceneThemes(): ThemeSelectionCollection {
  if (initialized) return selections;
  initialized = true;
  if (typeof window === 'undefined') return selections;
  try {
    const raw = window.localStorage.getItem(SCENE_THEMES_STORAGE_KEY);
    if (raw === null) return selections;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return selections;
    const stored = parsed as Partial<Record<SceneId, unknown>>;
    const next = createDefaultSelections();
    for (const sceneId of SCENE_IDS) {
      if (isPresetId(stored[sceneId])) next[sceneId] = stored[sceneId];
    }
    selections = next;
    for (const sceneId of SCENE_IDS) notify(sceneId);
  } catch {
    // Malformed or unavailable local data must not prevent the Studio from opening.
  }
  return selections;
}

export function getSceneThemePresetId(sceneId: SceneId): SceneThemePresetId {
  return selections[sceneId] ?? DEFAULT_SCENE_THEME_PRESET_ID;
}

export function getDefaultSceneThemePresetId(_sceneId: SceneId): SceneThemePresetId {
  return DEFAULT_SCENE_THEME_PRESET_ID;
}

export function getSceneTheme(sceneId: SceneId): SceneTheme {
  const preset = findPreset(getSceneThemePresetId(sceneId));
  return { id: preset.id, colors: preset.colors };
}

export function subscribeToSceneThemes(listener: ThemeListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setSceneThemePreset(sceneId: SceneId, presetId: SceneThemePresetId): void {
  initializeSceneThemes();
  if (!isPresetId(presetId)) return;
  if (selections[sceneId] === presetId) {
    notify(sceneId);
    return;
  }
  selections = { ...selections, [sceneId]: presetId };
  persist();
  notify(sceneId);
}

export function resetSceneThemePreset(sceneId: SceneId): void {
  setSceneThemePreset(sceneId, DEFAULT_SCENE_THEME_PRESET_ID);
}
