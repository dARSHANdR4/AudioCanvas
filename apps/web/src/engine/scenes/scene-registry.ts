import type { Scene } from './scene';
import { RadialWaveDiskScene } from './radial-wave-disk';
import { ParticleVortexScene } from './particle-vortex';
import { SynthwaveTunnelScene } from './synthwave-tunnel';

export type SceneId = 'radial-wave-disk' | 'particle-vortex' | 'synthwave-tunnel';

export const SCENE_OPTIONS: readonly {
  id: SceneId;
  number: string;
  name: string;
  tag: string;
  className: string;
}[] = [
  { id: 'radial-wave-disk', number: '01', name: 'Radial Wave Disk', tag: 'SPECTRUM', className: 'scene-thumb--radial' },
  { id: 'particle-vortex', number: '02', name: 'Particle Vortex', tag: 'PARTICLES', className: 'scene-thumb--vortex' },
  { id: 'synthwave-tunnel', number: '03', name: 'Synthwave Tunnel', tag: 'PERSPECTIVE', className: 'scene-thumb--tunnel' },
];

export function createScene(id: SceneId): Scene {
  switch (id) {
    case 'radial-wave-disk':
      return new RadialWaveDiskScene();
    case 'particle-vortex':
      return new ParticleVortexScene();
    case 'synthwave-tunnel':
      return new SynthwaveTunnelScene();
  }
}
