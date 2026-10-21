import type { Scene } from './scene';
import { RadialWaveDiskScene } from './radial-wave-disk';
import { ParticleVortexScene } from './particle-vortex';
import { SynthwaveTunnelScene } from './synthwave-tunnel';
import { WaveformScopeScene } from './waveform-scope';
import { SpectrogramWaterfallScene } from './spectrogram-waterfall';
import { KaleidoscopeMandalaScene } from './kaleidoscope-mandala';
import { LiquidOrbScene } from './liquid-orb';

export type SceneId =
  | 'radial-wave-disk'
  | 'particle-vortex'
  | 'synthwave-tunnel'
  | 'waveform-scope'
  | 'spectrogram-waterfall'
  | 'kaleidoscope-mandala'
  | 'liquid-orb';

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
  { id: 'waveform-scope', number: '04', name: 'Oscilloscope Ribbon', tag: 'WAVEFORM', className: 'scene-thumb--waveform' },
  { id: 'spectrogram-waterfall', number: '05', name: 'Spectrogram Waterfall', tag: 'FREQUENCY HISTORY', className: 'scene-thumb--spectrogram' },
  { id: 'kaleidoscope-mandala', number: '06', name: 'Kaleidoscope Mandala', tag: 'SYMMETRY', className: 'scene-thumb--mandala' },
  { id: 'liquid-orb', number: '07', name: 'Liquid Orb', tag: 'ORGANIC MESH', className: 'scene-thumb--liquid' },
];

export function createScene(id: SceneId): Scene {
  switch (id) {
    case 'radial-wave-disk': return new RadialWaveDiskScene();
    case 'particle-vortex': return new ParticleVortexScene();
    case 'synthwave-tunnel': return new SynthwaveTunnelScene();
    case 'waveform-scope': return new WaveformScopeScene();
    case 'spectrogram-waterfall': return new SpectrogramWaterfallScene();
    case 'kaleidoscope-mandala': return new KaleidoscopeMandalaScene();
    case 'liquid-orb': return new LiquidOrbScene();
  }
}
