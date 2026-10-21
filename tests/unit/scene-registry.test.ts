import { describe, expect, it } from 'vitest';
import { createScene, SCENE_OPTIONS } from '../../apps/web/src/engine/scenes/scene-registry';
import { getSelectedScene, selectScene, subscribeToSceneSelection } from '../../apps/web/src/engine/scenes/scene-selection-store';

describe('M2 scene registry', () => {
  it('registers the three required visual scenes with stable identifiers', () => {
    expect(SCENE_OPTIONS.map((scene) => scene.id)).toEqual([
      'radial-wave-disk',
      'particle-vortex',
      'synthwave-tunnel',
    ]);
  });

  it('creates a scene implementation with a parameter schema for every registered scene', () => {
    for (const metadata of SCENE_OPTIONS) {
      const scene = createScene(metadata.id);
      expect(scene.id).toBe(metadata.id);
      expect(scene.name).toBe(metadata.name);
      expect(scene.getParamSchema().length).toBeGreaterThan(0);
      expect(() => scene.dispose()).not.toThrow();
    }
  });

  it('broadcasts scene selection changes and permits safe unsubscription', () => {
    const observed: string[] = [];
    const unsubscribe = subscribeToSceneSelection((id) => observed.push(id));
    const original = getSelectedScene();
    const target = original === 'particle-vortex' ? 'synthwave-tunnel' : 'particle-vortex';

    selectScene(target);
    unsubscribe();
    selectScene(original);

    expect(observed).toEqual([target]);
    expect(getSelectedScene()).toBe(original);
  });
});
