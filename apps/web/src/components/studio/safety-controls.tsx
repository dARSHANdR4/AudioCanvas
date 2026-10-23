'use client';

import { useSyncExternalStore } from 'react';
import {
  getSafetySettings,
  initializeSafetySettings,
  setSafetySetting,
  subscribeToSafetySettings,
  type SafetySettings,
} from '@/engine/scenes/safety-settings-store';

const SERVER_DEFAULT_SETTINGS: SafetySettings = Object.freeze({
  flashLimiter: true,
  reducedMotion: false,
});

function subscribe(listener: () => void): () => void {
  const unsubscribe = subscribeToSafetySettings(() => listener());
  initializeSafetySettings();
  return unsubscribe;
}

function getServerSnapshot(): SafetySettings {
  return SERVER_DEFAULT_SETTINGS;
}

export function SafetyControls({ placement = 'desktop' }: { placement?: 'desktop' | 'mobile' }) {
  const settings = useSyncExternalStore(subscribe, getSafetySettings, getServerSnapshot);
  const titleId = placement === 'mobile' ? 'safety-controls-title-mobile' : 'safety-controls-title-desktop';

  return (
    <section className={`inspector-section inspector-section--lower safety-controls safety-controls--${placement}`} aria-labelledby={titleId}>
      <div className="inspector-title-row">
        <h2 id={titleId}>Safety controls</h2>
        <span className="safety-on">LIVE</span>
      </div>

      <label className="safety-row">
        <span className="safety-row__copy">
          <strong><span className="safety-icon" aria-hidden="true">✳</span>Flash limiter</strong>
          <small>Softens abrupt brightness/energy changes and limits beat accents.</small>
        </span>
        <input
          aria-label="Flash limiter"
          className="safety-switch"
          checked={settings.flashLimiter}
          onChange={(event) => setSafetySetting('flashLimiter', event.currentTarget.checked)}
          role="switch"
          type="checkbox"
        />
      </label>

      <label className="safety-row">
        <span className="safety-row__copy">
          <strong><span className="safety-icon" aria-hidden="true">◐</span>Reduced motion</strong>
          <small>Slows animation and smooths rapid audio-driven movement.</small>
        </span>
        <input
          aria-label="Reduced motion"
          className="safety-switch"
          checked={settings.reducedMotion}
          onChange={(event) => setSafetySetting('reducedMotion', event.currentTarget.checked)}
          role="switch"
          type="checkbox"
        />
      </label>

      <p className="fine-print">
        These options reduce sudden visual changes; they are not a guarantee against all photosensitive triggers.
        Your preferences are saved in this browser.
      </p>
    </section>
  );
}
