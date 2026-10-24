import { afterEach, describe, expect, it } from 'vitest';
import {
  getCameraPreferences,
  getSceneCameraProfile,
  resetSceneCameraProfile,
  setCameraPreferences,
  setSceneCameraProfile,
} from '../../apps/web/src/engine/scenes/camera-profile-store';

afterEach(() => {
  resetSceneCameraProfile('radial-wave-disk');
  resetSceneCameraProfile('particle-vortex');
  setCameraPreferences({ sensitivity: 1, enabled: { rotate: true, pan: true, zoom: true } });
});

describe('per-scene camera profiles', () => {
  it('keeps camera pose, roll and object rotation isolated between scenes', () => {
    const radial = getSceneCameraProfile('radial-wave-disk');
    setSceneCameraProfile('radial-wave-disk', {
      ...radial,
      preset: 'side',
      position: { x: 10.3, y: 0, z: 0 },
      rollDegrees: 45,
      objectRotationDegrees: { x: 90, y: 0, z: 0 },
    });

    expect(getSceneCameraProfile('radial-wave-disk')).toMatchObject({
      preset: 'side',
      position: { x: 10.3, y: 0, z: 0 },
      rollDegrees: 45,
      objectRotationDegrees: { x: 90, y: 0, z: 0 },
    });
    expect(getSceneCameraProfile('particle-vortex')).toMatchObject({
      preset: 'front',
      position: { x: 0, y: 0, z: 10.3 },
      rollDegrees: 0,
      objectRotationDegrees: { x: 0, y: 0, z: 0 },
    });
  });

  it('resets only the specified scene profile', () => {
    const particle = getSceneCameraProfile('particle-vortex');
    setSceneCameraProfile('radial-wave-disk', {
      ...getSceneCameraProfile('radial-wave-disk'),
      preset: 'cinematic',
    });
    setSceneCameraProfile('particle-vortex', {
      ...particle,
      preset: 'top',
      objectRotationDegrees: { x: 0, y: 0, z: 70 },
    });

    resetSceneCameraProfile('radial-wave-disk');
    expect(getSceneCameraProfile('radial-wave-disk')).toMatchObject({ preset: 'front', rollDegrees: 0 });
    expect(getSceneCameraProfile('particle-vortex')).toMatchObject({
      preset: 'top',
      objectRotationDegrees: { z: 70 },
    });
  });

  it('persists interaction sensitivity and toggles as global preferences', () => {
    setCameraPreferences({ sensitivity: 1.6, enabled: { rotate: false, pan: true, zoom: false } });
    expect(getCameraPreferences()).toMatchObject({
      sensitivity: 1.6,
      enabled: { rotate: false, pan: true, zoom: false },
    });
  });
});
