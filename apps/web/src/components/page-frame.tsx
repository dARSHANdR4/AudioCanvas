import type { ReactNode } from 'react';
import { SiteFooter, SiteHeader } from './site-header';

export function PageFrame({ children }: { children: ReactNode }) {
  return (
    <div className="site-frame">
      <SiteHeader />
      <main className="content-main">{children}</main>
      <SiteFooter />
    </div>
  );
}
