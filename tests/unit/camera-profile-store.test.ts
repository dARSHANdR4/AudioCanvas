import { afterEach, describe, expect, it } from 'vitest';
import {
  deleteNamedCameraComposition,
  getCameraPreferences,
  getSceneCameraCompositions,
  getSceneCameraProfile,
  resetSceneCameraProfile,
  saveNamedCameraComposition,
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

  it('saves immutable named snapshots for a single scene and can delete them', () => {
    const profile = getSceneCameraProfile('radial-wave-disk');
    const customProfile = {
      ...profile,
      preset: 'custom' as const,
      position: { x: 6.5, y: 2.25, z: 8.1 },
      target: { x: 0.4, y: -0.3, z: 0 },
      rollDegrees: 32,
      objectRotationDegrees: { x: 20, y: -15, z: 40 },
    };
    setSceneCameraProfile('radial-wave-disk', customProfile);

    const saved = saveNamedCameraComposition('radial-wave-disk', 'Unit test framing');
    if (saved === null) throw new Error('Expected the named composition to save.');
    expect(saved.profile).toMatchObject({
      preset: 'custom',
      position: { x: 6.5, y: 2.25, z: 8.1 },
      target: { x: 0.4, y: -0.3, z: 0 },
      rollDegrees: 32,
      objectRotationDegrees: { x: 20, y: -15, z: 40 },
    });

    setSceneCameraProfile('radial-wave-disk', {
      ...profile,
      preset: 'front',
      position: { x: 0, y: 0, z: 10.3 },
    });
    expect(getSceneCameraCompositions('radial-wave-disk')[0]?.profile).toMatchObject({
      preset: 'custom',
      position: { x: 6.5, y: 2.25, z: 8.1 },
    });
    expect(getSceneCameraCompositions('particle-vortex')).toHaveLength(0);
    expect(saveNamedCameraComposition('radial-wave-disk', 'unit TEST framing')).toBeNull();
    expect(deleteNamedCameraComposition('radial-wave-disk', saved.id)).toBe(true);
    expect(getSceneCameraCompositions('radial-wave-disk')).toHaveLength(0);
  });

  it('persists interaction sensitivity and toggles as global preferences', () => {
    setCameraPreferences({ sensitivity: 1.6, enabled: { rotate: false, pan: true, zoom: false } });
    expect(getCameraPreferences()).toMatchObject({
      sensitivity: 1.6,
      enabled: { rotate: false, pan: true, zoom: false },
    });
  });
});
