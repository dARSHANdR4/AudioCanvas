'use client';

import { useEffect, useState } from 'react';
import { SCENE_OPTIONS, type SceneId } from '@/engine/scenes/scene-registry';
import { getSelectedScene, selectScene, subscribeToSceneSelection } from '@/engine/scenes/scene-selection-store';

export function SceneSelector() {
  const [selected, setSelected] = useState<SceneId>(() => getSelectedScene());

  useEffect(() => subscribeToSceneSelection(setSelected), []);

  return (
    <div className="scene-card-list" aria-label="Choose visualizer scene">
      {SCENE_OPTIONS.map((scene) => (
        <button
          aria-label={`Switch to ${scene.name}`}
          aria-pressed={selected === scene.id}
          className={`scene-card${selected === scene.id ? ' scene-card--active' : ''}`}
          key={scene.id}
          onClick={() => selectScene(scene.id)}
          type="button"
        >
          <span aria-hidden="true" className={`scene-thumb ${scene.className}`}>
            <span className="scene-thumb__orbit" />
            <span className="scene-thumb__core" />
            <span className="scene-thumb__code">{scene.number}</span>
          </span>
          <span className="scene-card__details">
            <span className="scene-card__tag">{scene.tag}</span>
            <span className="scene-card__name">{scene.name}</span>
          </span>
          <span aria-hidden="true" className="scene-card__status">{selected === scene.id ? '●' : '›'}</span>
        </button>
      ))}
    </div>
  );
}
