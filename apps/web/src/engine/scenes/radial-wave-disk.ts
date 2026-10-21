import * as THREE from 'three';
import type { AudioFrame } from '../audio/analysis';
import { sampleSpectrum } from './spectrum-sampling';
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

const BAR_COUNT = 180;
const INNER_RADIUS = 1.96;
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

function barCountForQuality(tier: QualityTier): number {
  if (tier === 'low') return 64;
  if (tier === 'medium') return 112;
  return BAR_COUNT;
}

/** First M2 scene: a deterministic radial spectrum built from one reusable InstancedMesh. */
export class RadialWaveDiskScene implements Scene {
  readonly id = 'radial-wave-disk';
  readonly name = 'Radial Wave Disk';

  private context: RenderContext | null = null;
  private group = new THREE.Group();
  private bars: THREE.InstancedMesh | null = null;
  private core: THREE.Mesh | null = null;
  private innerRing: THREE.Mesh | null = null;
  private outerRing: THREE.Mesh | null = null;
  private ringMaterials: THREE.MeshBasicMaterial[] = [];
  private stars: THREE.Points | null = null;
  private dummy = new THREE.Object3D();
  private colors: readonly [string, string, string] = DEFAULT_SCENE_THEME.colors;
  private readonly coreThemeColor = new THREE.Color(DEFAULT_SCENE_THEME.colors[0]);
  private readonly coreDarkColor = new THREE.Color('#101426');
  private quality: QualityTier = 'high';
  private reducedMotion = false;
  private elapsed = 0;
  private disposed = false;

  getParamSchema(): readonly SceneParamDescriptor[] {
    return [
      { key: 'meshScale', label: 'Mesh scale', min: 0, max: 2, defaultValue: 1 },
      { key: 'rotationSpeed', label: 'Rotation speed', min: 0, max: 2, defaultValue: 0.18 },
      { key: 'colorFlash', label: 'Color flash', min: 0, max: 2, defaultValue: 0 },
    ];
  }

  init(context: RenderContext, config: ScenePresetConfig): void {
    if (this.context !== null) this.dispose();
    this.context = context;
    this.disposed = false;
    this.quality = config.quality ?? 'high';
    this.reducedMotion = config.reducedMotion ?? (
      typeof window !== 'undefined' && window.matchMedia(REDUCED_MOTION_QUERY).matches
    );
    this.setTheme(config.theme ?? DEFAULT_SCENE_THEME);
    this.group = new THREE.Group();
    this.group.name = 'radial-wave-disk-root';

    const geometry = new THREE.BoxGeometry(0.095, 1, 0.12);
    const barMaterial = new THREE.MeshBasicMaterial({
      // Instance colors are supplied via setColorAt; vertexColors=true without a geometry
      // color attribute can render black on some WebGL paths. Keep the base material white.
      color: '#ffffff',
      vertexColors: false,
      transparent: true,
      opacity: 1,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    });
    this.bars = new THREE.InstancedMesh(geometry, barMaterial, BAR_COUNT);
    this.bars.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.bars.frustumCulled = false;
    this.bars.count = barCountForQuality(this.quality);
    this.group.add(this.bars);
    this.applyBarColors();

    this.core = new THREE.Mesh(
      new THREE.SphereGeometry(0.8, 32, 24),
      new THREE.MeshBasicMaterial({ color: '#00c9d6', transparent: true, opacity: 0.94, toneMapped: false }),
    );
    this.group.add(this.core);

    const innerMaterial = new THREE.MeshBasicMaterial({ color: this.colors[0], transparent: true, opacity: 0.96, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
    const outerMaterial = new THREE.MeshBasicMaterial({ color: this.colors[2], transparent: true, opacity: 0.82, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
    const innerRing = new THREE.Mesh(new THREE.TorusGeometry(INNER_RADIUS, 0.028, 8, 180), innerMaterial);
    const outerRing = new THREE.Mesh(new THREE.TorusGeometry(INNER_RADIUS + 0.43, 0.02, 6, 180), outerMaterial);
    this.innerRing = innerRing;
    this.outerRing = outerRing;
    this.ringMaterials = [innerMaterial, outerMaterial];
    this.group.add(innerRing, outerRing);

    const points: number[] = [];
    const starCount = 280;
    for (let index = 0; index < starCount; index += 1) {
      const a = ((index * 137.507764) % 360) * Math.PI / 180;
      const radius = 3.8 + (((index * 73 + 19) % 997) / 997) * 4.9;
      const z = (((index * 43 + 7) % 101) / 100 - 0.5) * 1.7;
      points.push(Math.cos(a) * radius, Math.sin(a) * radius, z);
    }
    const starGeometry = new THREE.BufferGeometry();
    starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
    const starMaterial = new THREE.PointsMaterial({
      color: '#b8c9ff',
      size: 0.038,
      transparent: true,
      opacity: 0.82,
      sizeAttenuation: true,
    });
    this.stars = new THREE.Points(starGeometry, starMaterial);
    this.group.add(this.stars);

    context.scene.add(this.group);
  }

  update(audioFrame: AudioFrame, params: ParamFrame, dt: number): void {
    if (this.disposed || this.bars === null) return;
    this.elapsed += dt;
    const scale = Math.max(0, Math.min(2, params.meshScale ?? 1));
    const rotationSpeed = Math.max(0, Math.min(2, params.rotationSpeed ?? 0.18));
    const motionScale = this.reducedMotion ? 0.12 : 1;
    const activeBars = barCountForQuality(this.quality);
    this.bars.count = activeBars;

    for (let index = 0; index < activeBars; index += 1) {
      const progress = index / Math.max(1, activeBars - 1);
      const angle = progress * Math.PI * 2;
      const spectrumValue = sampleSpectrum(audioFrame.spectrum, 0.04 + progress * 0.9);
      const lowFrequencyBias = 0.12 + (0.25 + (Math.sin(angle * 3 + 0.4) * 0.5 + 0.5) * 0.35) * audioFrame.bass;
      const midPulse = audioFrame.mid * (0.2 + 0.13 * Math.sin(angle * 5 + this.elapsed * 1.5));
      // Keep quiet passages visible while giving energetic tracks a clearly larger radial response.
      const length = Math.max(0.22, (0.24 + spectrumValue * 1.9 + lowFrequencyBias + midPulse) * scale);
      this.dummy.position.set(
        Math.cos(angle) * (INNER_RADIUS + length / 2),
        Math.sin(angle) * (INNER_RADIUS + length / 2),
        Math.sin(this.elapsed * 0.6 + angle * 2) * 0.035 * motionScale,
      );
      this.dummy.rotation.set(0, 0, angle - Math.PI / 2);
      this.dummy.scale.set(1, length, 1);
      this.dummy.updateMatrix();
      this.bars.setMatrixAt(index, this.dummy.matrix);
    }
    this.bars.instanceMatrix.needsUpdate = true;

    const breathe = 1 + audioFrame.level * 0.11 + audioFrame.bass * 0.08;
    this.core?.scale.setScalar(breathe);
    if (this.innerRing !== null) this.innerRing.rotation.z += dt * rotationSpeed * 0.65 * motionScale;
    if (this.outerRing !== null) this.outerRing.rotation.z -= dt * rotationSpeed * 0.32 * motionScale;
    if (this.stars !== null) this.stars.rotation.z += dt * 0.012 * motionScale;
    this.group.rotation.z = Math.sin(this.elapsed * 0.17) * 0.025 * motionScale;

    if (this.core !== null && this.core.material instanceof THREE.MeshBasicMaterial) {
      const dimAmount = Math.max(0.12, 0.34 - audioFrame.level * 0.2 - audioFrame.bass * 0.08);
      this.core.material.color.copy(this.coreThemeColor).lerp(this.coreDarkColor, dimAmount);
    }
  }

  render(): void {
    if (this.context !== null && !this.disposed) {
      this.context.renderer.render(this.context.scene, this.context.camera);
    }
  }

  setTheme(theme: SceneTheme): void {
    this.colors = theme.colors;
    this.coreThemeColor.set(this.colors[0]);
    if (this.bars !== null) this.applyBarColors();
    if (this.ringMaterials.length > 0) {
      this.ringMaterials[0]?.color.set(this.colors[0]);
      this.ringMaterials[1]?.color.set(this.colors[2]);
    }
  }

  setQuality(tier: QualityTier): void {
    this.quality = tier;
    if (this.bars !== null) this.bars.count = barCountForQuality(tier);
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    if (this.context !== null) this.context.scene.remove(this.group);
    this.group.traverse((object) => {
      if (object instanceof THREE.Mesh || object instanceof THREE.Points) {
        object.geometry.dispose();
        const material = object.material;
        if (Array.isArray(material)) material.forEach((item) => item.dispose());
        else material.dispose();
      }
    });
    this.context = null;
    this.bars = null;
    this.core = null;
    this.innerRing = null;
    this.outerRing = null;
    this.ringMaterials = [];
    this.stars = null;
  }

  private applyBarColors(): void {
    if (this.bars === null) return;
    const start = new THREE.Color(this.colors[0]);
    const middle = new THREE.Color(this.colors[1]);
    const end = new THREE.Color(this.colors[2]);
    const color = new THREE.Color();
    for (let index = 0; index < BAR_COUNT; index += 1) {
      const progress = index / Math.max(1, BAR_COUNT - 1);
      if (progress < 0.5) color.lerpColors(start, middle, progress * 2);
      else color.lerpColors(middle, end, (progress - 0.5) * 2);
      this.bars.setColorAt(index, color);
    }
    if (this.bars.instanceColor !== null) this.bars.instanceColor.needsUpdate = true;
  }
}
