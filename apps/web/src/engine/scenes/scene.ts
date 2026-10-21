import type * as THREE from 'three';
import type { AudioFrame } from '../audio/analysis';

export type QualityTier = 'low' | 'medium' | 'high';

export type SceneParamKey =
  | 'meshScale'
  | 'rotationSpeed'
  | 'particleTurbulence'
  | 'bloomIntensity'
  | 'cameraShake'
  | 'colorFlash'
  | 'lineThickness'
  | 'tunnelSpeed';

export type ParamFrame = Partial<Record<SceneParamKey, number>>;

export interface SceneParamDescriptor {
  key: SceneParamKey;
  label: string;
  min: number;
  max: number;
  defaultValue: number;
}

export interface SceneTheme {
  id: string;
  colors: readonly [string, string, string];
}

export interface ScenePresetConfig {
  theme?: SceneTheme;
  quality?: QualityTier;
  reducedMotion?: boolean;
}

export interface RenderContext {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
}

export interface Scene {
  readonly id: string;
  readonly name: string;
  getParamSchema(): readonly SceneParamDescriptor[];
  init(context: RenderContext, config: ScenePresetConfig): void;
  update(audioFrame: AudioFrame, params: ParamFrame, dt: number): void;
  render(): void;
  setTheme(theme: SceneTheme): void;
  setQuality(tier: QualityTier): void;
  dispose(): void;
}

export const DEFAULT_SCENE_THEME: SceneTheme = {
  id: 'cyberpunk',
  colors: ['#00F5FF', '#8D7AFF', '#FF2BD6'],
};

export const DEFAULT_SCENE_PARAMS: ParamFrame = {
  meshScale: 1,
  rotationSpeed: 0.18,
  particleTurbulence: 0.5,
  bloomIntensity: 0.8,
  cameraShake: 0,
  colorFlash: 0,
  lineThickness: 1,
  tunnelSpeed: 1,
};
