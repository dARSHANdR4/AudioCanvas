import type { SceneId } from './scene-registry';

type SceneListener = (sceneId: SceneId) => void;
const listeners = new Set<SceneListener>();
let selectedScene: SceneId = 'radial-wave-disk';

export function getSelectedScene(): SceneId {
  return selectedScene;
}

export function selectScene(sceneId: SceneId): void {
  if (selectedScene === sceneId) return;
  selectedScene = sceneId;
  listeners.forEach((listener) => listener(sceneId));
}

export function subscribeToSceneSelection(listener: SceneListener): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
