import type { ReactNode } from 'react';
import { SiteHeader } from './site-header';

type PageFrameProps = {
  children: ReactNode;
  eyebrow?: string;
  title: string;
  description: string;
};

export function PageFrame({ children, eyebrow, title, description }: PageFrameProps) {
  return (
    <>
      <SiteHeader />
      <main className="page-frame">
        <header className="page-heading">
          {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
          <h1>{title}</h1>
          <p>{description}</p>
        </header>
        {children}
      </main>
    </>
  );
}
