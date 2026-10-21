import type { AudioFrame } from './analysis';

// One mutable bridge between audio analysis and the renderer. Audio samples are deliberately
// not copied into React state, so the render loop can read the newest frame without re-rendering UI.
let latestAudioFrame: AudioFrame | null = null;

export function publishAudioFrame(frame: AudioFrame | null): void {
  latestAudioFrame = frame;
}

export function readLatestAudioFrame(): AudioFrame | null {
  return latestAudioFrame;
}
