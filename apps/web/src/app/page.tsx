import Link from 'next/link';
import { Brand } from '@/components/brand';
import { SiteFooter } from '@/components/site-header';
import { VisualizerArtwork } from '@/components/visualizer-artwork';

const capabilityCards = [
  { number: '01', label: 'PICK YOUR SCENE', detail: 'Radial waves, particle storms, synthwave worlds.', icon: '◉' },
  { number: '02', label: 'MAKE IT YOURS', detail: 'Map bass, mids and treble to every movement.', icon: '⌁' },
  { number: '03', label: 'TAKE IT FURTHER', detail: 'Go fullscreen, save presets, export your mix.', icon: '↗' },
] as const;

export default function HomePage() {
  return (
    <div className="landing-page">
      <header className="landing-header">
        <Brand />
        <nav aria-label="Main navigation" className="main-nav">
          <Link href="#how-it-works">How it works</Link>
          <Link href="/gallery">Explore gallery</Link>
        </nav>
        <Link className="button button--outline button--small" href="/studio">Open studio <span aria-hidden="true">↗</span></Link>
      </header>

      <main>
        <section className="hero-section">
          <div className="hero-copy">
            <div className="hero-kicker"><span className="live-dot" /> A NEW WAVE OF VISUALS <span className="kicker-line" /></div>
            <h1>Let your music<br /> <span className="headline-gradient">take shape.</span></h1>
            <p className="hero-description">A sound-reactive visualizer studio for people who feel music in color, motion, and light. No code. Just your sound and a little imagination.</p>
            <div className="hero-actions">
              <Link className="button button--primary button--large" href="/studio">Open the studio <span aria-hidden="true">↗</span></Link>
              <Link className="button button--text button--large" href="/gallery"><span className="play-triangle" aria-hidden="true">▷</span> Explore the gallery</Link>
            </div>
            <div className="hero-footnote"><span className="privacy-lock" aria-hidden="true">◇</span><span>Your audio stays on your device.</span><span className="footnote-dot">·</span><span>Made for the feeling.</span></div>
          </div>
          <div className="hero-visual">
            <div className="hero-visual__halo hero-visual__halo--one" />
            <div className="hero-visual__halo hero-visual__halo--two" />
            <div className="hero-visual__topline"><span>VISUAL FREQUENCY / 001</span><span className="visualiser-status"><span className="live-dot" /> PREVIEW</span></div>
            <VisualizerArtwork />
            <div className="floating-chip floating-chip--top"><span className="chip-icon chip-icon--cyan">⌁</span><span><strong>Sound in</strong><small>Bass · Mid · Treble</small></span></div>
            <div className="floating-chip floating-chip--bottom"><span className="chip-icon chip-icon--pink">✳</span><span><strong>Art out</strong><small>Limitless possibilities</small></span></div>
            <p className="hero-visual__disclaimer">STATIC PREVIEW · AUDIO ENGINE COMING IN M1</p>
          </div>
        </section>

        <section aria-label="Product highlights" className="hero-metrics">
          <div><strong>03</strong><span>STARTER SCENES</span></div>
          <div><strong>∞</strong><span>WAYS TO PLAY</span></div>
          <div><strong>0</strong><span>SHADERS REQUIRED</span></div>
          <div className="metrics-note"><span className="metrics-note__dot" /> PRIVATE BY DESIGN</div>
        </section>

        <section className="how-section" id="how-it-works">
          <div className="section-heading">
            <div><p className="eyebrow">A STUDIO FOR YOUR SENSES</p><h2>Three steps. <span>Infinite atmosphere.</span></h2></div>
            <p>Everything you need to build a visual identity for your sound, right in the browser.</p>
          </div>
          <div className="capability-grid">
            {capabilityCards.map((card) => (
              <article className="capability-card" key={card.number}>
                <div className="capability-card__top"><span>{card.number} / 03</span><span aria-hidden="true" className="capability-card__icon">{card.icon}</span></div>
                <h3>{card.label}</h3><p>{card.detail}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="closing-cta">
          <div className="closing-cta__orb" aria-hidden="true" />
          <p className="eyebrow">YOUR NEXT FREQUENCY</p>
          <h2>Ready to see what<br /><span>your sound looks like?</span></h2>
          <Link className="button button--primary button--large" href="/studio">Step into the studio <span aria-hidden="true">↗</span></Link>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
