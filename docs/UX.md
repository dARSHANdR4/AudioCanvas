# AudioCanvas — UI/UX Flow and Screen Specifications

*Version 1.0*

## 3.1 Design Principles

1. **Visuals first.** The canvas is the hero; panels are collapsible overlays that never fully block it.
2. **Instant gratification.** A demo track plays visuals before the user uploads anything.
3. **Familiar controls.** Sliders, toggles and dropdowns; labels in plain language ("Bass → Pulse"), not DSP jargon.
4. **Safe by default.** Photosensitivity-aware defaults; flash limiter on.
5. **Nostalgic but modern.** Dark UI, neon accents, subtle CRT/retro cues without hurting legibility.

## 3.2 Information Architecture

| Route | Screen | Auth |
| --- | --- | --- |
| `/` | Landing and instant demo | Public |
| `/studio` | Main studio (canvas, panels, timeline) | Public |
| `/studio?preset={id}` or `/p/{shortId}` | Studio with loaded preset | Public |
| `/gallery` | Community presets | Public |
| `/me` | My presets, account settings | Signed in |
| `/legal/*` | Terms, privacy, photosensitivity notice | Public |

## 3.3 Primary User Flow

```
Landing → (Try demo OR drop file OR enable mic) → Studio loads with default scene
   → Pick scene → Tune mappings / theme / FX → Play & audition
   → Branch A: Fullscreen VJ mode
   → Branch B: Export MP4 (choose ratio, fps, range) → Render progress → Download
   → Branch C: Save preset → Share link / Publish to gallery
```

### Alternate and Error Flows

| Situation | Behavior |
| --- | --- |
| Unsupported file | Inline toast with accepted formats; drop zone remains active |
| Mic permission denied | Modal explaining how to re-enable in browser settings; offer file upload instead |
| WebCodecs unavailable | Export button opens compatibility dialog with fallback option |
| Low FPS detected | Non-blocking banner: "Reduce quality?" with one-click auto-tune |
| Tab hidden during export | Warning to keep tab focused (or auto-pause and resume) |
| Large export | Pre-export size/time estimate and confirm |
| First visit | One-time photosensitivity notice and 4-step coach-mark tour |

## 3.4 Screen Specifications

### Screen A — Landing (`/`)

- Full-bleed live visualizer running on a bundled demo loop (muted until click).
- Headline, subhead, primary CTA **Open Studio**, secondary CTAs **Drop a song** and **Use microphone**.
- Row of three scene thumbnails (animated GIF/WebM previews), a short "how it works" in 3 steps, footer links.

### Screen B — Studio (`/studio`)

Layout (desktop, 1440 px reference):

```
+----------------------------------------------------------------------------------+
| Top bar:  Logo | Project name | Undo Redo | Save | Share | Export | Fullscreen | User |
+--------------+-----------------------------------------------+-------------------+
| Left rail    |                                               | Right panel       |
| (Scenes)     |           CANVAS VIEWPORT (16:9 or 9:16)      | Tabs:             |
|  - Radial    |                                               |  Mapping          |
|  - Vortex    |                                               |  Theme            |
|  - Tunnel    |                                               |  Effects          |
|              |                                               |  Audio            |
+--------------+-----------------------------------------------+-------------------+
| Transport: Play/Pause | Time | Waveform timeline (seek) | Volume | Mic toggle     |
+----------------------------------------------------------------------------------+
```

**Left rail (Scenes):** scene cards with live thumbnails; active scene highlighted; "More scenes soon" placeholder.

**Right panel tabs:**

- **Mapping:** list of mapping rows. Each row: source dropdown (Bass/Mid/Treble/Level/Beat) → target dropdown (scene-dependent) → intensity slider → smoothing slider → invert and enable toggles → delete. "Add mapping" button; live mini-meters show each band's current energy.
- **Theme:** theme chips with preview swatches; custom 3-color picker; toggle "Pulse colors on beat".
- **Effects:** bloom (strength, radius, threshold), motion blur, chromatic aberration, CRT/scanlines, "Flash limiter" toggle; "Reset effects".
- **Audio:** FFT size, attack, release, gain/auto-gain, mic device selector, input level meter.

**Transport bar:** play/pause, current/total time, waveform seek bar (mic mode shows a live meter instead), volume.

**Top bar actions:** Save (local or cloud), Share (copy link, QR code), Export (opens export modal), Fullscreen (VJ mode).

### Screen C — Export Modal

- **Step 1 Format:** aspect ratio (16:9, 9:16, 1:1), resolution (1080p default), FPS (30/60), range (full or in/out markers).
- **Step 2 Review:** estimated duration and file size, warning about keeping the tab open.
- **Step 3 Rendering:** progress bar, frame counter, live preview thumbnail, ETA, Cancel.
- **Step 4 Done:** Download MP4 button, Share preset, "Export another".

### Screen D — Fullscreen VJ Mode

All UI hidden; tiny, fading hint on entry ("Esc to exit, Space to pause, H for UI"); cursor auto-hides; optional "transparent background" switch in a pre-entry dialog for OBS use.

### Screen E — Gallery (`/gallery`)

Grid of preset cards (animated thumbnail, name, author, likes). Filters by scene and tag, sort by Newest or Popular. Card actions: **Try with my audio**, like, report. Detail drawer shows description, tags and Remix button.

### Screen F — My Presets (`/me`)

List of saved presets with rename, duplicate, delete, publish/unpublish; account settings; data export and delete account.

## 3.5 Component Inventory

Button, IconButton, Slider (with numeric input), Toggle, Select, Tabs, Modal, Toast, Tooltip, Drawer, ProgressBar, LevelMeter, WaveformTimeline, ColorSwatch, ColorPicker, SceneCard, PresetCard, MappingRow, Banner, CoachMark, KeyboardShortcutsSheet.

## 3.6 Visual Design Tokens

| Token | Value |
| --- | --- |
| Background | `#0A0A12` |
| Panel surface | `#12121F` with 80% opacity and blur |
| Primary accent | `#00F5FF` (cyan) |
| Secondary accent | `#FF2BD6` (magenta) |
| Success / Warning / Danger | `#3DDC97` / `#FFC857` / `#FF5A5F` |
| Text primary / secondary | `#F2F2FA` / `#A0A0C0` |
| Font | Inter (UI), JetBrains Mono (numeric readouts) |
| Radius | 10 px panels, 6 px controls |
| Motion | 150–250 ms ease-out; disabled under reduced-motion |

## 3.7 Responsive Behavior

- **Tablet:** panels become slide-over drawers; canvas remains central.
- **Mobile:** canvas on top, bottom sheet with tabs; export limited to 720p with a notice if hardware is limited; fullscreen via button.

## 3.8 Keyboard Shortcuts

| Key | Action |
| --- | --- |
| Space | Play/Pause |
| ← / → | Seek ±5 s |
| F | Fullscreen VJ mode |
| H | Hide/show UI |
| 1 / 2 / 3 | Switch scene |
| M | Mute |
| Ctrl/Cmd + Z / Shift+Z | Undo / Redo |
| Ctrl/Cmd + S | Save preset |
| ? | Shortcut sheet |

## 3.9 Accessibility Requirements

Visible focus rings; ARIA labels on all controls; sliders operable by keyboard with step values; color contrast 4.5:1 for text; reduced-motion toggle that calms camera shake and limits strobing; photosensitivity warning on first launch; flash limiter enabled by default; canvas has an accessible description and a "pause visuals" control.
