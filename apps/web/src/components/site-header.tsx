import Link from 'next/link';
import { LEGAL_NAVIGATION, SITE_NAVIGATION } from '@/lib/site-config';
import { Brand } from './brand';

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="site-header__inner">
        <Brand />
        <nav aria-label="Main navigation" className="main-nav">
          {SITE_NAVIGATION.map((item) => (
            <Link href={item.href} key={item.href}>
              {item.label}
            </Link>
          ))}
        </nav>
        <Link className="button button--small button--primary header-cta" href="/studio">
          Open studio <span aria-hidden="true">↗</span>
        </Link>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <p>Make something you can feel.</p>
      <nav aria-label="Legal navigation">
        {LEGAL_NAVIGATION.map((item) => (
          <Link href={item.href} key={item.href}>
            {item.label}
          </Link>
        ))}
      </nav>
      <span className="footer-note">AudioCanvas · Studio foundation M0</span>
    </footer>
  );
}
