import * as THREE from 'three';
import type { AudioFrame } from '../audio/analysis';
import { sampleSpectrum } from './spectrum-sampling';
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

const POINTS_PER_RING = 448;
const RING_COUNT = 8;
const SPOKE_COUNT = 48;

interface MandalaRing {
  geometry: THREE.BufferGeometry;
  material: THREE.LineBasicMaterial;
  line: THREE.LineLoop<THREE.BufferGeometry, THREE.LineBasicMaterial>;
  radius: number;
  petals: number;
  phase: number;
}

export class KaleidoscopeMandalaScene implements Scene {
  readonly id = 'kaleidoscope-mandala';
  readonly name = 'Kaleidoscope Mandala';

  private context: RenderContext | null = null;
  private rings: MandalaRing[] = [];
  private spokes: THREE.LineSegments<THREE.BufferGeometry, THREE.LineBasicMaterial> | null = null;
  private spokeGeometry: THREE.BufferGeometry | null = null;
  private spokeMaterial: THREE.LineBasicMaterial | null = null;
  private core: THREE.Mesh | null = null;
  private coreCage: THREE.Mesh<THREE.IcosahedronGeometry, THREE.MeshBasicMaterial> | null = null;
  private colors: readonly [string, string, string] = DEFAULT_SCENE_THEME.colors;
  private quality: QualityTier = 'high';
  private elapsed = 0;
  private disposed = false;

  getParamSchema(): readonly SceneParamDescriptor[] {
    return [
      { key: 'rotationSpeed', label: 'Mandala rotation', min: 0, max: 2, defaultValue: 0.55 },
      { key: 'meshScale', label: 'Petal depth', min: 0, max: 2, defaultValue: 1 },
    ];
  }

  init(context: RenderContext, config: ScenePresetConfig): void {
    if (this.context !== null) this.dispose();
    this.context = context;
    this.disposed = false;
    this.quality = config.quality ?? 'high';
    this.setTheme(config.theme ?? DEFAULT_SCENE_THEME);
    for (let ringIndex = 0; ringIndex < RING_COUNT; ringIndex += 1) {
      const positions = new Float32Array(POINTS_PER_RING * 3);
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage));
      const material = new THREE.LineBasicMaterial({
        color: this.colors[ringIndex % 3],
        transparent: true,
        opacity: 0.92 - ringIndex * 0.065,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      });
      const line = new THREE.LineLoop(geometry, material);
      line.frustumCulled = false;
      line.name = 'mandala-petal-ring';
      context.scene.add(line);
      this.rings.push({
        geometry,
        material,
        line,
        radius: 0.34 + ringIndex * 0.42,
        petals: 7 + ringIndex * 4,
        phase: ringIndex * 0.47,
      });
    }
    const spokePositions = new Float32Array(SPOKE_COUNT * 2 * 3);
    this.spokeGeometry = new THREE.BufferGeometry();
    this.spokeGeometry.setAttribute(
      'position',
      new THREE.BufferAttribute(spokePositions, 3).setUsage(THREE.DynamicDrawUsage),
    );
    this.spokeMaterial = new THREE.LineBasicMaterial({
      color: this.colors[0],
      transparent: true,
      opacity: 0.32,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    });
    this.spokes = new THREE.LineSegments(this.spokeGeometry, this.spokeMaterial);
    this.spokes.frustumCulled = false;
    this.spokes.name = 'mandala-radial-facets';
    context.scene.add(this.spokes);

    this.core = new THREE.Mesh(
      new THREE.SphereGeometry(0.18, 24, 16),
      new THREE.MeshBasicMaterial({ color: this.colors[1], transparent: true, opacity: 0.96, toneMapped: false }),
    );
    this.coreCage = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.5, 1),
      new THREE.MeshBasicMaterial({
        color: this.colors[0],
        wireframe: true,
        transparent: true,
        opacity: 0.78,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      }),
    );
    this.coreCage.renderOrder = 2;
    context.scene.add(this.core, this.coreCage);
    this.setQuality(this.quality);
  }

  update(frame: AudioFrame, params: ParamFrame, dt: number): void {
    if (this.disposed) return;
    this.elapsed += dt;
    const speed = Math.max(0, Math.min(2, params.rotationSpeed ?? 0.55));
    const scale = Math.max(0, Math.min(2, params.meshScale ?? 1));
    for (let ringIndex = 0; ringIndex < this.rings.length; ringIndex += 1) {
      const ring = this.rings[ringIndex];
      if (ring === undefined) continue;
      const attribute = ring.geometry.getAttribute('position') as THREE.BufferAttribute;
      const positions = attribute.array as Float32Array;
      for (let point = 0; point < POINTS_PER_RING; point += 1) {
        const progress = point / POINTS_PER_RING;
        const angle = progress * Math.PI * 2;
        const frequencyPosition = (progress * (ringIndex + 2) + this.elapsed * 0.018) % 1;
        const spectrum = sampleSpectrum(frame.spectrum, frequencyPosition);
        const mid = visualEnergy(frame.mid, 1.5, 0.72);
        const bass = visualEnergy(frame.bass, 1.5, 0.76);
        const petal = Math.sin(angle * ring.petals + this.elapsed * (0.35 + ringIndex * 0.11) + ring.phase);
        const smallPetal = Math.sin(angle * (ring.petals * 2 + 1) - this.elapsed * 0.25);
        const radius = (ring.radius + spectrum * 0.28 + bass * 0.2) * scale
          * (1 + petal * (0.11 + mid * 0.2) + smallPetal * (0.035 + frame.treble * 0.09));
        const offset = point * 3;
        positions[offset] = Math.cos(angle + this.elapsed * speed * 0.04) * radius;
        positions[offset + 1] = Math.sin(angle + this.elapsed * speed * 0.04) * radius;
        positions[offset + 2] = Math.sin(angle * ringIndex + this.elapsed + ring.phase) * (0.04 + frame.treble * 0.2);
      }
      attribute.needsUpdate = true;
      ring.line.rotation.z = this.elapsed * speed * (ringIndex % 2 === 0 ? 0.055 : -0.045);
    }
    if (this.spokeGeometry !== null) {
      const attribute = this.spokeGeometry.getAttribute('position') as THREE.BufferAttribute;
      const positions = attribute.array as Float32Array;
      const bass = visualEnergy(frame.bass, 1.55, 0.72);
      const treble = visualEnergy(frame.treble, 1.6, 0.68);
      const rotation = this.elapsed * 0.08;
      for (let spoke = 0; spoke < SPOKE_COUNT; spoke += 1) {
        const angle = (spoke / SPOKE_COUNT) * Math.PI * 2 + rotation;
        const inner = 0.54 + bass * 0.08;
        const outer = 2.88 + bass * 0.22 + Math.sin(this.elapsed * 1.6 + spoke * 0.4) * (0.08 + treble * 0.16);
        const offset = spoke * 6;
        positions[offset] = Math.cos(angle) * inner;
        positions[offset + 1] = Math.sin(angle) * inner;
        positions[offset + 2] = Math.sin(angle * 3 + this.elapsed) * (0.04 + treble * 0.1);
        positions[offset + 3] = Math.cos(angle) * outer;
        positions[offset + 4] = Math.sin(angle) * outer;
        positions[offset + 5] = Math.sin(angle * 3 + this.elapsed + 1.2) * (0.08 + treble * 0.14);
      }
      attribute.needsUpdate = true;
    }
    this.core?.scale.setScalar(1 + frame.bass * 1.0 + frame.level * 0.7);
    if (this.coreCage !== null) {
      this.coreCage.rotation.x = this.elapsed * 0.34;
      this.coreCage.rotation.y = -this.elapsed * 0.27;
      this.coreCage.rotation.z = this.elapsed * 0.18;
      this.coreCage.scale.setScalar(1 + frame.bass * 0.2 + frame.treble * 0.12);
    }
  }

  render(): void {
    if (this.context !== null && !this.disposed) this.context.renderer.render(this.context.scene, this.context.camera);
  }

  setTheme(theme: SceneTheme): void {
    this.colors = theme.colors;
    this.rings.forEach((ring, index) => ring.material.color.set(this.colors[index % 3]));
    this.spokeMaterial?.color.set(this.colors[0]);
    if (this.core?.material instanceof THREE.MeshBasicMaterial) this.core.material.color.set(this.colors[1]);
    if (this.coreCage?.material instanceof THREE.MeshBasicMaterial) this.coreCage.material.color.set(this.colors[2]);
  }

  setQuality(tier: QualityTier): void {
    this.quality = tier;
    const visibleRings = tier === 'low' ? 4 : tier === 'medium' ? 6 : RING_COUNT;
    this.rings.forEach((ring, index) => { ring.line.visible = index < visibleRings; });
    if (this.spokes !== null) this.spokes.visible = tier !== 'low';
    if (this.coreCage !== null) this.coreCage.visible = tier !== 'low';
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    if (this.context !== null) {
      this.rings.forEach((ring) => this.context?.scene.remove(ring.line));
      if (this.spokes !== null) this.context.scene.remove(this.spokes);
      if (this.core !== null) this.context.scene.remove(this.core);
      if (this.coreCage !== null) this.context.scene.remove(this.coreCage);
    }
    this.rings.forEach((ring) => { ring.geometry.dispose(); ring.material.dispose(); });
    this.rings = [];
    this.spokeGeometry?.dispose();
    this.spokeMaterial?.dispose();
    if (this.core !== null) {
      this.core.geometry.dispose();
      if (this.core.material instanceof THREE.Material) this.core.material.dispose();
    }
    if (this.coreCage !== null) {
      this.coreCage.geometry.dispose();
      this.coreCage.material.dispose();
    }
    this.context = null;
    this.core = null;
    this.coreCage = null;
    this.spokes = null;
    this.spokeGeometry = null;
    this.spokeMaterial = null;
  }
}
