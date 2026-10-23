# Camera Studio — MVP

## Purpose

Camera Studio gives the user direct control over the viewing perspective for AudioCanvas' shared Three.js scene. It is separate from the audio analyser and scene-selection store; camera interactions must not restart audio or recreate the active scene.

## Controls

- Left-drag on the viewport: orbit / rotate the camera.
- Mouse wheel: zoom; zoom is bounded to keep the camera near the scene.
- Right-drag: pan.
- Touch interactions: use the default Three.js OrbitControls touch gestures.
- Presets: Front, Side, Top, Low angle and Cinematic.
- Camera roll: rotate the viewing frame around its forward axis from -180° to 180°.
- Sensitivity: adjust orbit, pan and zoom speed.
- Rotate, pan and zoom toggles: temporarily disable individual interactions.
- Object X / Y / Z rotation: rotate the scene entity around its three axes independently of the camera viewpoint.
- Reset view: restore the canonical front camera, zero roll, default sensitivity, enabled navigation inputs and neutral X/Y/Z object rotation.

## Scope and implementation notes

The Camera Studio UI is positioned over the canvas. A typed command bridge moves UI intent to the renderer without per-frame camera state in React. One managed OrbitControls instance is shared by the seven visual scenes. Scene switching and audio processing are not changed by camera commands.

Camera orbit, pan, zoom and roll affect the viewpoint. Object X/Y/Z sliders independently rotate the shared scene contents, so the view can be changed without changing the object's orientation and vice versa. Camera settings and object-axis values are currently transient and are not included in Save / Share / Export.

## Verification status

The feature branch adds an end-to-end test for presets, roll and Reset View, plus unit coverage for command subscription lifecycle. Passing automated tests and the production deployment still need confirmation before the feature should be considered released. Reference-device sustained 60 FPS and long-session GPU/memory checks remain separate performance work.
