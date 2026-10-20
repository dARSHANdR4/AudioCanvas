import type { Metadata } from 'next';
import Link from 'next/link';
import { legalSlugSchema } from '@audiocanvas/shared/schemas/legal-slug';
import { notFound } from 'next/navigation';
import { PageFrame } from '@/components/page-frame';

const LEGAL_PAGES = {
  terms: { title: 'Terms of use', eyebrow: 'LEGAL / TERMS', description: 'The final terms of use will be published before public launch.' },
  privacy: { title: 'Privacy by design', eyebrow: 'LEGAL / PRIVACY', description: 'AudioCanvas is designed to process music on your device. A complete privacy policy will be reviewed and published before public launch.' },
  photosensitivity: { title: 'A note on light', eyebrow: 'SAFETY / PHOTOSENSITIVITY', description: 'Audio-reactive visuals can include bright colors, contrast changes, and motion. Stop viewing if you feel discomfort. The visualizer will provide an enabled-by-default flash limiter and reduced-motion controls in the relevant milestones.' },
} as const;

type LegalPageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: LegalPageProps): Promise<Metadata> {
  const { slug } = await params;
  const parsedSlug = legalSlugSchema.safeParse(slug);
  if (!parsedSlug.success) return { title: 'Legal information' };
  return { title: LEGAL_PAGES[parsedSlug.data].title };
}

export default async function LegalPage({ params }: LegalPageProps) {
  const { slug } = await params;
  const parsedSlug = legalSlugSchema.safeParse(slug);
  if (!parsedSlug.success) notFound();
  const page = LEGAL_PAGES[parsedSlug.data];
  return (
    <PageFrame>
      <section className="interior-page interior-page--narrow legal-page">
        <p className="eyebrow">{page.eyebrow}</p>
        <h1>{page.title}</h1>
        <p className="legal-lead">{page.description}</p>
        <div className="legal-disclaimer"><strong>Documentation-stage content</strong><p>This page is a product scaffold, not a substitute for reviewed legal terms. Final policy language and contact details must be added before launch.</p></div>
        <Link className="text-link" href="/">← Back to AudioCanvas</Link>
      </section>
    </PageFrame>
  );
}
