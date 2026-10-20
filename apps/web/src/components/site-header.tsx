import Link from 'next/link';
import { ROUTES } from '../lib/site-config';
import { Brand } from './brand';

const NAV_ITEMS = [
  { href: ROUTES.studio, label: 'Studio' },
  { href: ROUTES.gallery, label: 'Gallery' },
  { href: ROUTES.me, label: 'My presets' },
] as const;

export function SiteHeader() {
  return (
    <header className="site-header">
      <Brand />
      <nav className="site-nav" aria-label="Main navigation">
        {NAV_ITEMS.map((item) => (
          <Link key={item.href} href={item.href}>
            {item.label}
          </Link>
        ))}
      </nav>
      <Link className="header-cta" href={ROUTES.studio}>
        Open studio <span aria-hidden="true">↗</span>
      </Link>
    </header>
  );
}
