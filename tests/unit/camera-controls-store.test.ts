import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  dispatchCameraCommand,
  subscribeToCameraCommands,
} from '../../apps/web/src/engine/scenes/camera-controls-store';

describe('camera control command bridge', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('delivers camera commands to active renderer subscribers', () => {
    const listener = vi.fn();
    const unsubscribe = subscribeToCameraCommands(listener);

    dispatchCameraCommand({ type: 'preset', preset: 'cinematic' });
    dispatchCameraCommand({ type: 'roll', degrees: 35 });

    expect(listener).toHaveBeenNthCalledWith(1, { type: 'preset', preset: 'cinematic' });
    expect(listener).toHaveBeenNthCalledWith(2, { type: 'roll', degrees: 35 });
    unsubscribe();
  });

  it('stops delivering commands after the subscriber is removed', () => {
    const listener = vi.fn();
    const unsubscribe = subscribeToCameraCommands(listener);

    unsubscribe();
    dispatchCameraCommand({ type: 'reset' });

    expect(listener).not.toHaveBeenCalled();
  });
});
