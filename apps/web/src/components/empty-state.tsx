import type { ReactNode } from 'react';

export function EmptyState({
  eyebrow,
  title,
  description,
  icon,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  icon: ReactNode;
  children?: ReactNode;
}) {
  return (
    <section aria-labelledby="empty-state-title" className="empty-state">
      <div aria-hidden="true" className="empty-state__icon">{icon}</div>
      <p className="eyebrow">{eyebrow}</p>
      <h2 id="empty-state-title">{title}</h2>
      <p className="empty-state__description">{description}</p>
      {children ? <div className="empty-state__actions">{children}</div> : null}
    </section>
  );
}
