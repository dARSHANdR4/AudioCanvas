'use client';

import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { getSelectedScene, subscribeToSceneSelection } from '@/engine/scenes/scene-selection-store';
import type { SceneId } from '@/engine/scenes/scene-registry';
import {
  getDefaultSceneThemePresetId,
  getSceneThemePresetId,
  initializeSceneThemes,
  resetSceneThemePreset,
  SCENE_THEME_PRESETS,
  setSceneThemePreset,
  subscribeToSceneThemes,
} from '@/engine/scenes/scene-theme-store';

export function ThemePanel() {
  const subscribeToScenes = useCallback((listener: () => void) => (
    subscribeToSceneSelection(() => listener())
  ), []);
  const selectedScene = useSyncExternalStore(subscribeToScenes, getSelectedScene, () => 'radial-wave-disk' as SceneId);

  const subscribeToCurrentTheme = useCallback((listener: () => void) => (
    subscribeToSceneThemes((sceneId) => {
      if (sceneId === selectedScene) listener();
    })
  ), [selectedScene]);
  const activePresetId = useSyncExternalStore(
    subscribeToCurrentTheme,
    () => getSceneThemePresetId(selectedScene),
    () => getDefaultSceneThemePresetId(selectedScene),
  );

  useEffect(() => {
    initializeSceneThemes();
  }, []);

  const activePreset = SCENE_THEME_PRESETS.find((preset) => preset.id === activePresetId) ?? SCENE_THEME_PRESETS[0]!;

  return (
    <section className="inspector-section theme-panel" aria-labelledby="theme-panel-title">
      <div className="inspector-title-row">
        <div><span className="eyebrow">03 / PALETTE</span><h2 id="theme-panel-title">Theme presets</h2></div>
        <span className="muted-badge">LIVE</span>
      </div>
      <p className="inspector-copy">Recolour the current visualizer instantly. Each scene keeps its own palette in this browser.</p>
      <div className="theme-preset-grid" role="group" aria-label="Choose a colour theme">
        {SCENE_THEME_PRESETS.map((preset) => {
          const active = preset.id === activePresetId;
          return (
            <button
              aria-label={'Use ' + preset.name + ' theme'}
              aria-pressed={active}
              className={'theme-preset-card' + (active ? ' theme-preset-card--active' : '')}
              data-testid="theme-preset-card"
              key={preset.id}
              onClick={() => setSceneThemePreset(selectedScene, preset.id)}
              type="button"
            >
              <span className="theme-preset-swatches" aria-hidden="true">
                {preset.colors.map((color) => <span key={color} style={{ backgroundColor: color }} />)}
              </span>
              <span className="theme-preset-card__copy"><strong>{preset.name}</strong><small>{preset.description}</small></span>
              <span className="theme-preset-card__state" aria-hidden="true">{active ? '✓' : '+'}</span>
            </button>
          );
        })}
      </div>
      <div className="theme-panel-footer">
        <div><span className="eyebrow">ACTIVE PALETTE</span><strong>{activePreset.name}</strong></div>
        <button className="button button--ghost" onClick={() => resetSceneThemePreset(selectedScene)} type="button">Reset theme</button>
      </div>
      <p className="fine-print">Theme changes affect the current scene only. Reloading the Studio keeps your saved choice. More effects will arrive in the next increment.</p>
    </section>
  );
}
