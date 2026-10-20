import Link from 'next/link';

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link aria-label="AudioCanvas home" className={`brand${compact ? ' brand--compact' : ''}`} href="/">
      <span aria-hidden="true" className="brand-mark">
        <span />
        <span />
        <span />
        <span />
      </span>
      <span className="brand-wordmark">
        audio<span>canvas</span>
      </span>
    </Link>
  );
}
