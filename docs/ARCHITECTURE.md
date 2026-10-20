# AudioCanvas — System Architecture and Technical Design

## 5.1 High-Level Architecture

```
+------------------------------- BROWSER (client) --------------------------------+
|                                                                                  |
|  React UI (Next.js)  <--- Zustand store (settings, mappings, preset JSON) ---+   |
|        |                                                                      |   |
|        v                                                                      |   |
|  Audio Engine                Mapping Engine              Render Engine        |   |
|  - AudioContext              - reads AudioFrame          - Three.js renderer  |   |
|  - AnalyserNode / Worklet    - applies intensity,        - Scene registry     |   |
|  - Band extractor              smoothing, invert         - Post-FX composer   |   |
|  - Onset detector            - outputs ParamFrame        - Adaptive quality   |   |
|        |                            |                          ^               |   |
|        +---- AudioFrame (typed arrays, per rAF) ---> ParamFrame -+               |   |
|                                                                                  |
|  Export Pipeline (Web Worker): offline analysis -> fixed-step render ->          |
|  VideoEncoder + AudioEncoder -> MP4 muxer -> Blob / File System Access API       |
|                                                                                  |
|  Persistence: IndexedDB (guest presets, session)                                 |
+----------------------------------------+-----------------------------------------+
                                         | HTTPS REST
+----------------------------------------v-----------------------------------------+
|  API (Next.js route handlers / Fastify) -> PostgreSQL, Redis, S3 + CDN            |
+----------------------------------------------------------------------------------+
```

## 5.2 Core Data Flow per Frame (Live Mode)

1. `requestAnimationFrame` tick provides `dt`.
2. Audio engine reads `getByteFrequencyData` into a preallocated `Uint8Array`; computes bass, mid, treble, level, beat flag into an `AudioFrame` (plain object reused each frame).
3. Mapping engine evaluates every enabled mapping: `value = smooth(source) * intensity` (inverted if set) and writes to a `ParamFrame`.
4. Active scene's `update(audioFrame, paramFrame, dt)` mutates uniforms and instance buffers.
5. Composer renders scene, then post-FX passes; adaptive quality monitor records frame time.

## 5.3 Key Interfaces (TypeScript)

```ts
export interface AudioFrame {
  time: number;          // seconds
  bass: number;          // 0..1
  mid: number;           // 0..1
  treble: number;        // 0..1
  level: number;         // 0..1 (RMS)
  beat: boolean;         // onset this frame
  spectrum: Uint8Array;  // raw bins, reused buffer
}

export type ParamKey =
  | 'meshScale' | 'rotationSpeed' | 'particleTurbulence' | 'bloomIntensity'
  | 'cameraShake' | 'colorFlash' | 'lineThickness' | 'tunnelSpeed';

export type ParamFrame = Partial<Record<ParamKey, number>>;

export interface Scene {
  id: string;
  name: string;
  getParamSchema(): ParamDescriptor[];   // targets this scene supports
  init(ctx: RenderContext, config: ScenePresetConfig): void;
  update(audio: AudioFrame, params: ParamFrame, dt: number): void;
  render(): void;
  setTheme(theme: Theme): void;
  setQuality(tier: 'low' | 'medium' | 'high'): void;
  dispose(): void;
}
```

## 5.4 Audio Engine Details

- **Band extraction:** with `sampleRate` S and `fftSize` N, bin width = S / N. Convert band edges to bin indices; average the magnitude within each range; normalize by 255; apply auto-gain from a rolling 3-second peak.
- **Smoothing:** `v = v + (target - v) * (target > v ? attack : release)`.
- **Onset detection:** compute spectral flux on the bass and mid bins; compare to a moving average times a sensitivity multiplier (default 1.4); apply a 120 ms refractory period.
- **Mic mode:** `MediaStreamAudioSourceNode` into the analyser; **do not connect to destination** to avoid feedback.
- **Offline analysis for export:** use the same band and smoothing code on `Float32Array` channel data with an FFT library (e.g., `fft.js`) at the frame timestamps. A shared pure module guarantees live and export parity.

## 5.5 Render Engine Details

- **Radial Wave Disk:** instanced bars or line strip arranged radially, radius displaced by spectrum bins; mid-band drives rotation; treble drives glow pulses.
- **Particle Vortex:** `THREE.Points` or instanced quads with a GPU-driven position update (GPGPU via ping-pong render targets or vertex-shader curl noise); bass triggers radial burst impulse; mid drives swirl; treble drives sparkle size.
- **Synthwave Tunnel:** wireframe rings or grid along Z recycled as they pass the camera; bass pulses ring scale; treble displaces vertices; camera speed from level.
- **Post-FX:** `EffectComposer` with UnrealBloom, custom chromatic aberration, scanline/CRT shader, and accumulation-buffer motion blur.
- **Determinism:** all randomness uses a seeded PRNG (e.g., mulberry32) from the preset seed; scenes never use `Date.now()` or unseeded `Math.random()`.

## 5.6 Export Pipeline Details

1. Decode audio to `AudioBuffer`; compute per-frame `AudioFrame` list in a Web Worker (or on demand).
2. Create an `OffscreenCanvas` at the target resolution; init scene and composer on it.
3. Loop `i = 0..N-1`: set `t = i / fps`; update scene with the precomputed frame; render; `new VideoFrame(canvas, { timestamp: t * 1e6 })`; `videoEncoder.encode(frame, { keyFrame: i % (fps * 2) === 0 })`; `frame.close()`; yield periodically to keep the UI responsive; respect encoder queue backpressure (`encodeQueueSize`).
4. Encode audio with `AudioEncoder` (AAC where supported; otherwise Opus into WebM) in chunks.
5. Mux with a streaming MP4 muxer; write to disk via File System Access API when available, otherwise accumulate in memory with a size cap.
6. Report progress; support cancel via `AbortController`; clean up GPU and encoder resources.

**Recommended encoder defaults:** H.264 High profile, 12 Mbps at 1080p30 and 18 Mbps at 1080p60, keyframe every 2 seconds, AAC 192 kbps.

## 5.7 Project Structure

```
audiocanvas/
  apps/web/
    src/app/                 # routes: /, /studio, /gallery, /me, /p/[shortId]
    src/components/          # UI components
    src/engine/
      audio/                 # context, analyser, bands, onset, offline-analysis
      mapping/               # mapping evaluator, smoothing
      render/                # renderer, composer, post-fx, quality monitor
      scenes/                # radial-disk, particle-vortex, synthwave-tunnel, registry
      export/                # export-worker, muxer, estimator
    src/store/               # Zustand stores, undo/redo
    src/lib/                 # preset schema (zod), api client, idb
    src/workers/
  packages/shared/           # preset schema, types, constants
  server/ (or src/app/api)   # route handlers, db, auth, validation
  docs/                      # PRD, SRS, UX, schema (this pack)
  tests/                     # unit, integration, e2e
```

## 5.8 DevOps and Environments

- **Hosting:** Vercel or Cloudflare for the web app; managed Postgres (Neon/Supabase/RDS); Cloudflare R2 or S3 for thumbnails.
- **CI/CD:** GitHub Actions: typecheck, lint, unit tests, Playwright e2e, preview deployments per PR, automated migration step.
- **Environments:** local, preview, staging, production with separate databases and secrets.
- **Monitoring:** Sentry (client and server), anonymous FPS and export telemetry, uptime checks.

## 5.9 Technology Decisions

| Decision | Choice | Rationale |
| --- | --- | --- |
| Framework | Next.js + TypeScript | SSR for landing/gallery SEO, easy API routes |
| State | Zustand (UI) + mutable refs (audio) | Avoids re-render bottleneck |
| Rendering | Three.js on WebGL2 | Mature, large ecosystem; WebGPU as later upgrade |
| Audio | Native Web Audio + `fft.js` for offline | No heavy dependency; parity between live and export |
| Export | WebCodecs + `mp4-muxer` | Deterministic, fast, no server cost |
| DB | PostgreSQL + Drizzle/Prisma | Relational data with JSONB presets |
| Validation | Zod | Shared schemas client and server |

---
