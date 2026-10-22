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

export class LiquidOrbScene implements Scene {
  readonly id = 'liquid-orb';
  readonly name = 'Liquid Orb';

  private context: RenderContext | null = null;
  private geometry: THREE.IcosahedronGeometry | null = null;
  private initialPositions: Float32Array<ArrayBuffer> | null = null;
  private colorsBuffer: Float32Array<ArrayBuffer> | null = null;
  private orbFill: THREE.Mesh<THREE.IcosahedronGeometry, THREE.MeshBasicMaterial> | null = null;
  private orb: THREE.Mesh<THREE.IcosahedronGeometry, THREE.MeshBasicMaterial> | null = null;
  private particles: THREE.Points<THREE.IcosahedronGeometry, THREE.PointsMaterial> | null = null;
  private innerCore: THREE.Mesh | null = null;
  private orbitRings: THREE.Mesh<THREE.TorusGeometry, THREE.MeshBasicMaterial>[] = [];
  private fillMaterial: THREE.MeshBasicMaterial | null = null;
  private material: THREE.MeshBasicMaterial | null = null;
  private pointMaterial: THREE.PointsMaterial | null = null;
  private colors: readonly [string, string, string] = DEFAULT_SCENE_THEME.colors;
  private quality: QualityTier = 'high';
  private elapsed = 0;
  private disposed = false;

  getParamSchema(): readonly SceneParamDescriptor[] {
    return [
      { key: 'meshScale', label: 'Orb scale', min: 0, max: 2, defaultValue: 1 },
      { key: 'colorFlash', label: 'Energy shimmer', min: 0, max: 2, defaultValue: 0.4 },
    ];
  }

  init(context: RenderContext, config: ScenePresetConfig): void {
    if (this.context !== null) this.dispose();
    this.context = context;
    this.disposed = false;
    this.quality = config.quality ?? 'high';
    this.setTheme(config.theme ?? DEFAULT_SCENE_THEME);

    const geometry = new THREE.IcosahedronGeometry(1.65, 5);
    const position = geometry.getAttribute('position') as THREE.BufferAttribute;
    this.initialPositions = new Float32Array(position.array as Float32Array);
    this.colorsBuffer = new Float32Array(position.count * 3);
    const color = new THREE.Color();
    const start = new THREE.Color(this.colors[0]);
    const middle = new THREE.Color(this.colors[1]);
    const end = new THREE.Color(this.colors[2]);
    for (let index = 0; index < position.count; index += 1) {
      const x = this.initialPositions[index * 3] ?? 0;
      const y = this.initialPositions[index * 3 + 1] ?? 0;
      const z = this.initialPositions[index * 3 + 2] ?? 0;
      const progress = (Math.atan2(y, x) + Math.PI) / (Math.PI * 2);
      if (progress < 0.5) color.lerpColors(start, middle, progress * 2);
      else color.lerpColors(middle, end, (progress - 0.5) * 2);
      this.colorsBuffer[index * 3] = color.r;
      this.colorsBuffer[index * 3 + 1] = color.g;
      this.colorsBuffer[index * 3 + 2] = color.b;
      // Keep source z referenced here so all vertex coordinates are initialized deterministically.
      void z;
    }
    geometry.setAttribute('color', new THREE.BufferAttribute(this.colorsBuffer, 3).setUsage(THREE.DynamicDrawUsage));
    this.geometry = geometry;

    this.fillMaterial = new THREE.MeshBasicMaterial({
      vertexColors: true,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.16,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    });
    this.material = new THREE.MeshBasicMaterial({
      vertexColors: true,
      wireframe: true,
      transparent: true,
      opacity: 0.96,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    });
    this.pointMaterial = new THREE.PointsMaterial({
      color: this.colors[2],
      size: 0.035,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
      toneMapped: false,
    });
    this.orbFill = new THREE.Mesh(geometry, this.fillMaterial);
    this.orb = new THREE.Mesh(geometry, this.material);
    this.particles = new THREE.Points(geometry, this.pointMaterial);
    this.orbFill.frustumCulled = false;
    this.orb.frustumCulled = false;
    this.particles.frustumCulled = false;
    this.orbFill.renderOrder = 0;
    this.orb.renderOrder = 1;
    this.particles.renderOrder = 2;
    context.scene.add(this.orbFill, this.orb, this.particles);

    for (let index = 0; index < 3; index += 1) {
      const ringMaterial = new THREE.MeshBasicMaterial({
        color: index === 1 ? this.colors[2] : this.colors[0],
        transparent: true,
        opacity: index === 1 ? 0.2 : 0.12,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      });
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(2.02 + index * 0.19, index === 1 ? 0.012 : 0.008, 6, 144),
        ringMaterial,
      );
      ring.rotation.set(0.55 + index * 0.51, 0.2 + index * 0.63, index * 0.38);
      ring.renderOrder = 3;
      ring.frustumCulled = false;
      this.orbitRings.push(ring);
      context.scene.add(ring);
    }

    this.innerCore = new THREE.Mesh(
      new THREE.SphereGeometry(0.55, 32, 20),
      new THREE.MeshBasicMaterial({ color: this.colors[1], transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending, toneMapped: false }),
    );
    context.scene.add(this.innerCore);
    this.setQuality(this.quality);
  }

  update(frame: AudioFrame, params: ParamFrame, dt: number): void {
    if (this.disposed || this.geometry === null || this.initialPositions === null) return;
    this.elapsed += dt;
    const position = this.geometry.getAttribute('position') as THREE.BufferAttribute;
    const values = position.array as Float32Array;
    const scale = Math.max(0, Math.min(2, params.meshScale ?? 1));
    const bass = visualEnergy(frame.bass, 1.6, 0.72);
    const treble = visualEnergy(frame.treble, 1.65, 0.68);
    const spectrum = frame.spectrum;
    for (let index = 0; index < position.count; index += 1) {
      const sourceX = this.initialPositions[index * 3] ?? 0;
      const sourceY = this.initialPositions[index * 3 + 1] ?? 0;
      const sourceZ = this.initialPositions[index * 3 + 2] ?? 0;
      const length = Math.max(0.0001, Math.hypot(sourceX, sourceY, sourceZ));
      const nx = sourceX / length;
      const ny = sourceY / length;
      const nz = sourceZ / length;
      const frequencyPosition = (Math.atan2(ny, nx) + Math.PI) / (Math.PI * 2);
      const magnitude = sampleSpectrum(spectrum, frequencyPosition);
      const slowWave = Math.sin(this.elapsed * 1.25 + nz * 5.2 + nx * 2.5);
      const ripple = magnitude * 0.62 + bass * (0.25 + Math.abs(slowWave) * 0.22)
        + treble * slowWave * 0.12 + frame.level * 0.08;
      const radius = (length + ripple) * scale;
      const offset = index * 3;
      values[offset] = nx * radius;
      values[offset + 1] = ny * radius;
      values[offset + 2] = nz * radius;
    }
    position.needsUpdate = true;
    this.geometry.computeVertexNormals();
    this.orb!.rotation.y += dt * (0.18 + frame.mid * 0.7);
    this.orb!.rotation.x = Math.sin(this.elapsed * 0.23) * (0.11 + frame.treble * 0.12);
    this.orb!.rotation.z = Math.sin(this.elapsed * 0.35) * 0.09;
    this.orbFill!.rotation.copy(this.orb!.rotation);
    this.particles!.rotation.copy(this.orb!.rotation);
    this.orbitRings.forEach((ring, index) => {
      ring.rotation.x += dt * (index % 2 === 0 ? 0.045 : -0.035);
      ring.rotation.z += dt * (index === 1 ? -0.07 : 0.045);
      ring.scale.setScalar(1 + bass * (0.035 + index * 0.012) + frame.level * 0.018);
    });
    this.innerCore?.scale.setScalar(1 + bass * 0.6 + frame.level * 0.4);
  }

  render(): void {
    if (this.context !== null && !this.disposed) this.context.renderer.render(this.context.scene, this.context.camera);
  }

  setTheme(theme: SceneTheme): void {
    this.colors = theme.colors;
    if (this.pointMaterial !== null) this.pointMaterial.color.set(this.colors[2]);
    this.orbitRings.forEach((ring, index) => {
      ring.material.color.set(index === 1 ? this.colors[2] : this.colors[0]);
    });
    if (this.innerCore?.material instanceof THREE.MeshBasicMaterial) this.innerCore.material.color.set(this.colors[1]);
    if (this.geometry !== null && this.initialPositions !== null) {
      const start = new THREE.Color(this.colors[0]);
      const middle = new THREE.Color(this.colors[1]);
      const end = new THREE.Color(this.colors[2]);
      const attribute = this.geometry.getAttribute('color') as THREE.BufferAttribute;
      const color = new THREE.Color();
      for (let index = 0; index < attribute.count; index += 1) {
        const x = this.initialPositions[index * 3] ?? 0;
        const y = this.initialPositions[index * 3 + 1] ?? 0;
        const progress = (Math.atan2(y, x) + Math.PI) / (Math.PI * 2);
        if (progress < 0.5) color.lerpColors(start, middle, progress * 2);
        else color.lerpColors(middle, end, (progress - 0.5) * 2);
        attribute.setXYZ(index, color.r, color.g, color.b);
      }
      attribute.needsUpdate = true;
    }
  }

  setQuality(tier: QualityTier): void {
    this.quality = tier;
    if (this.particles !== null) this.particles.visible = tier !== 'low';
    this.orbitRings.forEach((ring, index) => {
      ring.visible = tier !== 'low' || index === 1;
    });
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    if (this.context !== null) {
      if (this.orbFill !== null) this.context.scene.remove(this.orbFill);
      if (this.orb !== null) this.context.scene.remove(this.orb);
      if (this.particles !== null) this.context.scene.remove(this.particles);
      if (this.innerCore !== null) this.context.scene.remove(this.innerCore);
      this.orbitRings.forEach((ring) => this.context?.scene.remove(ring));
    }
    this.geometry?.dispose();
    this.fillMaterial?.dispose();
    this.material?.dispose();
    this.pointMaterial?.dispose();
    this.orbitRings.forEach((ring) => {
      ring.geometry.dispose();
      ring.material.dispose();
    });
    this.orbitRings = [];
    if (this.innerCore !== null) {
      this.innerCore.geometry.dispose();
      if (this.innerCore.material instanceof THREE.Material) this.innerCore.material.dispose();
    }
    this.context = null;
    this.geometry = null;
    this.initialPositions = null;
    this.colorsBuffer = null;
    this.orbFill = null;
    this.orb = null;
    this.particles = null;
    this.innerCore = null;
    this.fillMaterial = null;
    this.material = null;
    this.pointMaterial = null;
  }
}
