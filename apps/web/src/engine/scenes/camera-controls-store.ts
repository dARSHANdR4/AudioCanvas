export type CameraPreset = 'front' | 'side' | 'top' | 'low-angle' | 'cinematic';
export type CameraToggle = 'rotate' | 'pan' | 'zoom';
export type ObjectAxis = 'x' | 'y' | 'z';

export type CameraCommand =
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
