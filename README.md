<div align="center">

<img src="https://raw.githubusercontent.com/dARSHANdR4/AudioCanvas/main/apps/web/src/app/icon.svg" width="88" alt="AudioCanvas equalizer icon">

# AudioCanvas

### SOUND IN · VISUALS OUT

A browser-based visualizer studio concept for turning music into color, motion, and light — inspired by Winamp and MilkDrop.

<p>
  <a href="https://audiocanvas-darshandr4s-projects.vercel.app/"><img src="https://img.shields.io/badge/OPEN_LIVE_BUILD-245b32?style=for-the-badge&logo=vercel&logoColor=white" alt="Open live AudioCanvas build"></a>
  <a href="https://github.com/dARSHANdR4/AudioCanvas/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/dARSHANdR4/AudioCanvas/ci.yml?branch=main&style=for-the-badge&label=CI&logo=githubactions&logoColor=white" alt="GitHub Actions CI status"></a>
  <a href="https://github.com/dARSHANdR4"><img src="https://img.shields.io/badge/BUILDER-dARSHANdR4-337b3e?style=for-the-badge&logo=github&logoColor=white" alt="Built by dARSHANdR4"></a>
</p>

<p>
  <a href="https://audiocanvas-darshandr4s-projects.vercel.app/studio">Open Studio</a> ·
  <a href="https://audiocanvas-darshandr4s-projects.vercel.app/gallery">Explore Gallery</a> ·
  <a href="https://github.com/dARSHANdR4/AudioCanvas">Source Code</a>
</p>

</div>

<img src="https://raw.githubusercontent.com/dARSHANdR4/dARSHANdR4/main/assets/minecraft-emerald-divider.svg?v=4" width="100%" alt="Emerald pixel divider">

## 🧱 PROJECT PROFILE

> **Project type:** Browser-based visualizer studio  
> **Builder:** [dARSHANdR4](https://github.com/dARSHANdR4)  
> **Current milestone:** M2 — Render Core (in progress)  
> **Build philosophy:** Useful first. Reliable always. Keep shipping.

AudioCanvas is an early-stage project for creating a no-code, sound-reactive visualizer experience. The long-term idea is to let people shape visuals with audio, scene choices, mappings, and effects — without writing shaders.

**Current status, clearly:** M0 and M1 are complete. M2 now offers seven selectable Three.js visualization styles—Radial Wave Disk, Particle Vortex, Synthwave Tunnel, Oscilloscope Ribbon, Spectrogram Waterfall, Kaleidoscope Mandala, and Liquid Orb—with shared live audio data, time-domain waveform samples, scene cleanup, and adaptive quality. CI verifies scene switching and audio continuity; reference-device 60 FPS verification remains pending. The roadmap below separates working features from planned work.

## 🟩 LIVE BUILD

| Destination | What you'll find |
|---|---|
| [🟢 **Live website**](https://audiocanvas-darshandr4s-projects.vercel.app/) | Landing page and project introduction |
| [🎛️ **Open Studio**](https://audiocanvas-darshandr4s-projects.vercel.app/studio) | Local audio/demo playback, mic input, seekable timeline, analysis meters and seven selectable audio-reactive Three.js scenes |
| [🖼️ **Gallery**](https://audiocanvas-darshandr4s-projects.vercel.app/gallery) | Gallery route and empty state |
| [👤 **My Presets**](https://audiocanvas-darshandr4s-projects.vercel.app/me) | Presets/account placeholder |
| [🧪 **CI runs**](https://github.com/dARSHANdR4/AudioCanvas/actions) | Lint, TypeScript, unit tests, build, and browser checks |

<img src="https://raw.githubusercontent.com/dARSHANdR4/dARSHANdR4/main/assets/minecraft-emerald-divider.svg?v=2" width="100%" alt="Emerald pixel divider">

## 🎛️ WHAT'S BUILT SO FAR (M0–M1)

- **Responsive application shell** using the Next.js App Router and a dark, neon-inspired visual system.
- **Public routes** for the landing page, Studio, Gallery, My Presets, shared-preset links, and legal pages.
- **Route validation** for approved legal slugs and preset short IDs.
- **Photosensitivity notice** that visitors can dismiss; the dismissal is stored locally in the browser.
- **M1 audio workbench:** local MP3/WAV/FLAC/OGG/M4A decode (up to 100 MB), drag-and-drop, a 32-second deterministic browser-generated demo groove (a seamless 8-second pattern repeated four times), play/pause, seekable timeline and waveform preview.
- **Microphone input:** gesture-gated permission request, human-readable permission errors, optional input-device selection, and no microphone-to-speaker routing.
- **Live analysis:** configurable FFT size (256/512/1024/2048), Bass/Mid/Treble/Level meters, smoothing, rolling auto-gain and onset/beat detection using reusable typed arrays outside React state.
- **M2 visual library:** managed Three.js/WebGL2 renderer and seven distinct scenes: Radial Wave Disk, GPU-shader Particle Vortex, Synthwave Tunnel, Oscilloscope Ribbon, Spectrogram Waterfall, Kaleidoscope Mandala, and Liquid Orb. The waveform scene uses real time-domain samples; the waterfall keeps recent frequency history. Scene switching preserves playback and disposes old scene resources. Reference-device performance and long-session GPU checks remain pending.
- **Quality gates** for linting, strict TypeScript, unit tests, production builds, and Playwright smoke tests.
- **Project documentation** covering product requirements, UX, architecture, engineering decisions, and the test roadmap.

### Current boundaries

Audio input/analysis and seven selectable visual styles are wired into the Studio. Scene selection preserves audio playback and disposes resources from the previous scene. M2 remains in progress until reference-device 60 FPS and sustained GPU/resource checks are verified. Mapping controls, cloud accounts, persistent presets/sharing, and video export remain later milestones. Mapping controls, cloud accounts, persistent presets/sharing, and video export remain later milestones. User files and microphone audio are processed locally and are not uploaded.

## 🗺️ NEXT QUESTS — ROADMAP

| Milestone | Planned work | Status |
|---|---|---|
| **M0 · Shell** | Repository, responsive routes, design tokens, docs, CI, smoke tests, deployment | ✅ Complete |
| **M1 · Audio core** | Audio upload/microphone, analyser, frequency bands, beat detection, timeline and demo track | ✅ Complete — CI and live smoke test passed |
| **M2 · Render core** | Three.js renderer, seven visualization styles and scene switching | 🟡 In progress — seven scenes and switching; reference-device 60 FPS validation pending |
| **M3 · Customization** | Audio-to-visual mappings, themes, effects, undo/redo | 🧭 Planned |
| **M4 · Presets** | Local presets and shareable URLs | 🧭 Planned |
| **M5 · Export** | Browser-based video export and progress/cancel flow | 🧭 Planned |
| **M6 · Backend** | Authentication, cloud presets, gallery APIs, storage | 🧭 Planned |
| **M7 · Launch** | Hardening, accessibility/performance review, launch checklist | 🧭 Planned |

Milestones are roadmap targets, not claims that these features already ship.

## ⛏️ TOOL INVENTORY

<div align="center">

![Next.js](https://img.shields.io/badge/NEXT.JS-11111a?style=for-the-badge&logo=nextdotjs&logoColor=white)
![React](https://img.shields.io/badge/REACT-11111a?style=for-the-badge&logo=react&logoColor=61dafb)
![TypeScript](https://img.shields.io/badge/TYPESCRIPT-18331e?style=for-the-badge&logo=typescript&logoColor=8bcaff)
![Tailwind CSS](https://img.shields.io/badge/TAILWIND_CSS-18331e?style=for-the-badge&logo=tailwindcss&logoColor=8eff76)
![Vitest](https://img.shields.io/badge/VITEST-14271a?style=for-the-badge&logo=vitest&logoColor=8eff76)
![Playwright](https://img.shields.io/badge/PLAYWRIGHT-14271a?style=for-the-badge&logo=playwright&logoColor=8eff76)
![GitHub Actions](https://img.shields.io/badge/GITHUB_ACTIONS-14271a?style=for-the-badge&logo=githubactions&logoColor=8eff76)
![Vercel](https://img.shields.io/badge/VERCEL-14271a?style=for-the-badge&logo=vercel&logoColor=white)

</div>

**Core setup:** Next.js App Router, React, strict TypeScript, Tailwind CSS, npm workspaces, Vitest, Playwright, ESLint, and Prettier.

<img src="https://raw.githubusercontent.com/dARSHANdR4/dARSHANdR4/main/assets/minecraft-emerald-divider.svg?v=2" width="100%" alt="Emerald pixel divider">

## 🚀 RUN IT LOCALLY

### Requirements

- **Node.js 22** (see <code>.nvmrc</code>)
- **npm 10 or newer**

### Start the development server

~~~bash
git clone https://github.com/dARSHANdR4/AudioCanvas.git
cd AudioCanvas
npm install
npm run dev
~~~

Open [http://localhost:3000](http://localhost:3000).

### Quality checks

~~~bash
npm run lint
npm run typecheck
npm run test:unit
npm run build
npm run test:e2e
npm run format:check
~~~

To run the browser tests on a fresh machine, install Playwright's Chromium browser first:

~~~bash
npx playwright install chromium
~~~

## 📁 REPOSITORY MAP

~~~text
AudioCanvas/
├── apps/
│   └── web/                 # Next.js application and routes
├── packages/
│   └── shared/              # Shared validation schemas
├── docs/                    # Product, UX, architecture, decisions, test roadmap
├── tests/
│   ├── unit/                # Unit tests
│   └── e2e/                 # Browser smoke tests
├── .github/workflows/       # CI workflow
├── COPYRIGHT                # Copyright and permissions notice
└── README.md
~~~

## 📚 PROJECT DOCUMENTATION

The <code>docs/</code> directory is the reference for scope and design:

- [Product Requirements (PRD)](docs/PRD.md)
- [Software Requirements (SRS)](docs/SRS.md)
- [User Experience (UX)](docs/UX.md)
- [System Architecture](docs/ARCHITECTURE.md)
- [Engineering Decisions](docs/DECISIONS.md)
- [Test Roadmap](docs/TEST_ROADMAP.md)
- [Backend Plan](docs/BACKEND.md)

## 🟩 BUILD PRINCIPLES

- 🎨 **Visuals first:** keep the interface focused and the controls understandable.
- 🧪 **Test it:** run quality checks before calling a milestone complete.
- 🔒 **Privacy by design:** the intended audio workflow is on-device.
- ♿ **Accessibility matters:** keep labels, navigation, and motion safety in scope.
- 🛠️ **Be honest about progress:** planned features stay labelled as planned until implemented.

<img src="https://raw.githubusercontent.com/dARSHANdR4/dARSHANdR4/main/assets/minecraft-emerald-divider.svg?v=4" width="100%" alt="Emerald pixel divider">

## © COPYRIGHT & PERMISSIONS

**Copyright © 2026 dARSHANdR4. All rights reserved.**

Unless otherwise stated, the source code and original assets in this repository are owned by [dARSHANdR4](https://github.com/dARSHANdR4). No separate software license is granted to use, reproduce, modify, distribute, sublicense, or create derivative works from the project. Permission beyond uses permitted by applicable law and GitHub's platform terms must be requested from the copyright holder in writing.

This repository is intentionally public for portfolio and showcase purposes. GitHub allows viewing and forking public repositories under its Terms of Service; this notice does not disable that platform functionality. There is no open-source license for this project.

See [<code>COPYRIGHT</code>](COPYRIGHT) for the dedicated notice.

<div align="center">

### 🌿 IDEA → CRAFT → TEST → SHIP → REPEAT

<a href="https://github.com/dARSHANdR4"><img src="https://img.shields.io/badge/BUILT_BY-dARSHANdR4-245b32?style=for-the-badge&logo=github&logoColor=8eff76" alt="Built by dARSHANdR4"></a>
<a href="https://audiocanvas-darshandr4s-projects.vercel.app/"><img src="https://img.shields.io/badge/TRY_AUDIOCANVAS-337b3e?style=for-the-badge&logo=vercel&logoColor=white" alt="Try AudioCanvas"></a>

<sub>Make something you can feel. ◈</sub>

</div>


For the full copyright and permissions notice, see [COPYRIGHT](./COPYRIGHT).
