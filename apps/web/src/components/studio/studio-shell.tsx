import Link from 'next/link';
import { Brand } from '@/components/brand';
import { VisualizerArtwork } from '@/components/visualizer-artwork';

const SCENES = [
  { number: '01', name: 'Radial Wave Disk', active: true, desc: 'Orbiting frequency' },
  { number: '02', name: 'Particle Vortex', active: false, desc: 'Matter in motion' },
  { number: '03', name: 'Synthwave Tunnel', active: false, desc: 'Into the horizon' },
];

export function StudioShell() {
  return (
    <main className="studio-shell">
      <header className="studio-topbar">
        <Brand />
        <div className="studio-project-name"><span className="status-dot status-dot--muted" /> Untitled canvas <span className="muted-badge">M0 PREVIEW</span></div>
        <nav className="studio-actions" aria-label="Studio actions">
          <Link href="/gallery">Gallery</Link>
          <button className="button button--small button--primary" type="button" disabled title="Export arrives in M5">Export <span aria-hidden="true">↗</span></button>
        </nav>
      </header>
      <div className="studio-workspace">
        <aside className="scene-rail" aria-label="Starter scenes">
          <p className="eyebrow">SCENES / 03</p>
          {SCENES.map((scene) => (
            <button className={scene.active ? 'scene-card scene-card--active' : 'scene-card'} disabled key={scene.number} type="button" aria-label={scene.name} title="Scene switching arrives in M2">
              <span className="scene-card__preview"><span>{scene.number}</span><i aria-hidden="true" /></span>
              <strong>{scene.name}</strong><small>{scene.desc}</small>
            </button>
          ))}
          <div className="scene-rail__note">Interactive scenes arrive in M2.</div>
        </aside>
        <section className="studio-canvas" aria-label="Visualizer preview">
          <div className="studio-canvas__corner studio-canvas__corner--tl" /><div className="studio-canvas__corner studio-canvas__corner--tr" /><div className="studio-canvas__corner studio-canvas__corner--bl" /><div className="studio-canvas__corner studio-canvas__corner--br" />
          <div className="studio-canvas__topline"><span>CANVAS / 001</span><span className="visualiser-status"><span className="live-dot" /> STATIC ARTWORK</span></div>
          <div className="studio-canvas__art"><VisualizerArtwork /></div>
          <div className="studio-canvas__caption"><span>RADIAL WAVE DISK</span><span>STATIC PREVIEW · ENGINE IN M1/M2</span></div>
        </section>
        <aside className="studio-controls" aria-label="Studio controls">
          <div className="control-panel__heading"><p className="eyebrow">CONTROL ROOM</p><span className="state-pill"><span className="status-dot status-dot--muted" /> INACTIVE</span></div>
          <div className="control-tabs" role="tablist" aria-label="Control panels">
            <button aria-selected="true" className="control-tab control-tab--active" role="tab" type="button">Mapping</button>
            <button aria-selected="false" className="control-tab" role="tab" type="button" disabled>Theme</button>
            <button aria-selected="false" className="control-tab" role="tab" type="button" disabled>Effects</button>
          </div>
          <div className="mapping-preview">
            <div className="mapping-preview__heading"><span>SOURCE → TARGET</span><span>INTENSITY</span></div>
            {[['BASS', 'Mesh scale', '80%'], ['MID', 'Rotation speed', '45%'], ['TREBLE', 'Bloom intensity', '60%']].map(([source, target, intensity]) => (
              <div className="mapping-row" key={source}>
                <span className="mapping-source">{source}</span><span className="mapping-arrow" aria-hidden="true">→</span><span className="mapping-target">{target}</span><span className="mapping-intensity">{intensity}</span>
              </div>
            ))}
            <button className="mapping-add" disabled type="button">+ Add mapping <span>M3</span></button>
          </div>
          <div className="audio-input-panel">
            <p className="eyebrow">AUDIO INPUT / M1</p>
            <label className="file-drop-preview" htmlFor="audio-file-demo">
              <span className="file-drop-preview__icon" aria-hidden="true">↑</span><span><strong>Drop your track here</strong><small>MP3 · WAV · FLAC · OGG · M4A</small></span>
            </label>
            <input id="audio-file-demo" type="file" accept=".mp3,.wav,.flac,.ogg,.m4a,audio/*" disabled className="visually-hidden" />
            <p className="studio-note">Local audio ingestion arrives in M1. No audio is uploaded.</p>
          </div>
          <div className="studio-safety-note"><span aria-hidden="true">◇</span><p>Designed for local-first creativity. Your audio stays on this device.</p></div>
        </aside>
      </div>
      <footer className="studio-transport">
        <button className="transport-play" disabled type="button" aria-label="Play preview" title="Playback arrives in M1">▶</button>
        <span className="transport-time">00:00 <span>/ 00:00</span></span>
        <div className="transport-track" role="img" aria-label="Waveform timeline preview (inactive)"><span /></div>
        <button className="transport-volume" disabled type="button" aria-label="Mute audio">◖</button>
        <span className="transport-status"><span className="status-dot status-dot--muted" /> AUDIO ENGINE OFFLINE</span>
      </footer>
    </main>
  );
}
