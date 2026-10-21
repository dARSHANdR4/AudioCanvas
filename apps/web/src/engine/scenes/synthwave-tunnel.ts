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

const RING_COUNT = 42;
const SEGMENTS_PER_RING = 72;
const TUNNEL_DEPTH = 27;
const TUNNEL_NEAR_Z = 2;

const VERTEX_SHADER = `
uniform float uTime;
uniform float uBass;
uniform float uMid;
uniform float uTreble;
attribute vec3 color;
varying vec3 vColor;
varying float vGlow;
void main() {
  vec3 animated = position;
  float ripple = sin(uTime * 1.1 + position.z * 0.25);
  float pulse = 1.0 + uBass * 0.085 + uTreble * sin(uTime * 2.7 + position.z * 0.5) * 0.035;
  animated.xy *= pulse;
  animated.xy += vec2(sin(uTime * 0.22 + position.z * 0.08), cos(uTime * 0.18 + position.z * 0.07)) * (uMid * 0.035);
  animated.z += ripple * 0.04;
  vec4 viewPosition = modelViewMatrix * vec4(animated, 1.0);
  gl_Position = projectionMatrix * viewPosition;
  vColor = color;
  vGlow = 0.78 + uBass * 0.5 + uTreble * 0.36;
}
`;

const FRAGMENT_SHADER = `
varying vec3 vColor;
varying float vGlow;
void main() {
  gl_FragColor = vec4(vColor * vGlow, 0.9);
}
`;

function drawFractionForQuality(tier: QualityTier): number {
  if (tier === 'low') return 0.46;
  if (tier === 'medium') return 0.76;
  return 1;
}

/** Neon wireframe tunnel whose ring depth, pulse and palette react to the shared audio frame. */
export class SynthwaveTunnelScene implements Scene {
  readonly id = 'synthwave-tunnel';
  readonly name = 'Synthwave Tunnel';

  private context: RenderContext | null = null;
  private geometry: THREE.BufferGeometry | null = null;
  private material: THREE.ShaderMaterial | null = null;
  private lines: THREE.LineSegments<THREE.BufferGeometry, THREE.ShaderMaterial> | null = null;
  private colors: readonly [string, string, string] = DEFAULT_SCENE_THEME.colors;
  private colorMixes: Float32Array<ArrayBuffer> | null = null;
  private quality: QualityTier = 'high';
  private elapsed = 0;
  private disposed = false;

  getParamSchema(): readonly SceneParamDescriptor[] {
    return [
      { key: 'tunnelSpeed', label: 'Tunnel speed', min: 0, max: 2, defaultValue: 1 },
      { key: 'cameraShake', label: 'Camera movement', min: 0, max: 2, defaultValue: 0 },
    ];
  }

  init(context: RenderContext, config: ScenePresetConfig): void {
    if (this.context !== null) this.dispose();
    this.context = context;
    this.disposed = false;
    this.elapsed = 0;
    this.quality = config.quality ?? 'high';
    this.setTheme(config.theme ?? DEFAULT_SCENE_THEME);

    const positions: number[] = [];
    const depthMixes: number[] = [];
    const addSegment = (ax: number, ay: number, az: number, bx: number, by: number, bz: number, mix: number) => {
      positions.push(ax, ay, az, bx, by, bz);
      depthMixes.push(mix, mix);
    };

    const pointsAt = (ring: number, segment: number): [number, number, number] => {
      const progress = ring / (RING_COUNT - 1);
      const angle = (segment / SEGMENTS_PER_RING) * Math.PI * 2;
      const radius = 0.24 + (1 - progress) * 5.15;
      const z = TUNNEL_NEAR_Z - progress * TUNNEL_DEPTH;
      return [Math.cos(angle) * radius, Math.sin(angle) * radius, z];
    };

    for (let ring = 0; ring < RING_COUNT; ring += 1) {
      const depth = ring / (RING_COUNT - 1);
      for (let segment = 0; segment < SEGMENTS_PER_RING; segment += 1) {
        const a = pointsAt(ring, segment);
        const b = pointsAt(ring, (segment + 1) % SEGMENTS_PER_RING);
        addSegment(a[0], a[1], a[2], b[0], b[1], b[2], depth);
      }
    }

    for (let segment = 0; segment < SEGMENTS_PER_RING; segment += 3) {
      for (let ring = 0; ring < RING_COUNT - 1; ring += 1) {
        const a = pointsAt(ring, segment);
        const b = pointsAt(ring + 1, segment);
        const depth = (ring + 0.5) / (RING_COUNT - 1);
        addSegment(a[0], a[1], a[2], b[0], b[1], b[2], depth);
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(depthMixes.length * 3), 3));
    this.colorMixes = new Float32Array(depthMixes);
    this.geometry = geometry;
    this.setQuality(this.quality);

    const material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uBass: { value: 0 },
        uMid: { value: 0 },
        uTreble: { value: 0 },
      },
      vertexShader: VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER,
      // The custom shader declares the color attribute explicitly, so no built-in vertex-color prefix is needed.
      vertexColors: false,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    });
    this.material = material;
    this.lines = new THREE.LineSegments(geometry, material);
    this.lines.frustumCulled = false;
    this.lines.name = 'synthwave-tunnel-lines';
    context.scene.add(this.lines);
    this.setTheme(this.colorsToTheme());
  }

  update(audioFrame: AudioFrame, params: ParamFrame, dt: number): void {
    if (this.disposed || this.material === null || this.lines === null) return;
    const speed = Math.max(0, Math.min(2, params.tunnelSpeed ?? 1));
    this.elapsed += dt * (0.55 + speed * 0.65 + audioFrame.level * 0.25);
    this.material.uniforms.uTime.value = this.elapsed;
    this.material.uniforms.uBass.value = audioFrame.bass;
    this.material.uniforms.uMid.value = audioFrame.mid;
    this.material.uniforms.uTreble.value = audioFrame.treble;
    this.lines.rotation.z = Math.sin(this.elapsed * 0.12) * 0.035;
    this.lines.scale.setScalar(1 + audioFrame.bass * 0.035);
  }

  render(): void {
    if (this.context !== null && !this.disposed) {
      this.context.renderer.render(this.context.scene, this.context.camera);
    }
  }

  setTheme(theme: SceneTheme): void {
    this.colors = theme.colors;
    if (this.geometry === null || this.colorMixes === null) return;
    const attribute = this.geometry.getAttribute('color') as THREE.BufferAttribute;
    const start = new THREE.Color(this.colors[0]);
    const middle = new THREE.Color(this.colors[1]);
    const end = new THREE.Color(this.colors[2]);
    const color = new THREE.Color();
    for (let index = 0; index < this.colorMixes.length; index += 1) {
      const depth = this.colorMixes[index] ?? 0;
      if (depth < 0.5) color.lerpColors(start, middle, depth * 2);
      else color.lerpColors(middle, end, (depth - 0.5) * 2);
      attribute.setXYZ(index, color.r, color.g, color.b);
    }
    attribute.needsUpdate = true;
  }

  setQuality(tier: QualityTier): void {
    this.quality = tier;
    if (this.geometry !== null) {
      const positions = this.geometry.getAttribute('position');
      this.geometry.setDrawRange(0, Math.floor(positions.count * drawFractionForQuality(tier)));
    }
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    if (this.context !== null && this.lines !== null) this.context.scene.remove(this.lines);
    this.geometry?.dispose();
    this.material?.dispose();
    this.context = null;
    this.geometry = null;
    this.material = null;
    this.lines = null;
    this.colorMixes = null;
  }

  private colorsToTheme(): SceneTheme {
    return { id: 'current', colors: this.colors };
  }
}
