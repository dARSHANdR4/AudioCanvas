import { afterEach, describe, expect, it } from 'vitest';
import {
  DEFAULT_SCENE_THEME_PRESET_ID,
  getSceneTheme,
  getSceneThemePresetId,
  resetSceneThemePreset,
  SCENE_THEME_PRESETS,
  setSceneThemePreset,
} from '../../apps/web/src/engine/scenes/scene-theme-store';

afterEach(() => {
  resetSceneThemePreset('radial-wave-disk');
  resetSceneThemePreset('particle-vortex');
});

describe('scene theme presets', () => {
  it('provides named palettes with three valid hex colours', () => {
    expect(SCENE_THEME_PRESETS.length).toBeGreaterThanOrEqual(4);
    for (const preset of SCENE_THEME_PRESETS) {
      expect(preset.colors).toHaveLength(3);
      for (const color of preset.colors) expect(color).toMatch(/^#[0-9A-F]{6}$/i);
    }
  });

  it('changes a scene palette without changing another scene', () => {
    setSceneThemePreset('radial-wave-disk', 'aurora');
    expect(getSceneThemePresetId('radial-wave-disk')).toBe('aurora');
    expect(getSceneThemePresetId('particle-vortex')).toBe(DEFAULT_SCENE_THEME_PRESET_ID);
    expect(getSceneTheme('radial-wave-disk')).toMatchObject({ id: 'aurora', colors: ['#60F2C2', '#73B7FF', '#C084FC'] });
  });

  it('resets the selected scene to the default Cyberpunk palette', () => {
    setSceneThemePreset('radial-wave-disk', 'ember');
    resetSceneThemePreset('radial-wave-disk');
    expect(getSceneThemePresetId('radial-wave-disk')).toBe('cyberpunk');
  });
});
