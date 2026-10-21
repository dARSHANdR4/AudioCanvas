import * as THREE from 'three';
import type { AudioFrame } from '../audio/analysis';
import { visualEnergy } from './visual-response';
import {
  DEFAULT_SCENE_THEME,
  type ParamFrame,
  type QualityTier,
  type RenderContext,
  type Scene,
  type SceneParamDescriptor,
  type ScenePresetConfig,
  type SceneTheme,
} from './scene';

const POINTS = 640;

export class WaveformScopeScene implements Scene {
  readonly id = 'waveform-scope';
  readonly name = 'Oscilloscope Ribbon';

  private context: RenderContext | null = null;
  private primaryGeometry: THREE.BufferGeometry | null = null;
  private secondaryGeometry: THREE.BufferGeometry | null = null;
  private primaryLine: THREE.Line<THREE.BufferGeometry, THREE.LineBasicMaterial> | null = null;
  private secondaryLine: THREE.Line<THREE.BufferGeometry, THREE.LineBasicMaterial> | null = null;
  private primaryMaterial: THREE.LineBasicMaterial | null = null;
  private secondaryMaterial: THREE.LineBasicMaterial | null = null;
  private gridGeometry: THREE.BufferGeometry | null = null;
  private gridMaterial: THREE.LineBasicMaterial | null = null;
  private core: THREE.Mesh | null = null;
  private colors: readonly [string, string, string] = DEFAULT_SCENE_THEME.colors;
  private quality: QualityTier = 'high';
  private elapsed = 0;
  private disposed = false;

  getParamSchema(): readonly SceneParamDescriptor[] {
    return [
      { key: 'meshScale', label: 'Waveform scale', min: 0, max: 2, defaultValue: 1 },
      { key: 'lineThickness', label: 'Ribbon width', min: 0.5, max: 2, defaultValue: 1 },
    ];
  }

  init(context: RenderContext, config: ScenePresetConfig): void {
    if (this.context !== null) this.dispose();
    this.context = context;
    this.disposed = false;
    this.quality = config.quality ?? 'high';
    this.setTheme(config.theme ?? DEFAULT_SCENE_THEME);

    const gridPositions: number[] = [];
    for (let row = -3; row <= 3; row += 1) {
      const y = row * 0.48;
      gridPositions.push(-4.7, y, -0.45, 4.7, y, -0.45);
    }
    for (let column = -9; column <= 9; column += 1) {
      const x = column * 0.48;
      gridPositions.push(x, -1.65, -0.45, x, 1.65, -0.45);
    }
    this.gridGeometry = new THREE.BufferGeometry();
    this.gridGeometry.setAttribute('position', new THREE.Float32BufferAttribute(gridPositions, 3));
    this.gridMaterial = new THREE.LineBasicMaterial({ color: '#24243b', transparent: true, opacity: 0.7 });
    context.scene.add(new THREE.LineSegments(this.gridGeometry, this.gridMaterial));

    const makeLine = (secondary: boolean) => {
      const geometry = new THREE.BufferGeometry();
      const positions = new Float32Array(POINTS * 3);
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage));
      const material = new THREE.LineBasicMaterial({
        color: secondary ? this.colors[2] : this.colors[0],
        transparent: true,
        opacity: secondary ? 0.72 : 1,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      });
      const line = new THREE.Line(geometry, material);
      line.frustumCulled = false;
      context.scene.add(line);
      return { geometry, material, line };
    };
    const primary = makeLine(false);
    const secondary = makeLine(true);
    this.primaryGeometry = primary.geometry;
    this.primaryMaterial = primary.material;
    this.primaryLine = primary.line;
    this.secondaryGeometry = secondary.geometry;
    this.secondaryMaterial = secondary.material;
    this.secondaryLine = secondary.line;

    this.core = new THREE.Mesh(
      new THREE.SphereGeometry(0.105, 20, 14),
      new THREE.MeshBasicMaterial({ color: this.colors[1], transparent: true, opacity: 0.9, toneMapped: false }),
    );
    context.scene.add(this.core);
  }

  update(frame: AudioFrame, params: ParamFrame, dt: number): void {
    if (this.disposed) return;
    this.elapsed += dt;
    const scale = Math.max(0, Math.min(2, params.meshScale ?? 1));
    const boost = 1 + visualEnergy(frame.bass, 1.25, 0.8) * 0.38 + visualEnergy(frame.level, 1.2, 0.8) * 0.16;
    const waveform = frame.waveform;
    const primaryPositions = this.primaryGeometry?.getAttribute('position') as THREE.BufferAttribute | undefined;
    const secondaryPositions = this.secondaryGeometry?.getAttribute('position') as THREE.BufferAttribute | undefined;
    if (primaryPositions === undefined || secondaryPositions === undefined) return;
    const primary = primaryPositions.array as Float32Array;
    const secondary = secondaryPositions.array as Float32Array;
    for (let i = 0; i < POINTS; i += 1) {
      const progress = i / (POINTS - 1);
      const sampleIndex = Math.min(waveform.length - 1, Math.floor(progress * (waveform.length - 1)));
      const sample = waveform[sampleIndex] ?? 0;
      const x = (progress - 0.5) * 9.1;
      const y = sample * 2.5 * boost * scale;
      const offset = i * 3;
      primary[offset] = x;
      primary[offset + 1] = y;
      primary[offset + 2] = 0.12;
      secondary[offset] = x;
      secondary[offset + 1] = -sample * 1.65 * boost * scale + Math.sin(progress * Math.PI * 16 + this.elapsed * 1.2) * frame.mid * 0.12;
      secondary[offset + 2] = 0.08;
    }
    primaryPositions.needsUpdate = true;
    secondaryPositions.needsUpdate = true;
    this.core?.scale.setScalar(1 + frame.level * 1.1 + frame.bass * 0.5);
    if (this.core !== null) this.core.rotation.z += dt * 0.8;
  }

  render(): void {
    if (this.context !== null && !this.disposed) this.context.renderer.render(this.context.scene, this.context.camera);
  }

  setTheme(theme: SceneTheme): void {
    this.colors = theme.colors;
    if (this.primaryMaterial !== null) this.primaryMaterial.color.set(this.colors[0]);
    if (this.secondaryMaterial !== null) this.secondaryMaterial.color.set(this.colors[2]);
    if (this.core?.material instanceof THREE.MeshBasicMaterial) this.core.material.color.set(this.colors[1]);
  }

  setQuality(tier: QualityTier): void {
    this.quality = tier;
    if (this.primaryLine !== null) this.primaryLine.visible = tier !== 'low';
    if (this.secondaryLine !== null) this.secondaryLine.visible = true;
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    const context = this.context;
    if (context !== null) {
      if (this.primaryLine !== null) context.scene.remove(this.primaryLine);
      if (this.secondaryLine !== null) context.scene.remove(this.secondaryLine);
      if (this.core !== null) context.scene.remove(this.core);
      // Grid is detached by its geometry/material ownership below.
      const grid = context.scene.children.find((item) => item instanceof THREE.LineSegments && item.geometry === this.gridGeometry);
      if (grid !== undefined) context.scene.remove(grid);
    }
    this.primaryGeometry?.dispose();
    this.secondaryGeometry?.dispose();
    this.primaryMaterial?.dispose();
    this.secondaryMaterial?.dispose();
    this.gridGeometry?.dispose();
    this.gridMaterial?.dispose();
    if (this.core !== null) {
      this.core.geometry.dispose();
      if (this.core.material instanceof THREE.Material) this.core.material.dispose();
    }
    this.context = null;
    this.primaryGeometry = null;
    this.secondaryGeometry = null;
    this.primaryLine = null;
    this.secondaryLine = null;
    this.primaryMaterial = null;
    this.secondaryMaterial = null;
    this.gridGeometry = null;
    this.gridMaterial = null;
    this.core = null;
  }
}
