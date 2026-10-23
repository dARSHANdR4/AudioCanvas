# Scene Visual Polish — Feedback Pass

## Why this pass exists

The first manual seven-scene check reported Radial Wave Disk, Oscilloscope Ribbon and Spectrogram Waterfall as “Good”; Particle Vortex, Synthwave Tunnel, Kaleidoscope Mandala and Liquid Orb were “fine”, with the four “fine” scenes explicitly called out as below the user's target. That feedback is treated as a request for stronger visual identity, not as approval to freeze those scenes.

## What changed

- **Particle Vortex:** add radius-dependent curl, spiral-arm modulation, more z/depth flow, and a reactive central core/accretion ring.
- **Synthwave Tunnel:** add depth-dependent camera-axis twist, angular ring deformation, and additional beat/treble glow modulation.
- **Kaleidoscope Mandala:** increase ring/petal detail, add a dynamic radial facet lattice, and add a rotating wireframe center cage.
- **Liquid Orb:** add a subtle translucent filled shell underneath the wireframe, three orbital accent rings, and stronger synchronized surface rotation.

## Quality and lifecycle notes

The new layers are bounded and deterministic from the scene's elapsed time and the shared AudioFrame. The existing audio engine, scene-selection store and single-renderer architecture are unchanged. Added geometries/materials are disposed in each scene's dispose() method. Added facets, particles or orbital layers follow their scene's low/medium/high quality tier where applicable.

## Validation status

Automated lint, type, unit, build and browser smoke checks run in GitHub Actions for the pull request. Passing CI does not establish that the revised look matches the user's artistic target, and it is not a substitute for reference-device sustained-60-FPS and long-session GPU/memory checks. Manual visual review of these four revised scenes is still required before calling the polish pass complete.
