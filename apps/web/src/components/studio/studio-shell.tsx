import Link from 'next/link';
import { Brand } from '../brand';
import { VisualizerCanvas } from './visualizer-canvas';
import { CameraStudio } from './camera-studio';
import { AudioWorkbench } from './audio-workbench';
import { SceneSelector } from './scene-selector';

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
          <SceneSelector />
          <div className="sidebar-note">
            <span className="status-dot status-dot--muted" />
            <p>Choose from seven distinct visual styles. Switching scenes keeps your audio playing.</p>
          </div>
        </aside>

        <section aria-label="Visualizer canvas" className="studio-stage-column">
          <div className="stage-heading">
            <div>
              <p className="eyebrow">CANVAS VIEWPORT</p>
              <h1>Your sound, reimagined.</h1>
            </div>
            <span className="state-pill"><span className="status-dot" /> M2 · VISUAL LIBRARY</span>
          </div>
          <div className="stage-wrap">
            <VisualizerCanvas />
            <CameraStudio />
            <div className="stage-corner stage-corner--top-left"><span>AC / 001</span><span>16:9</span></div>
            <div className="stage-corner stage-corner--bottom-right"><span>WEBGL2</span><span className="status-dot" /> <span data-scene-label>RADIAL WAVE DISK</span></div>
          </div>
          <AudioWorkbench />
          <p className="studio-mobile-note">Seven visual styles are available: spectrum, particles, tunnel, waveform, spectrogram, mandala and liquid mesh. The renderer swaps scenes without restarting audio.</p>
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
      <footer className="studio-statusbar"><span><span className="status-dot" /> M2 · VISUAL LIBRARY PREVIEW</span><span>60 FPS TARGET</span><span>LOCAL-FIRST BY DESIGN</span><Link href="/legal/photosensitivity">Photosensitivity notice</Link></footer>
    </main>
  );
}
