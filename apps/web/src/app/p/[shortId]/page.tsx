import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { presetShortIdSchema } from '@audiocanvas/shared/schemas/preset-short-id';
import { EmptyState } from '@/components/empty-state';
import { PageFrame } from '@/components/page-frame';

export const metadata: Metadata = { title: 'Shared preset' };

type SharedPresetPageProps = { params: Promise<{ shortId: string }> };

export default async function SharedPresetPage({ params }: SharedPresetPageProps) {
  const { shortId } = await params;
  const parsedId = presetShortIdSchema.safeParse(shortId);
  if (!parsedId.success) notFound();

  return (
    <PageFrame>
      <section className="interior-page interior-page--narrow">
        <div className="interior-heading">
          <p className="eyebrow">A CANVAS WAS SHARED WITH YOU</p>
          <h1>Meet a new <span className="headline-gradient">frequency.</span></h1>
          <p>Shared preset links will load a validated visual configuration once preset support arrives.</p>
        </div>
        <div className="share-id-card"><span className="share-id-card__label">PRESET ID</span><code>{parsedId.data}</code><span className="muted-badge">ROUTE READY · M4/M6 PENDING</span></div>
        <EmptyState eyebrow="SHARED PRESET" title="This link is ready for its first preset." description="The route and identifier validation are in place. Preset retrieval and loading are not enabled in M0." icon={<span>↗</span>}>
          <Link className="button button--primary" href="/studio">Open the studio</Link>
        </EmptyState>
      </section>
    </PageFrame>
  );
}
