export type CameraPreset = 'front' | 'side' | 'top' | 'low-angle' | 'cinematic';
export type CameraToggle = 'rotate' | 'pan' | 'zoom';
export type ObjectAxis = 'x' | 'y' | 'z';

export interface CameraProfileSnapshot {
  preset: CameraPreset | 'custom';
  position: { x: number; y: number; z: number };
  target: { x: number; y: number; z: number };
  up: { x: number; y: number; z: number };
  rollDegrees: number;
  objectRotationDegrees: Record<ObjectAxis, number>;
}

export type CameraCommand =
  | { type: 'restore-profile'; profile: CameraProfileSnapshot }
  | { type: 'preset'; preset: CameraPreset }
  | { type: 'reset' }
  | { type: 'roll'; degrees: number }
  | { type: 'axis'; axis: ObjectAxis; degrees: number }
  | { type: 'sensitivity'; value: number }
  | { type: 'toggle'; control: CameraToggle; enabled: boolean };

type CameraCommandListener = (command: CameraCommand) => void;

const listeners = new Set<CameraCommandListener>();

/** Sends UI intent to the renderer without putting per-frame camera state in React. */
export function dispatchCameraCommand(command: CameraCommand): void {
  listeners.forEach((listener) => listener(command));
}

export function subscribeToCameraCommands(listener: CameraCommandListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
