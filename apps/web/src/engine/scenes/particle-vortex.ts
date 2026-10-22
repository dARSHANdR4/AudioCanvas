import * as THREE from 'three';
import type { AudioFrame } from '../audio/analysis';
import { updateBeatEnvelope, visualEnergy } from './visual-response';
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

const MAX_PARTICLES = 100_000;

function particlesForQuality(tier: QualityTier): number {
  if (tier === 'low') return 25_000;
  if (tier === 'medium') return 60_000;
  return MAX_PARTICLES;
}

const VERTEX_SHADER = `
attribute vec3 iPosition;
attribute float iSize;
attribute float iPhase;
uniform float uTime;
uniform float uBass;
uniform float uMid;
uniform float uTreble;
uniform float uLevel;
uniform float uTurbulence;
uniform float uPointSize;
uniform vec3 uColorA;
uniform vec3 uColorB;
uniform vec3 uColorC;
varying vec2 vUv;
varying vec3 vColor;
varying float vAlpha;
void main() {
  float baseAngle = atan(iPosition.y, iPosition.x);
  float baseRadius = length(iPosition.xy);
  float depthPhase = iPosition.z * 0.24;

  // Radius-dependent rotation creates a curling arm rather than a flat rotating disc.
  float inwardCurl = 2.35 / (baseRadius + 0.62);
  float angle = baseAngle
    + uTime * (0.28 + uMid * 1.5)
    + inwardCurl * (0.78 + uTurbulence * 0.22)
    + iPhase * (0.08 + 0.13 * uTurbulence);

  float armWave = sin(baseAngle * 3.0 - uTime * 0.85 + depthPhase);
  float radius = baseRadius
    + sin(uTime * 1.35 + iPhase * 3.1 + depthPhase) * (0.10 + uTurbulence * 0.24)
    + armWave * (0.06 + uMid * 0.16)
    + uBass * (0.28 + 0.42 * sin(iPhase * 4.0));

  vec3 animatedPosition = vec3(cos(angle) * radius, sin(angle) * radius, iPosition.z);
  animatedPosition.z += sin(angle * 1.7 + iPhase * 1.4 + uTime * 0.72)
    * (0.22 + uTreble * 0.72 + uTurbulence * 0.08);
  animatedPosition.z += sin(baseRadius * 1.45 - uTime * 1.4 + iPhase) * (0.08 + uMid * 0.14);
  animatedPosition.xy *= 1.0 + uLevel * 0.12 + uBass * 0.12;

  vec4 viewPosition = modelViewMatrix * vec4(animatedPosition, 1.0);
  float billboardSize = (0.034 + iSize * 0.044 + uTreble * 0.046) * (1.0 + uLevel * 0.28);
  viewPosition.xy += position.xy * billboardSize;
  gl_Position = projectionMatrix * viewPosition;
  vUv = uv;

  float flow = clamp(0.5 + 0.5 * sin(angle * 1.15 + depthPhase * 2.0 + uTime * 0.24), 0.0, 1.0);
  vColor = mix(uColorA, uColorB, flow);
  float edgeEnergy = smoothstep(0.3, 4.2, baseRadius);
  vColor = mix(vColor, uColorC, clamp(edgeEnergy * 0.55 + uTreble * 0.18, 0.0, 0.85));
  vColor = mix(vColor, uColorC, clamp(uBass * 0.62, 0.0, 0.72));
  vAlpha = 0.68 + uLevel * 0.32 + uTreble * 0.3;
}
`;

const FRAGMENT_SHADER = `
varying vec2 vUv;
varying vec3 vColor;
varying float vAlpha;
void main() {
  float distanceFromCenter = length(vUv - vec2(0.5));
  float softDisc = 1.0 - smoothstep(0.18, 0.50, distanceFromCenter);
  if (softDisc < 0.025) discard;
  gl_FragColor = vec4(vColor, softDisc * vAlpha);
}
`;

/** GPU-driven instanced particle vortex: positions animate in the vertex shader, not on the CPU. */
export class ParticleVortexScene implements Scene {
  readonly id = 'particle-vortex';
  readonly name = 'Particle Vortex';

  private context: RenderContext | null = null;
  private particleGeometry: THREE.InstancedBufferGeometry | null = null;
  private particleMaterial: THREE.ShaderMaterial | null = null;
  private particles: THREE.Mesh<THREE.InstancedBufferGeometry, THREE.ShaderMaterial> | null = null;
  private colors: readonly [string, string, string] = DEFAULT_SCENE_THEME.colors;
  private quality: QualityTier = 'high';
  private elapsed = 0;
  private beatGlow = 0;
  private disposed = false;

  getParamSchema(): readonly SceneParamDescriptor[] {
    return [
      { key: 'particleTurbulence', label: 'Particle turbulence', min: 0, max: 2, defaultValue: 0.5 },
      { key: 'colorFlash', label: 'Color flash', min: 0, max: 2, defaultValue: 0 },
    ];
  }

  init(context: RenderContext, config: ScenePresetConfig): void {
    if (this.context !== null) this.dispose();
    this.context = context;
    this.disposed = false;
    this.elapsed = 0;
    this.quality = config.quality ?? 'high';
    this.setTheme(config.theme ?? DEFAULT_SCENE_THEME);

    const geometry = new THREE.InstancedBufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute([
      -0.5, -0.5, 0, 0.5, -0.5, 0, 0.5, 0.5, 0, -0.5, 0.5, 0,
    ], 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 1], 2));
    geometry.setIndex([0, 1, 2, 0, 2, 3]);

    const basePositions = new Float32Array(MAX_PARTICLES * 3);
    const sizes = new Float32Array(MAX_PARTICLES);
    const phases = new Float32Array(MAX_PARTICLES);
    const goldenAngle = Math.PI * (3 - Math.sqrt(5));
    for (let index = 0; index < MAX_PARTICLES; index += 1) {
      const normalized = (index + 0.5) / MAX_PARTICLES;
      const radius = 0.28 + Math.sqrt(normalized) * 4.7;
      const angle = index * goldenAngle;
      const offset = index * 3;
      basePositions[offset] = Math.cos(angle) * radius;
      basePositions[offset + 1] = Math.sin(angle) * radius;
      basePositions[offset + 2] = (((index * 37 + 11) % 1009) / 1009 - 0.5) * 6.4;
      sizes[index] = 0.25 + (((index * 73 + 19) % 997) / 997) * 1.75;
      phases[index] = normalized * Math.PI * 2 * 24;
    }

    geometry.setAttribute('iPosition', new THREE.InstancedBufferAttribute(basePositions, 3));
    geometry.setAttribute('iSize', new THREE.InstancedBufferAttribute(sizes, 1));
    geometry.setAttribute('iPhase', new THREE.InstancedBufferAttribute(phases, 1));
    geometry.instanceCount = particlesForQuality(this.quality);

    const material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uBass: { value: 0 },
        uMid: { value: 0 },
        uTreble: { value: 0 },
        uLevel: { value: 0 },
        uTurbulence: { value: 0.5 },
        uPointSize: { value: 1 },
        uColorA: { value: new THREE.Color(this.colors[0]) },
        uColorB: { value: new THREE.Color(this.colors[1]) },
        uColorC: { value: new THREE.Color(this.colors[2]) },
      },
      vertexShader: VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    });
    this.particleGeometry = geometry;
    this.particleMaterial = material;
    this.particles = new THREE.Mesh(geometry, material);
    this.particles.frustumCulled = false;
    this.particles.name = 'particle-vortex-100k';
    context.scene.add(this.particles);
    this.setTheme(this.colorsToTheme());
  }

  update(audioFrame: AudioFrame, params: ParamFrame, dt: number): void {
    if (this.disposed || this.particleMaterial === null) return;
    this.elapsed += dt;
    this.beatGlow = updateBeatEnvelope(this.beatGlow, audioFrame.beat, dt);
    const uniforms = this.particleMaterial.uniforms;
    uniforms.uTime.value = this.elapsed;
    uniforms.uBass.value = Math.max(visualEnergy(audioFrame.bass, 1.75, 0.7), this.beatGlow * 0.72);
    uniforms.uMid.value = visualEnergy(audioFrame.mid, 1.85, 0.7);
    uniforms.uTreble.value = visualEnergy(audioFrame.treble, 1.9, 0.68);
    uniforms.uLevel.value = Math.max(visualEnergy(audioFrame.level, 1.55, 0.78), this.beatGlow * 0.9);
    uniforms.uTurbulence.value = Math.max(0, Math.min(2, params.particleTurbulence ?? 0.5));
    uniforms.uPointSize.value = 1 + Math.max(0, Math.min(2, params.colorFlash ?? 0)) * 0.15;
  }

  render(): void {
    if (this.context !== null && !this.disposed) {
      this.context.renderer.render(this.context.scene, this.context.camera);
    }
  }

  setTheme(theme: SceneTheme): void {
    this.colors = theme.colors;
    if (this.particleMaterial !== null) {
      this.particleMaterial.uniforms.uColorA.value.set(this.colors[0]);
      this.particleMaterial.uniforms.uColorB.value.set(this.colors[1]);
      this.particleMaterial.uniforms.uColorC.value.set(this.colors[2]);
    }
  }

  setQuality(tier: QualityTier): void {
    this.quality = tier;
    if (this.particleGeometry !== null) {
      this.particleGeometry.instanceCount = particlesForQuality(tier);
    }
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    if (this.context !== null && this.particles !== null) this.context.scene.remove(this.particles);
    this.particleGeometry?.dispose();
    this.particleMaterial?.dispose();
    this.context = null;
    this.particleGeometry = null;
    this.particleMaterial = null;
    this.particles = null;
  }

  private colorsToTheme(): SceneTheme {
    return { id: 'current', colors: this.colors };
  }
}
