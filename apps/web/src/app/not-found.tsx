import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="not-found-page">
      <span className="eyebrow">404 / OFF FREQUENCY</span>
      <h1>This page missed the beat.</h1>
      <p>The link may be invalid, or the page has not been added yet.</p>
      <Link className="button button--primary" href="/">Return home</Link>
    </main>
  );
}
