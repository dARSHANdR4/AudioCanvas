# AudioCanvas — Test Plan, Roadmap and Risk Register

## 6.1 Test Strategy

| Level | Scope | Tools |
| --- | --- | --- |
| Unit | Band extraction, smoothing, onset detection, mapping evaluator, preset schema validation, seeded PRNG | Vitest |
| Integration | Scene lifecycle (init/dispose leaks), store and undo/redo, API routes with a test database | Vitest, Supertest |
| E2E | Upload → play → change mapping → save → share → reopen; export flow | Playwright |
| Visual regression | Fixed-seed, fixed-audio frames compared to golden images for each scene | Playwright screenshots / pixelmatch |
| Performance | FPS on reference devices, heap stability over 30 min, export speed | Lighthouse, custom perf harness |
| Accessibility | Axe checks, keyboard-only walkthrough, reduced-motion | axe-core, manual |
| Cross-browser | Chrome, Edge, Safari, Firefox | BrowserStack |

## 6.2 Key Test Cases

| ID | Case | Expected |
| --- | --- | --- |
| TC-01 | Drop a 5-min MP3 | Decodes under 5 s; timeline shows 5:00 |
| TC-02 | Drop a .txt file | Error toast; no crash |
| TC-03 | Deny mic permission | Guidance modal shown |
| TC-04 | 440 Hz sine tone | Mid band reacts, bass and treble near zero |
| TC-05 | Kick-drum loop at 120 BPM | Beat events at \~500 ms intervals |
| TC-06 | Switch scenes 20 times | No GPU memory growth; audio uninterrupted |
| TC-07 | Set Bass → Scale at 200% | Scale visibly responds on bass hits |
| TC-08 | Export 60 s at 1080p30 twice with same preset | Byte-identical video frames (hash equality on decoded frames) |
| TC-09 | Export audio sync | Audio and video offset within one frame |
| TC-10 | Cancel export midway | Resources freed; UI recovers |
| TC-11 | Open share link in a fresh browser | Same scene, theme and mappings load |
| TC-12 | Flash limiter on with a strobe-heavy track | No more than 3 full-screen flashes per second |
| TC-13 | Delete account | All user presets and sessions removed |

## 6.3 Roadmap (Milestones)

| Milestone | Deliverables | Exit criteria |
| --- | --- | --- |
| M0 — Setup (week 1) | Repo, CI, design tokens, shell UI | Pipeline green; shell deployed |
| M1 — Audio core (weeks 2–3) | Upload, mic, analyser, bands, timeline | ✅ TC-01 to TC-05 pass in CI; live browser smoke test passed |
| M2 — Render core (weeks 3–5) | Three.js renderer, Scene interface, Radial Disk, Vortex, Tunnel, scene switching | Three scenes and switching tests implemented; responsiveness tuned from live feedback; 60 FPS reference-device and sustained GPU/resource verification pending |
| M3 — Customization (weeks 5–7) | Mapping panel, themes, post-FX, undo/redo, keyboard shortcuts | TC-06, TC-07 pass |
| M4 — VJ and Presets (weeks 7–9) | Fullscreen mode, local presets, URL sharing | TC-11 pass |
| M5 — Export (weeks 9–12) | Offline analysis, encoder pipeline, export UI | TC-08 to TC-10 pass |
| M6 — Backend and polish (weeks 11–14) | Auth, cloud presets, gallery, a11y, perf tuning | NFRs met; beta launch |
| M7 — Launch | Docs, analytics, marketing page | Go/no-go checklist signed |

## 6.4 Risk Register

| ID | Risk | Likelihood | Impact | Mitigation |
| --- | --- | --- | --- | --- |
| R1 | WebCodecs/AAC unsupported in some browsers | Medium | High | Feature detection; Opus/WebM fallback; MediaRecorder fallback labeled non-deterministic |
| R2 | Export memory exhaustion on long tracks | Medium | High | Streaming muxer, File System Access API, size warnings, segment export |
| R3 | Low FPS on weak GPUs | High | Medium | Adaptive quality, quality presets, particle-count scaling |
| R4 | Photosensitive seizure risk | Low | Severe | Flash limiter default on, warning, strobe caps, reduced-motion mode |
| R5 | Live/export visual mismatch | Medium | Medium | Shared pure analysis module, seeded PRNG, golden-frame tests |
| R6 | Copyright claims on user content/gallery | Medium | Medium | Audio never uploaded; presets contain no audio; ToS and report flow |
| R7 | Mobile Safari audio quirks | Medium | Medium | Gesture-gated AudioContext resume; device test matrix |
| R8 | Scope creep (custom shaders, streaming integrations) | High | Medium | Strict MoSCoW; post-MVP backlog |
| R9 | Abuse of public gallery | Medium | Medium | Rate limits, moderation queue, report thresholds |

## 6.5 Definition of Done

Code reviewed and merged; unit and e2e tests green; no new accessibility violations; performance budget respected; documentation updated; feature behind a flag if incomplete; analytics events added where specified.

## 6.6 Post-MVP Backlog

Node-based visual editor, custom GLSL snippets with sandboxing, additional scenes (fluid, reaction-diffusion, 3D mesh morph), MIDI/OSC input, tempo-synced palette changes, lyrics and text overlays, WebGPU renderer, streaming-service integrations (subject to licensing), team workspaces, paid plans (HD+ exports, watermark removal, 4K).

---
