# AudioCanvas — Software Requirements Specification (SRS)

*Version 1.0*

## 2.1 Purpose and Scope

This SRS defines the functional and non-functional requirements for AudioCanvas MVP, a client-heavy web application with a lightweight backend for accounts, preset storage and the community gallery. Requirement keywords follow RFC 2119 (MUST, SHOULD, MAY).

## 2.2 System Context

- **Client (browser):** Next.js/React UI, Web Audio API, Three.js renderer, WebCodecs export pipeline.
- **Backend:** REST API for auth, presets, gallery, reporting; Postgres for data; object storage for thumbnails.
- **External:** Optional OAuth providers (Google, GitHub), CDN for static assets.

## 2.3 Functional Requirements

### Audio Input (FR-A)

- **FR-A1** The system MUST accept MP3, WAV, FLAC, OGG and M4A via drag-and-drop and file picker, up to 100 MB.
- **FR-A2** The system MUST decode audio with `AudioContext.decodeAudioData` and display duration, current time and a seekable timeline.
- **FR-A3** The system MUST support microphone input via `getUserMedia` with a toggle and visible input-level meter.
- **FR-A4** The system SHOULD allow selecting an input device when multiple are available.
- **FR-A5** The system MUST resume the AudioContext only after a user gesture.
- **FR-A6** The system MUST handle errors for unsupported formats, corrupt files and denied permissions with human-readable messages.

### Audio Analysis (FR-B)

- **FR-B1** The system MUST compute FFT with a configurable size (256, 512, 1024, 2048; default 512) via `AnalyserNode`.
- **FR-B2** The system MUST derive normalized (0–1) energy for three bands: Bass (20–250 Hz), Mid (250–4000 Hz), Treble (4000–20000 Hz), plus overall RMS level.
- **FR-B3** The system MUST apply per-band smoothing (attack and release coefficients, default attack 0.6, release 0.15) and auto-gain normalization using a rolling peak window.
- **FR-B4** The system SHOULD detect onsets (spectral flux with adaptive threshold) and expose a `beat` event with a cooldown of at least 120 ms.
- **FR-B5** Analysis data MUST be stored in mutable typed arrays outside React state.

### Visual Scenes (FR-C)

- **FR-C1** The system MUST ship three scenes: **Radial Wave Disk**, **Particle Vortex**, **Synthwave Tunnel**.
- **FR-C2** Each scene MUST implement a common Scene interface (`init`, `update(audioFrame, params, dt)`, `render`, `dispose`, `getParamSchema`).
- **FR-C3** Scene switching MUST NOT interrupt audio playback and MUST dispose GPU resources of the previous scene.
- **FR-C4** The Particle Vortex MUST support at least 100,000 GPU-instanced particles on mid-range hardware, with an adaptive quality setting.
- **FR-C5** The renderer MUST target 60 FPS and MUST degrade quality automatically (particle count, post-FX resolution) when frame time exceeds 20 ms for 2 seconds.

### Customization (FR-D)

- **FR-D1** The system MUST provide a mapping panel where each row binds a source (Bass, Mid, Treble, Level, Beat) to a target parameter (e.g., Mesh Scale, Rotation Speed, Particle Turbulence, Bloom Intensity, Camera Shake, Color Flash).
- **FR-D2** Each mapping MUST expose intensity (0–200%), smoothing (0–1), invert toggle and enabled toggle.
- **FR-D3** The system MUST provide at least six color themes (Cyberpunk Neon, Vaporwave, Monochrome Gold, Sunset, Ocean, Toxic Green) and a custom 3-color picker.
- **FR-D4** The system MUST provide post-processing controls: bloom (strength, radius, threshold), motion blur, chromatic aberration, scanlines/CRT toggle.
- **FR-D5** All control changes MUST apply within one rendered frame.
- **FR-D6** The system SHOULD provide undo/redo (at least 20 steps) for settings changes.

### Playback and VJ Mode (FR-E)

- **FR-E1** Space MUST toggle play/pause; arrow keys MUST seek ±5 s; `F` MUST toggle fullscreen; `H` MUST hide/show the UI.
- **FR-E2** Fullscreen VJ mode MUST use the Fullscreen API, hide all panels, and auto-hide the cursor after 2 s of inactivity.
- **FR-E3** The system MAY provide a transparent-background mode (alpha canvas) for OBS Browser Source use.

### Export (FR-F)

- **FR-F1** The system MUST export MP4 (H.264 + AAC) using WebCodecs `VideoEncoder`/`AudioEncoder` and an MP4 muxer.
- **FR-F2** Export MUST be deterministic: the renderer steps by fixed `dt = 1/fps`, and audio analysis MUST be computed offline from the decoded buffer at the same time index (using an offline FFT matching the live analyzer).
- **FR-F3** The user MUST choose aspect ratio (16:9 1920×1080, 9:16 1080×1920, 1:1 1080×1080), frame rate (30 or 60) and range (full track or selected segment).
- **FR-F4** Export MUST display progress, ETA and a cancel button, and MUST release resources on cancel or failure.
- **FR-F5** The system SHOULD estimate output size and warn before exports expected to exceed browser memory limits; streaming to disk via File System Access API SHOULD be used where available.
- **FR-F6** If WebCodecs is unavailable, the system MUST show a compatibility message and MAY offer a real-time `MediaRecorder` fallback labeled as non-deterministic.

### Presets and Sharing (FR-G)

- **FR-G1** A preset MUST serialize to versioned JSON (scene id, mappings, theme, post-FX, camera, seed).
- **FR-G2** Presets MUST save to IndexedDB for guests and sync to the backend for signed-in users.
- **FR-G3** The system MUST generate a share link (`/p/{shortId}`) that loads the preset; presets under 2 KB MAY also be encoded directly in the URL hash.
- **FR-G4** The system SHOULD provide a community gallery with thumbnails, tags, likes and a report button.

### Accounts (FR-H)

- **FR-H1** The system SHOULD allow sign-in via email magic link, Google and GitHub; all core features MUST work without an account.
- **FR-H2** Users MUST be able to delete their account and all associated data.

## 2.4 Non-Functional Requirements

| ID | Category | Requirement |
| --- | --- | --- |
| NFR-01 | Performance | 60 FPS at 1080p on integrated GPUs of the last 5 years at default settings; min 30 FPS on low-end. |
| NFR-02 | Latency | Audio-to-visual latency under 50 ms in live playback. |
| NFR-03 | Load time | Initial JS under 250 KB gzipped for the shell; scenes and post-FX lazy-loaded; Largest Contentful Paint under 2.5 s on 4G. |
| NFR-04 | Memory | No unbounded growth; heap stable within ±10% over a 30-minute session. |
| NFR-05 | Reliability | Export success rate above 95% for tracks up to 10 minutes on supported browsers. |
| NFR-06 | Compatibility | Latest 2 versions of Chrome, Edge, Safari 16.4+, Firefox (live mode; export limited). |
| NFR-07 | Accessibility | WCAG 2.2 AA for UI; keyboard-operable controls; reduced-motion setting; **photosensitivity warning and a flash-limiter** (max 3 flashes per second option). |
| NFR-08 | Security | HTTPS only, strict CSP, JWT/session cookies HttpOnly + SameSite, rate limiting, input validation on all API inputs. |
| NFR-09 | Privacy | Audio never leaves the device in MVP; analytics are opt-out and contain no audio content; GDPR/CCPA deletion and export supported. |
| NFR-10 | Scalability | Backend handles 500 req/s on gallery reads via caching/CDN; stateless services. |
| NFR-11 | Maintainability | TypeScript strict mode; 80% unit-test coverage on audio and mapping logic; documented Scene interface. |
| NFR-12 | Observability | Client error reporting, FPS/export telemetry (anonymous), server structured logs and metrics. |
| NFR-13 | Localization | UI strings externalized; English at launch. |

## 2.5 External Interface Requirements

- **User interface:** see UX.md.
- **Software interfaces:** Web Audio API, WebGL2 (WebGPU optional later), WebCodecs, Fullscreen API, File System Access API, IndexedDB.
- **Backend API:** see BACKEND.md (REST, JSON, OpenAPI 3.1).

## 2.6 Data Requirements

Preset JSON schema (v1):

```json
{
  "schemaVersion": 1,
  "name": "Neon Pulse",
  "scene": "particle-vortex",
  "seed": 424242,
  "theme": { "id": "cyberpunk", "colors": ["#00F5FF", "#FF00E5", "#1A0033"] },
  "mappings": [
    { "source": "bass", "target": "meshScale", "intensity": 1.2, "smoothing": 0.3, "invert": false, "enabled": true },
    { "source": "treble", "target": "bloomIntensity", "intensity": 0.8, "smoothing": 0.1, "invert": false, "enabled": true }
  ],
  "postFx": { "bloom": { "strength": 0.9, "radius": 0.4, "threshold": 0.2 }, "motionBlur": 0.2, "chromaticAberration": 0.1, "crt": false },
  "camera": { "fov": 60, "shake": 0.3 },
  "audio": { "fftSize": 512, "attack": 0.6, "release": 0.15 }
}
```

## 2.7 Constraints and Dependencies

- Browser autoplay and codec support differ per vendor; FLAC/OGG support varies on Safari.
- WebCodecs AAC encoding is not available in all browsers; fallback to Opus-in-WebM may be required.
- Memory limits for in-browser MP4 muxing; use chunked/streaming muxer.

## 2.8 Requirements Traceability (excerpt)

| User story | Functional requirements |
| --- | --- |
| US-01 | FR-A1, FR-A2, FR-A6 |
| US-02 | FR-A3, FR-A4, FR-A5 |
| US-04 | FR-D1, FR-D2, FR-D5 |
| US-08 | FR-E1, FR-E2, FR-E3 |
| US-09 | FR-F1 to FR-F6 |
| US-10 / US-11 | FR-G1 to FR-G3 |
