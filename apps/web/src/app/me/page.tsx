import type { Metadata } from 'next';
import Link from 'next/link';
import { EmptyState } from '@/components/empty-state';
import { PageFrame } from '@/components/page-frame';

export const metadata: Metadata = { title: 'My presets' };

export default function MyPresetsPage() {
  return (
    <PageFrame>
      <section className="interior-page">
        <div className="interior-heading">
          <p className="eyebrow">YOUR CREATIVE SPACE</p>
          <h1>My <span className="headline-gradient">presets.</span></h1>
          <p>Your sounds, your settings, your signature look.</p>
        </div>
        <div className="account-summary-strip">
          <div className="account-avatar" aria-hidden="true">AC</div>
          <div><strong>Local workspace</strong><p>Guest mode · no account connected</p></div>
          <span className="state-pill"><span className="status-dot status-dot--muted" /> AUTH IN M6</span>
        </div>
        <EmptyState eyebrow="PRESETS / M4" title="A blank canvas, for now." description="Local preset storage and session restore arrive in M4. Cloud sync, account settings, and saved preset management follow in M6." icon={<span>◇</span>}>
          <Link className="button button--primary" href="/studio">Create in studio <span aria-hidden="true">↗</span></Link>
        </EmptyState>
      </section>
    </PageFrame>
  );
}
