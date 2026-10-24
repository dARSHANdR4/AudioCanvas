# Camera Studio — per-scene profiles

## Purpose

Camera Studio controls the viewing perspective and object rotation for AudioCanvas' shared Three.js stage. The renderer and OrbitControls stay shared for performance, but each of the seven visualizations owns an independent camera profile. Switching scenes restores the destination scene's saved view without restarting audio.

## Controls

- Left-drag on the viewport: orbit / rotate the camera.
- Mouse wheel: zoom; zoom is bounded to keep the camera near the scene.
- Right-drag: pan.
- Touch interactions: use the default Three.js OrbitControls touch gestures.
- Presets: Front, Side, Top, Low angle and Cinematic.
- Camera roll: rotate the viewing frame around its forward axis from -180° to 180°.
- Sensitivity: global preference for orbit, pan and zoom speed.
- Rotate, pan and zoom toggles: global preferences that temporarily disable individual interactions.
- Object X / Y / Z rotation: rotate the active visualization independently from its camera viewpoint.
- Reset view: restore the current scene's canonical front camera, zero roll, and neutral X/Y/Z object rotation. Global sensitivity and input toggles are intentionally preserved.

## Persistence and implementation notes

- Camera position, OrbitControls target (including pan), camera up vector, selected preset/custom state, roll, and object X/Y/Z rotation are stored independently for each scene.
- Scene profiles and global interaction preferences are stored locally under `audiocanvas.camera-studio.v1`. Storage is browser-local and does not sync across devices.
- OrbitControls change events update the active profile in memory and flush to localStorage after interaction settles; explicit preset, roll, axis, reset and scene-switch changes are saved immediately.
- Scene switching snapshots the outgoing profile before restoring the incoming one. The active scene remains in the shared Three.js stage, and audio processing is not restarted.
- Camera profiles are not included in Save / Share / Export yet; those workflows remain separate follow-up work.

## Verification

- Unit tests cover per-scene profile isolation, single-scene reset, and global preference state.
- Playwright verifies presets, roll, object rotation, scene-switch isolation, profile persistence after reload, and resetting one scene without altering another.
- Reference-device sustained 60 FPS and long-session GPU/memory checks remain separate performance work.
