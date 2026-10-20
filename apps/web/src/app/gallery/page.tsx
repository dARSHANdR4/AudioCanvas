import type { Metadata } from 'next';
import Link from 'next/link';
import { EmptyState } from '@/components/empty-state';
import { PageFrame } from '@/components/page-frame';

export const metadata: Metadata = { title: 'Gallery' };

export default function GalleryPage() {
  return (
    <PageFrame>
      <section className="interior-page">
        <div className="interior-heading">
          <p className="eyebrow">THE COMMUNITY CANVAS</p>
          <h1>Find your <span className="headline-gradient">frequency.</span></h1>
          <p>Discover visual moods, remix a preset, and make it your own.</p>
        </div>
        <div className="gallery-filter-bar" aria-label="Gallery filters will be available in M6">
          <span className="filter-chip filter-chip--active">All scenes</span><span className="filter-chip">Radial</span><span className="filter-chip">Vortex</span><span className="filter-chip">Tunnel</span>
          <span className="gallery-filter-spacer" /><span className="filter-sort">Newest <span aria-hidden="true">⌄</span></span>
        </div>
        <EmptyState eyebrow="GALLERY / M6" title="The gallery is tuning up." description="Community presets, likes, tags, and remixing are planned for the backend milestone. Until then, step into the studio and explore the visualizer foundation." icon={<span>✳</span>}>
          <Link className="button button--primary" href="/studio">Go to studio <span aria-hidden="true">↗</span></Link>
        </EmptyState>
      </section>
    </PageFrame>
  );
}
