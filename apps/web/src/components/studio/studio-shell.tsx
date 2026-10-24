import Link from 'next/link';
import { Brand } from '../brand';
import { VisualizerCanvas } from './visualizer-canvas';
import { CameraStudio } from './camera-studio';
import { AudioWorkbench } from './audio-workbench';
import { SceneSelector } from './scene-selector';
import { SafetyControls } from './safety-controls';
import { AudioMappingPanel } from './audio-mapping-panel';

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
            <span className="state-pill"><span className="status-dot" /> M3 · AUDIO MAPPING</span>
          </div>
          <div className="stage-wrap">
            <VisualizerCanvas />
            <CameraStudio />
            <div className="stage-corner stage-corner--top-left"><span>AC / 001</span><span>16:9</span></div>
            <div className="stage-corner stage-corner--bottom-right"><span>WEBGL2</span><span className="status-dot" /> <span data-scene-label>RADIAL WAVE DISK</span></div>
          </div>
          <AudioWorkbench />
          <SafetyControls placement="mobile" />
          <p className="studio-mobile-note">Seven visual styles are available: spectrum, particles, tunnel, waveform, spectrogram, mandala and liquid mesh. The renderer swaps scenes without restarting audio.</p>
        </section>

        <aside aria-label="Customization panels" className="studio-inspector">
          <div className="inspector-tabs" aria-label="Customization panel sections">
            <span className="inspector-tab inspector-tab--active">Mapping</span>
            <span className="inspector-tab">Theme</span>
            <span className="inspector-tab">Effects</span>
            <span className="inspector-tab">Audio</span>
          </div>
          <AudioMappingPanel />
          <SafetyControls placement="desktop" />
        </aside>
      </div>
      <footer className="studio-statusbar"><span><span className="status-dot" /> M3 · MAPPING MVP</span><span>60 FPS TARGET</span><span>LOCAL-FIRST BY DESIGN</span><Link href="/legal/photosensitivity">Photosensitivity notice</Link></footer>
    </main>
  );
}
