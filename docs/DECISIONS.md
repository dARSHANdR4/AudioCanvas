# AudioCanvas — Engineering Decisions

Record material implementation choices and unresolved specification gaps here. The controlling precedence is **SRS → ARCHITECTURE → UX → PRD**.

## M0 decisions

| ID | Decision | Rationale / impact | Status |
| --- | --- | --- | --- |
| DEC-001 | Use a single npm-workspaces monorepo with `apps/web` and `packages/shared`. | Matches the project structure in `ARCHITECTURE.md` without introducing a multi-service deployment in M0. | Accepted |
| DEC-002 | Use the requested stack baseline: Next.js App Router, strict TypeScript, Tailwind CSS, Zod, Vitest, Playwright, axe-core, ESLint and Prettier. | Tooling enables the mandated route, type, lint, test and accessibility checks. Dependencies not required before their implementation milestone are deferred to avoid unused packages. | Accepted |
| DEC-003 | Preset short IDs accept 1–10 ASCII letters, digits, hyphens or underscores. | The backend allows up to 10 characters; the route validates external path data before displaying or using it. | Accepted |
| DEC-004 | Landing/Studio artwork is static decorative SVG/CSS until M1/M2. | M0 is the shell milestone; labeling the artwork as a preview avoids implying functional audio analysis or rendering. | Accepted |
| DEC-005 | Mapping intensity values will be stored as a normalized multiplier from 0 to 2 and displayed as 0% to 200%. | Resolves the UI percentage versus preset example values such as `1.2`; the mapping engine will implement this in M3. | Accepted for implementation; schema finalization in M3 |
| DEC-006 | MP4 with H.264/AAC remains the primary export target; incompatible configurations must be feature-detected and explicitly messaged. | Avoids silently changing the specified output format. Any alternate format must be labeled and reviewed in M5. | Accepted for M5 |
| DEC-007 | Auth.js is the intended authentication integration. The database adapter and the backend's custom `sessions` / `oauth_accounts` DDL must be reconciled in M6 before choosing a final session-storage schema. | Avoids unintentionally running two authentication/session implementations. No auth dependency or credentials are needed in M0. | Deferred to M6 |
| DEC-008 | M7 comprises hardening and the launch checklist. | The detailed roadmap table calls M7 “Launch,” while the master prompt calls M7 “Hardening”; both hardening and go/no-go work will be included in M7. | Accepted |
| DEC-009 | Use framework-supported Tailwind CSS v4 setup and CSS custom properties aligned with UX token values. | The official Next.js/Tailwind guide uses `@tailwindcss/postcss` and `@import "tailwindcss"`; the named UX colors are kept as source tokens. | Accepted |
| DEC-010 | Defer Zustand, Three.js, `fft.js`, `mp4-muxer`, database drivers/ORM, Auth.js, and S3/Redis clients until their owning milestones. | Installing unused runtime dependencies in M0 conflicts with the no-unused-dependencies rule; the stack selection itself remains unchanged. | Accepted |
| DEC-011 | CI uses `npm install` while this starter is delivered without a generated lockfile. | Package-registry DNS is unavailable in the current build environment, so a complete lockfile cannot be generated here. CI will generate the lock as part of dependency resolution; commit `package-lock.json` after the first successful install in a network-enabled environment. | Temporary; lockfile required before production |
| DEC-012 | M0 validation uses named smoke tests rather than `TC-00*` IDs. | The provided test roadmap starts its numbered test cases at TC-01 for M1; the M0 shell still receives route, safe-URL, first-run notice and automated accessibility smoke coverage. | Accepted |
| DEC-013 | Exclude `apps/web/vitest.config.ts` from the Next.js app TypeScript include set. | Vitest configuration is build tooling, not an application module; excluding it prevents production type checks from depending on test-runner packages that may not be installed for the app root. Unit tests still load the config through Vitest. | Accepted |

## M1 decisions

| DEC-014 | Audio input validation uses a shared Zod metadata schema plus an explicit extension/MIME allowlist. | The browser decoder is invoked only for supported audio formats up to 100 MB; malformed, empty, mismatched, or oversized selections receive actionable messages. | Accepted |
| DEC-015 | The live audio analyser uses a reusable `AudioFrame` and typed-array scratch buffers; band extraction, smoothing, auto-gain and onset logic stay in a pure module. | Live and future offline analysis can invoke the same spectrum-analysis function; no per-frame sample values enter React state. Offline FFT buffer processing is wired during M5 when the encoder/export pipeline is added. | Accepted |
| DEC-016 | File playback connects the source separately to the analyser and audio destination; microphone sources connect only to the analyser. | This provides audible file playback without routing microphone input to speakers or creating a feedback path. | Accepted |
| DEC-017 | Browser-native `decodeAudioData` is used for MP3/WAV/FLAC/OGG/M4A decode. | It avoids a second decoder and keeps file bytes local; support depends on the browser codec implementation, and decode failures are presented clearly. | Accepted |
| DEC-018 | M1 includes a short deterministic demo groove generated into an in-memory AudioBuffer after a user gesture. | Lets a first-time visitor try playback and analysis without a downloaded sample asset or upload; generated samples remain on-device and use no unseeded random values. | Accepted |

## Deferred items

- Worker-based WebCodecs/OffscreenCanvas support and codec fallback behavior will be designed and tested in M5.
- AudioContext gesture gating and no-microphone-loopback behavior will be implemented and tested in M1.
- GPU lifecycle disposal, seeded scene determinism and adaptive quality will be implemented and verified in M2.
- Database adapter, migrations, CSRF, rate limits, telemetry event allowlists and account deletion will be implemented in M6.
- Final reviewed legal copy must replace the legal placeholders before public launch.
- The first-visit photosensitivity notice is present in M0 and can be dismissed per browser profile; the reactive renderer and its flash-limiter enforcement remain later-milestone work.

## M2 decisions

| DEC-019 | Use Three.js with a single managed WebGL2 canvas for the render core; pass the latest audio frame through a mutable bridge outside React state. | Keeps rendering independent from React re-renders, allows the scene to be disposed cleanly, and reuses M1's typed-array analysis output. The first scene is Radial Wave Disk; the remaining scenes and scene-switch lifecycle are still required to complete M2. | Accepted for M2 |
| DEC-020 | Start the render quality tier at high and drop to medium/low if measured render work exceeds 20 ms for a sustained two-second window. | Implements the SRS adaptive-quality direction without changing audio playback; tiers reduce the visible instance count in the first scene. Reference-device 60 FPS verification remains pending. | Initial implementation; performance validation pending |


## M2 visual contrast correction

| DEC-021 | Radial Wave Disk instance bars use instancing colors, not vertex-color attributes; use a white base material, additive blending and brighter band/ring colors. | The first live screenshot showed the ring/core but the radial bars were nearly black. The instanced mesh already sets per-instance colors; enabling vertexColors on geometry without a color attribute can suppress those intended colors. Increase minimum bar length and ring opacity so low-energy audio still reads clearly. | Accepted; visual confirmation pending |


## M2 scene completion slice

| DEC-022 | Keep scene metadata and construction in a typed registry, and notify the canvas through a small in-memory scene-selection store. | Sidebar controls stay accessible while the renderer owns the GPU lifecycle. The active scene is disposed and replaced inside the existing renderer/context; audio lives in a separate component and continues during swaps. | Accepted |
| DEC-023 | Implement Particle Vortex as 100,000 GPU-instanced quads with deterministic per-instance position/size/phase data animated in the vertex shader. | Avoids per-frame CPU updates for each particle; adaptive tiers use 100,000 / 60,000 / 25,000 active instances. Hardware performance verification remains required. | Accepted; performance check pending |
| DEC-024 | Implement Synthwave Tunnel from deterministic vertex-colored ring and longitudinal line segments, deformed with shader uniforms fed by the shared audio frame. | Provides a light-weight perspective-grid scene with live bass, mid and treble response and theme-compatible vertex colors. | Accepted |


## M2 responsiveness follow-up

| DEC-025 | Shape low normalized band levels only at the visual layer, using a bounded power curve and gain; leave the underlying analyser readings unchanged. Add a decaying beat envelope for punchier movement. | Live user feedback found that vortex and tunnel deviations were hard to notice. Visual-only shaping makes quiet-but-real energy legible without changing the audio meters or analysis contract. | Accepted; browser re-test pending |
| DEC-026 | Drive Synthwave Tunnel depth coordinates with continuous wrapped travel toward the camera, and increase band/beat-driven pulse and color intensity. | A subtle scale/rotation-only response did not communicate forward motion. The tunnel now has a continuous travel component plus visible bass/mid/treble accents. | Accepted; reference-device performance pending |
| DEC-027 | Increase Particle Vortex angular drift, radial expansion, vertical movement and particle size as a function of shaped audio energy. | The previous particle field appeared nearly static for the user's test. GPU vertex animation remains in place; only shader coefficients and visual-energy inputs are strengthened. | Accepted; browser re-test pending |


## Visualization variety research and M2 scene library expansion

External references reviewed:
- MDN Web Audio visualizations guide: https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Visualizations_with_Web_Audio_API
- MDN AnalyserNode time-domain data: https://developer.mozilla.org/en-US/docs/Web/API/AnalyserNode/getByteTimeDomainData
- MilkDrop preset-authoring guide: https://milkdrop.org/resources/preset-authoring
- Butterchurn WebGL/MilkDrop implementation: https://github.com/jberg/butterchurn
- Three.js AudioAnalyser reference: https://threejs.org/docs/pages/AudioAnalyser.html

| DEC-028 | Expand the scene set with four distinct visual languages: time-domain oscilloscope ribbon, historical spectrogram waterfall, symmetric kaleidoscope mandala, and a deforming liquid orb. | Waveform scenes need time-domain samples, while a waterfall needs a short history of frequency bins. Symmetry and a deformed 3D mesh produce silhouettes different from the existing spectrum disk, particle vortex and tunnel. | Accepted; live screenshot feedback pending |
| DEC-029 | Keep visualization-family processing separate from the core audio meters; pass the latest waveform as a reusable typed array alongside the FFT spectrum in AudioFrame. | Enables a real waveform/oscilloscope view without reconstructing time-domain shape from frequency bins. The analysis frame reuses its array rather than allocating on each animation frame. | Accepted |
| DEC-030 | Document the scene taxonomy and future candidates separately from the implementation status. | MilkDrop/Butterchurn demonstrates the breadth of programmable waves, custom shapes, equations and pixel-shader transformations; the native AudioCanvas scene library is inspired by these categories but does not copy external presets. | Accepted |
