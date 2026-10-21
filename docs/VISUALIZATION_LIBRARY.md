# AudioCanvas Visualization Library

## Research summary

Audio visualizers can encode different parts of audio in different visual forms. The browser Web Audio API exposes both frequency-domain data (useful for spectrum and frequency-history displays) and time-domain samples (useful for oscilloscope/waveform displays). AnalyserNode provides these readings without changing the audio stream. See the MDN guides linked below.

MilkDrop/Butterchurn shows a broader procedural family: animated waves, custom shapes, frame/vertex equations, shader-based image warping, and preset-defined color/motion combinations. AudioCanvas borrows the broad idea of a varied, customizable visual library—not any individual preset, shader, or artwork.

## Current native scene catalogue

| Scene | Visual family | Audio signal used | Intended feel / use |
|---|---|---|---|
| Radial Wave Disk | Radial spectrum bars and rings | FFT spectrum, bass, mid, level | Immediately readable beat-centric circle |
| Particle Vortex | GPU-driven particle field | FFT bands, level, beat pulse | Immersive, swirling electronic visuals |
| Synthwave Tunnel | Neon perspective grid/tunnel | FFT bands, level, beat pulse | Forward motion, retro/synthwave backgrounds |
| Oscilloscope Ribbon | Time-domain waveform | Actual waveform samples plus band energy | Crisp waveform / instrumental signal display |
| Spectrogram Waterfall | Frequency-vs-time history surface | Recent FFT bins | Show how a track's tone changes across time |
| Kaleidoscope Mandala | Symmetric procedural geometry | FFT bins and band energy | Organic symmetry / psychedelic geometric movement |
| Liquid Orb | Deforming 3D triangular mesh and vertex lights | FFT bins, bass, mid, treble and level | Soft, organic, reactive 3D centerpiece |

## Candidate styles for later waves

These are design candidates, not implemented features:

1. **Lissajous / stereo phase scope** — map left/right channels into XY motion. Requires per-channel waveform analysis rather than the current mono analysis frame.
2. **3D frequency terrain** — use frequency as one axis and time as another, with magnitude shaping a terrain surface; distinct from the current colored waterfall mesh by emphasizing ridge silhouettes.
3. **Fractal / feedback warp** — recursive zoom, color trails and pixel warps inspired by procedural visualizer techniques. Requires a careful persistence/compositing pass and performance limits.
4. **Fluid / ink field** — soft flowing dye-like motion driven by bass impulses and treble turbulence. Best handled as a dedicated GPU shader pass.
5. **Stereo orbit / oscilloscope rings** — split channel data into separate trails and map phase to orbit geometry.
6. **Beat-synced typography / lyric-independent typography** — rhythmic type and title-card transitions for creator scenes without requiring lyric transcription.
7. **Low-poly mesh / audio creature** — a larger silhouette with bass-driven shape and treble-driven surface details.
8. **Voxel / pixel spectrum** — grid cells or cubes whose height/color maps to frequency; useful for a retro game aesthetic.
9. **Ribbon trails / motion vectors** — path trails make direction and momentum visible, an effect family discussed in MilkDrop preset authoring.
10. **Minimal monochrome spectrum** — high-contrast, low-distraction option for overlays and accessibility.

## Product principles for adding more scenes

- Each scene should use a different visual metaphor, not only recolor the same ring.
- Connect the right source to the right representation: time-domain waveform for scopes; frequency data plus history for spectrograms; bands/beat for motion and pulses.
- Keep audio samples in mutable typed arrays outside React state.
- Keep the audio engine alive during scene changes and dispose old scene GPU resources.
- Offer low/medium/high quality levels where geometry or particles have a meaningful performance cost.
- Visual response shaping may make quiet content more legible, but must not falsify the analysis meters.
- Respect reduced-motion and photosensitivity requirements in future customization work.

## References

- MDN, Visualizations with Web Audio API: https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Visualizations_with_Web_Audio_API
- MDN, AnalyserNode.getByteTimeDomainData: https://developer.mozilla.org/en-US/docs/Web/API/AnalyserNode/getByteTimeDomainData
- MDN, Basic concepts behind Web Audio API: https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Basic_concepts_behind_Web_Audio_API
- MilkDrop.org, Preset Authoring Guide: https://milkdrop.org/resources/preset-authoring
- Butterchurn, WebGL MilkDrop implementation: https://github.com/jberg/butterchurn
- Three.js, AudioAnalyser: https://threejs.org/docs/pages/AudioAnalyser.html
