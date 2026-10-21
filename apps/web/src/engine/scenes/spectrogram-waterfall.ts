import * as THREE from 'three';
import type { AudioFrame } from '../audio/analysis';
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

const COLUMNS = 96;
const ROWS = 52;
const HALF_WIDTH = 4.25;
const HALF_DEPTH = 2.8;

export class SpectrogramWaterfallScene implements Scene {
  readonly id = 'spectrogram-waterfall';
  readonly name = 'Spectrogram Waterfall';

  private context: RenderContext | null = null;
  private geometry: THREE.BufferGeometry | null = null;
  private surfaceMaterial: THREE.MeshBasicMaterial | null = null;
  private gridMaterial: THREE.MeshBasicMaterial | null = null;
  private surface: THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial> | null = null;
  private grid: THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial> | null = null;
  private history = new Uint8Array(COLUMNS * ROWS);
  private rowAccumulator = 0;
  private colors: readonly [string, string, string] = DEFAULT_SCENE_THEME.colors;
  private quality: QualityTier = 'high';
  private disposed = false;

  getParamSchema(): readonly SceneParamDescriptor[] {
    return [
      { key: 'meshScale', label: 'Waterfall height', min: 0, max: 2, defaultValue: 1 },
      { key: 'tunnelSpeed', label: 'History speed', min: 0, max: 2, defaultValue: 1 },
    ];
  }

  init(context: RenderContext, config: ScenePresetConfig): void {
    if (this.context !== null) this.dispose();
    this.context = context;
    this.disposed = false;
    this.quality = config.quality ?? 'high';
    this.history.fill(0);
    this.setTheme(config.theme ?? DEFAULT_SCENE_THEME);

    const vertexCount = (ROWS + 1) * (COLUMNS + 1);
    const positions = new Float32Array(vertexCount * 3);
    const colors = new Float32Array(vertexCount * 3);
    const indices: number[] = [];
    for (let row = 0; row <= ROWS; row += 1) {
      for (let column = 0; column <= COLUMNS; column += 1) {
        const index = row * (COLUMNS + 1) + column;
        positions[index * 3] = (column / COLUMNS - 0.5) * HALF_WIDTH * 2;
        positions[index * 3 + 1] = (row / ROWS - 0.5) * HALF_DEPTH * 2;
        positions[index * 3 + 2] = 0;
        if (row < ROWS && column < COLUMNS) {
          const nextRow = index + COLUMNS + 1;
          indices.push(index, index + 1, nextRow, index + 1, nextRow + 1, nextRow);
        }
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3).setUsage(THREE.DynamicDrawUsage));
    geometry.setIndex(indices);
    this.geometry = geometry;

    const surfaceMaterial = new THREE.MeshBasicMaterial({
      vertexColors: true,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.88,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    });
    const gridMaterial = new THREE.MeshBasicMaterial({
      vertexColors: true,
      wireframe: true,
      transparent: true,
      opacity: 0.62,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    });
    this.surfaceMaterial = surfaceMaterial;
    this.gridMaterial = gridMaterial;
    this.surface = new THREE.Mesh(geometry, surfaceMaterial);
    this.grid = new THREE.Mesh(geometry, gridMaterial);
    this.surface.frustumCulled = false;
    this.grid.frustumCulled = false;
    this.surface.name = 'spectrogram-waterfall-surface';
    this.grid.name = 'spectrogram-waterfall-grid';
    const group = new THREE.Group();
    group.name = 'spectrogram-waterfall-root';
    group.rotation.x = -0.83;
    group.rotation.z = 0.035;
    group.add(this.surface, this.grid);
    context.scene.add(group);
    this.root = group;
  }

  private root: THREE.Group | null = null;

  update(frame: AudioFrame, params: ParamFrame, dt: number): void {
    if (this.disposed || this.geometry === null) return;
    const speed = Math.max(0, Math.min(2, params.tunnelSpeed ?? 1));
    this.rowAccumulator += dt * (10 + speed * 14);
    const sampleRow = this.rowAccumulator >= 1;
    if (sampleRow) this.rowAccumulator %= 1;
    if (sampleRow) {
      this.history.copyWithin(COLUMNS, 0, this.history.length - COLUMNS);
      const spectrum = frame.spectrum;
      for (let column = 0; column < COLUMNS; column += 1) {
        const logPosition = Math.pow(column / (COLUMNS - 1), 1.75);
        const bin = Math.min(spectrum.length - 1, Math.floor(logPosition * (spectrum.length - 1)));
        this.history[column] = spectrum[bin] ?? 0;
      }
    }

    const positionAttribute = this.geometry.getAttribute('position') as THREE.BufferAttribute;
    const colorAttribute = this.geometry.getAttribute('color') as THREE.BufferAttribute;
    const positions = positionAttribute.array as Float32Array;
    const colors = colorAttribute.array as Float32Array;
    const low = new THREE.Color(this.colors[0]);
    const middle = new THREE.Color(this.colors[1]);
    const high = new THREE.Color(this.colors[2]);
    const color = new THREE.Color();
    for (let row = 0; row <= ROWS; row += 1) {
      for (let column = 0; column <= COLUMNS; column += 1) {
        const index = row * (COLUMNS + 1) + column;
        const sourceRow = Math.min(ROWS - 1, row);
        const sourceColumn = Math.min(COLUMNS - 1, column);
        const magnitude = (this.history[sourceRow * COLUMNS + sourceColumn] ?? 0) / 255;
        const pulse = frame.beat ? 0.12 : 0;
        positions[index * 3 + 2] = (magnitude * 1.85 + pulse) * Math.max(0, params.meshScale ?? 1);
        if (magnitude < 0.5) color.lerpColors(low, middle, magnitude * 2);
        else color.lerpColors(middle, high, (magnitude - 0.5) * 2);
        color.multiplyScalar(0.12 + magnitude * 1.15 + pulse);
        colors[index * 3] = color.r;
        colors[index * 3 + 1] = color.g;
        colors[index * 3 + 2] = color.b;
      }
    }
    positionAttribute.needsUpdate = true;
    colorAttribute.needsUpdate = true;
    if (this.root !== null) {
      this.root.rotation.z = 0.035 + Math.sin(frame.time * 0.18) * 0.025;
      this.root.position.z = -0.2 + frame.bass * 0.18;
    }
  }

  render(): void {
    if (this.context !== null && !this.disposed) this.context.renderer.render(this.context.scene, this.context.camera);
  }

  setTheme(theme: SceneTheme): void {
    this.colors = theme.colors;
  }

  setQuality(tier: QualityTier): void {
    this.quality = tier;
    if (this.root !== null) this.root.visible = true;
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    if (this.context !== null && this.root !== null) this.context.scene.remove(this.root);
    this.geometry?.dispose();
    this.surfaceMaterial?.dispose();
    this.gridMaterial?.dispose();
    this.context = null;
    this.geometry = null;
    this.surfaceMaterial = null;
    this.gridMaterial = null;
    this.surface = null;
    this.grid = null;
    this.root = null;
  }
}
