import type { Metadata } from 'next';
import { StudioShell } from '@/components/studio/studio-shell';

export const metadata: Metadata = { title: 'Studio' };

export default function StudioPage() {
  return <StudioShell />;
}
