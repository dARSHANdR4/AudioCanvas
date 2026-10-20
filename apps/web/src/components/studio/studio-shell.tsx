import Link from 'next/link';
import { Brand } from '../brand';
import { VisualizerArtwork } from '../visualizer-artwork';
import { AudioWorkbench } from './audio-workbench';

const sceneCards = [
  { number: '01', name: 'Radial Wave Disk', tag: 'SPECTRUM', className: 'scene-thumb--radial' },
  { number: '02', name: 'Particle Vortex', tag: 'PARTICLES', className: 'scene-thumb--vortex' },
  { number: '03', name: 'Synthwave Tunnel', tag: 'PERSPECTIVE', className: 'scene-thumb--tunnel' },
] as const;

export function StudioShell() {
  return (
    <main className="studio-shell">
      <header className="studio-topbar">
        <div className="studio-topbar__identity">
          <Brand compact />
          <span className="topbar-divider" />
          <div className="project-name">
            <span className="project-name__label">PROJECT</span>
            <span>Untitled session</span>
          </div>
        </div>
        <div className="studio-topbar__actions" aria-label="Project actions">
          <button className="icon-button" disabled title="Undo will be available in M3" type="button" aria-label="Undo">
            ↶
          </button>
          <button className="icon-button" disabled title="Redo will be available in M3" type="button" aria-label="Redo">
            ↷
          </button>
          <span className="topbar-divider topbar-divider--actions" />
          <button className="button button--ghost button--small" disabled type="button">Save</button>
          <button className="button button--ghost button--small" disabled type="button">Share</button>
          <button className="button button--primary button--small" disabled type="button">Export <span aria-hidden="true">↗</span></button>
          <Link className="button button--outline button--small studio-exit" href="/">Exit studio</Link>
        </div>
      </header>

      <div className="studio-workspace">
        <aside aria-label="Scene selection" className="studio-sidebar">
          <div className="panel-heading">
            <span className="eyebrow">01 / VISUALS</span>
            <h2>Scenes</h2>
          </div>
          <div className="scene-card-list">
            {sceneCards.map((scene, index) => (
              <article className={`scene-card${index === 0 ? ' scene-card--active' : ''}`} key={scene.number}>
                <div aria-hidden="true" className={`scene-thumb ${scene.className}`}>
                  <span className="scene-thumb__orbit" />
                  <span className="scene-thumb__core" />
                  <span className="scene-thumb__code">{scene.number}</span>
                </div>
                <div className="scene-card__details">
                  <span className="scene-card__tag">{scene.tag}</span>
                  <h3>{scene.name}</h3>
                </div>
                <span aria-label="Scene selection available in M2" className="scene-card__status">{index === 0 ? '01' : '—'}</span>
              </article>
            ))}
          </div>
          <div className="sidebar-note">
            <span className="status-dot status-dot--muted" />
            <p>Scene rendering is being wired up in <strong>M2</strong>.</p>
          </div>
        </aside>

        <section aria-label="Visualizer canvas" className="studio-stage-column">
          <div className="stage-heading">
            <div>
              <p className="eyebrow">CANVAS VIEWPORT</p>
              <h1>Your sound, reimagined.</h1>
            </div>
            <span className="state-pill"><span className="status-dot status-dot--muted" /> M1 AUDIO CORE</span>
          </div>
          <div className="stage-wrap">
            <VisualizerArtwork label="Static decorative preview. Audio-reactive rendering is not enabled in M0." />
            <div className="stage-center-note">
              <span className="stage-center-note__icon" aria-hidden="true">◌</span>
              <span className="eyebrow">THE CANVAS IS READY</span>
              <p>Audio analysis is ready. Reactive 3D rendering arrives in M2.</p>
            </div>
            <div className="stage-corner stage-corner--top-left"><span>AC / 001</span><span>16:9</span></div>
            <div className="stage-corner stage-corner--bottom-right"><span>WEBGL2</span><span className="status-dot status-dot--muted" /> NOT INITIALIZED</div>
          </div>
          <AudioWorkbench />
          <p className="studio-mobile-note">Audio file decoding, playback, microphone analysis, and the seekable timeline are enabled in M1. Reactive 3D scenes and export arrive in M2 and M5.</p>
        </section>

        <aside aria-label="Customization panels" className="studio-inspector">
          <div className="inspector-tabs" aria-label="Customization panel sections">
            <span className="inspector-tab inspector-tab--active">Mapping</span>
            <span className="inspector-tab">Theme</span>
            <span className="inspector-tab">Effects</span>
            <span className="inspector-tab">Audio</span>
          </div>
          <section className="inspector-section">
            <div className="inspector-title-row">
              <div><span className="eyebrow">02 / RESPONSE</span><h2>Audio mapping</h2></div>
              <span className="muted-badge">M3</span>
            </div>
            <p className="inspector-copy">Connect each part of your sound to a visual parameter. Mapping controls activate in M3.</p>
            <div className="mapping-list">
              {[
                { source: 'BASS', target: 'Mesh scale', color: 'cyan', percent: '72%' },
                { source: 'MID', target: 'Rotation speed', color: 'purple', percent: '48%' },
                { source: 'TREBLE', target: 'Bloom intensity', color: 'pink', percent: '64%' },
              ].map((mapping) => (
                <div className="mapping-card" key={mapping.source}>
                  <div className="mapping-card__header"><span className={`mapping-source mapping-source--${mapping.color}`}>{mapping.source}</span><span className="mapping-ellipsis">•••</span></div>
                  <div className="mapping-arrow" aria-hidden="true">↓</div>
                  <div className="mapping-target">{mapping.target}</div>
                  <div aria-hidden="true" className="mapping-meter"><span className={`mapping-meter__fill mapping-meter__fill--${mapping.color}`} style={{ width: mapping.percent }} /></div>
                  <div className="mapping-card__footer"><span>INTENSITY</span><span>{mapping.percent}</span></div>
                </div>
              ))}
            </div>
            <button className="button button--dashed button--full" disabled type="button">＋ Add mapping <span>Available in M3</span></button>
          </section>
          <section className="inspector-section inspector-section--lower">
            <div className="inspector-title-row"><h2>Safety</h2><span className="safety-on">DEFAULTS ON</span></div>
            <div className="safety-row"><span><span className="safety-icon">✳</span> Flash limiter</span><span className="toggle-static" aria-label="Flash limiter enabled by default"><span /></span></div>
            <div className="safety-row"><span><span className="safety-icon">◐</span> Reduced motion</span><span className="toggle-static toggle-static--off" aria-label="Reduced motion setting available in M3"><span /></span></div>
            <p className="fine-print">Flash limiting and motion preferences will control the renderer when it ships.</p>
          </section>
        </aside>
      </div>
      <footer className="studio-statusbar"><span><span className="status-dot status-dot--muted" /> M1 · AUDIO CORE ENABLED</span><span>60 FPS TARGET</span><span>LOCAL-FIRST BY DESIGN</span><Link href="/legal/photosensitivity">Photosensitivity notice</Link></footer>
    </main>
  );
}
