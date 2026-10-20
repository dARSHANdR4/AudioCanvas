# AudioCanvas — Product Requirements Document (PRD)

*Version 1.0 · Working title: AudioCanvas · Browser-based generative audio-visual studio*

## 1.1 Overview

**Product:** AudioCanvas, a web app where anyone can load music and design sound-reactive visuals in the spirit of Winamp, MilkDrop and Windows Media Player visualizers, without writing shader code. Users tune visuals with sliders, then play them fullscreen or export them as MP4 video.

**One-line pitch:** A nostalgic, no-code visualizer studio that turns any song into shareable generative art.

**Problem:** Classic visualizers disappeared with desktop media players. Modern tools such as After Effects or TouchDesigner are powerful but have a steep learning curve. Musicians, DJs, streamers and short-form creators need a fast, free, browser-based way to make music visuals that look good and export cleanly.

**Solution:** A browser studio with three starter scenes, real-time audio analysis split into bass, mid and treble channels, a simple mapping panel ("Bass → Scale"), color themes, post-processing, a fullscreen VJ mode and deterministic MP4 export.

## 1.2 Goals and Non-Goals

**Goals (MVP):**

- G1. A user can go from landing page to a playing visual in under 30 seconds.
- G2. Visuals feel tightly coupled to music (latency under 50 ms, 60 FPS on mid-range hardware).
- G3. A user can customize audio-to-visual mappings without code.
- G4. A user can export a 1080p MP4 with the original audio, with no dropped frames.
- G5. A user can save and share a preset as a link.

**Non-Goals (MVP):**

- Custom GLSL or node-graph editing (post-MVP).
- Spotify or SoundCloud streaming (DRM and licensing; post-MVP).
- Team collaboration, real-time multi-user editing.
- Native mobile apps (responsive web only).
- Monetization and payments (architecture must allow it later).

## 1.3 Target Users and Personas

| Persona | Description | Key need |
| --- | --- | --- |
| **Maya, the Short-form Creator** | 22, makes TikTok and Reels content for her own music | Vertical 9:16 export, quick presets, looks good immediately |
| **Dev, the Bedroom DJ / Live Performer** | 28, plays small events and streams on Twitch | Mic input, fullscreen mode, reliable live performance, OBS capture |
| **Sam, the Nostalgic Hobbyist** | 35, misses Winamp and MilkDrop | Familiar, reactive, tweakable visuals; sharing presets |
| **Priya, the Indie Musician** | 26, uploads tracks to YouTube | Branded music videos, 16:9 export, consistent color themes |

## 1.4 User Stories and Acceptance Criteria

| ID | Story | Acceptance criteria |
| --- | --- | --- |
| US-01 | As a user, I drag an MP3/WAV/FLAC onto the page so I can visualize it. | File decodes in under 5 s for a 5-minute track; waveform timeline and duration shown; unsupported files show a clear error. |
| US-02 | As a DJ, I enable my microphone so visuals react to live sound. | Browser permission prompt handled; denied permission shows guidance; level meter confirms signal. |
| US-03 | As a user, I choose one of three starter scenes. | Scene switches in under 500 ms without audio interruption. |
| US-04 | As a user, I map bass, mid and treble to visual parameters. | Each mapping has a source band, target parameter, intensity (0–200%), smoothing and enable toggle; changes apply live. |
| US-05 | As a user, I pick a color theme. | At least 6 themes; theme change animates over ~400 ms. |
| US-06 | As a user, I adjust bloom, motion blur and chromatic aberration. | Sliders update live; "Reset effects" returns defaults. |
| US-07 | As a user, I press Space to play or pause. | Works when focus is not in a text field; state indicator updates. |
| US-08 | As a performer, I enter fullscreen VJ mode. | All UI hidden; Esc exits; cursor auto-hides after 2 s; optional transparent background for OBS. |
| US-09 | As a creator, I export an MP4. | Choose 16:9 or 9:16, 1080p, 30 or 60 FPS; progress bar and cancel; output contains original audio, in sync within 1 frame. |
| US-10 | As a user, I save my settings as a preset. | Preset saved locally immediately; signed-in users can sync to cloud. |
| US-11 | As a user, I share a preset via URL. | Link loads the same scene, mappings and theme for any visitor. |
| US-12 | As a visitor, I browse community presets. | Gallery with thumbnails, sort by newest and popular, one-click "Try with my audio". |

## 1.5 Feature Prioritization (MoSCoW)

**Must have:** audio file upload, mic input, FFT band analysis (sub-bass/bass, mid, treble), three scenes, mapping panel, color themes, bloom, play/pause, fullscreen, MP4 export, local preset save, URL-shareable preset.

**Should have:** beat/onset detection triggers, accounts and cloud preset sync, community gallery, chromatic aberration, motion blur, keyboard shortcuts, auto-saved session.

**Could have:** OBS transparent browser-source mode, WebM export, additional scenes, tempo-synced palette pulses, MIDI control.

**Won't have (MVP):** custom shader editor, streaming service integration, paid plans, collaborative editing.

## 1.6 Success Metrics

| Metric | Target (first 90 days) |
| --- | --- |
| Time to first visual | median under 30 s |
| Session-to-play rate | above 70% |
| Export completion rate (started → finished) | above 85% |
| Preset save rate per session | above 15% |
| Average FPS (p50 / p10) | 60 / 45 |
| Share-link open rate | above 25% of created links opened at least once |
| Crash-free sessions | above 99% |

## 1.7 Assumptions, Constraints, Dependencies

- Chromium-based browsers and Safari 16.4+ are primary targets; WebCodecs is required for export (Firefox falls back or shows a notice).
- Users own or have rights to the audio they upload. Audio files are processed on-device and not uploaded to servers in the MVP.
- Export runs entirely client-side; no server rendering costs.
- Autoplay policies require a user gesture before an AudioContext starts.

## 1.8 Release Plan

| Phase | Scope | Duration |
| --- | --- | --- |
| Alpha | Audio ingest, analyzer, one scene, play/pause | 3 weeks |
| Beta | Three scenes, mapping panel, themes, post-FX, fullscreen | 4 weeks |
| MVP launch | Export, presets, URL sharing, accounts (optional login) | 4 weeks |
| v1.1 | Community gallery, beat triggers, OBS mode | 4 weeks |
| v2 | Node-based editor, custom shaders, more scenes | Later |
