'use client';

import Link from 'next/link';
import { useState, useSyncExternalStore } from 'react';

const STORAGE_KEY = 'audiocanvas.photosensitivity-acknowledged.v1';
type NoticeSnapshot = 'unknown' | 'visible' | 'dismissed';

function subscribeToNotice(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => undefined;
  const handleStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) callback();
  };
  window.addEventListener('storage', handleStorage);
  return () => window.removeEventListener('storage', handleStorage);
}

function getNoticeSnapshot(): NoticeSnapshot {
  if (typeof window === 'undefined') return 'unknown';

  try {
    return window.localStorage.getItem(STORAGE_KEY) === 'true' ? 'dismissed' : 'visible';
  } catch {
    return 'visible';
  }
}

function getServerSnapshot(): NoticeSnapshot {
  return 'unknown';
}

/** Shows a dismissible first-visit safety notice without blocking the studio canvas. */
export function PhotosensitivityNotice() {
  const snapshot = useSyncExternalStore(subscribeToNotice, getNoticeSnapshot, getServerSnapshot);
  const [dismissedThisSession, setDismissedThisSession] = useState(false);

  if (snapshot !== 'visible' || dismissedThisSession) return null;

  function dismissNotice() {
    setDismissedThisSession(true);
    try {
      window.localStorage.setItem(STORAGE_KEY, 'true');
    } catch {
      // Keep the notice dismissed for this page session when storage is unavailable.
    }
  }

  return (
    <aside aria-labelledby="photosensitivity-notice-title" className="photosensitivity-notice" role="region">
      <div aria-hidden="true" className="photosensitivity-notice__symbol">!</div>
      <div className="photosensitivity-notice__copy">
        <h2 id="photosensitivity-notice-title">A note on flashing visuals</h2>
        <p>
          Audio-reactive visuals may contain bright flashes or rapid movement. Stop if you feel discomfort.
          A flash limiter will be enabled by default when reactive visuals arrive.
          {' '}
          <Link href="/legal/photosensitivity">Read the safety note</Link>.
        </p>
      </div>
      <button aria-label="Dismiss photosensitivity notice" className="photosensitivity-notice__close" onClick={dismissNotice} type="button">
        <span aria-hidden="true">×</span>
      </button>
    </aside>
  );
}
