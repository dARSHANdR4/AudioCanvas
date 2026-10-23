export interface SafetySettings {
  /** Smooths rapid audio-driven brightness/energy rises and rate-limits beat accents. */
  flashLimiter: boolean;
  /** Slows time-based animation and smooths high-frequency visual changes. */
  reducedMotion: boolean;
}

export type SafetySettingKey = keyof SafetySettings;

export const SAFETY_SETTINGS_STORAGE_KEY = 'audiocanvas.safety-settings.v1';

const DEFAULT_SETTINGS: SafetySettings = {
  flashLimiter: true,
  reducedMotion: false,
};

let settings: SafetySettings = { ...DEFAULT_SETTINGS };
let initialized = false;
const listeners = new Set<() => void>();

function notify(): void {
  listeners.forEach((listener) => listener());
}

function systemPrefersReducedMotion(): boolean {
  return typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Load saved preferences once, honoring the operating-system motion preference as the default. */
export function initializeSafetySettings(): SafetySettings {
  if (initialized) return settings;
  initialized = true;

  const systemReducedMotion = systemPrefersReducedMotion();
  settings = { ...DEFAULT_SETTINGS, reducedMotion: systemReducedMotion };

  if (typeof window !== 'undefined') {
    try {
      const stored = window.localStorage.getItem(SAFETY_SETTINGS_STORAGE_KEY);
      if (stored !== null) {
        const parsed: unknown = JSON.parse(stored);
        if (typeof parsed === 'object' && parsed !== null) {
          const candidate = parsed as Partial<SafetySettings>;
          settings = {
            flashLimiter: typeof candidate.flashLimiter === 'boolean'
              ? candidate.flashLimiter
              : DEFAULT_SETTINGS.flashLimiter,
            reducedMotion: typeof candidate.reducedMotion === 'boolean'
              ? candidate.reducedMotion
              : systemReducedMotion,
          };
        }
      }
    } catch {
      // Privacy mode or malformed storage should not disable the safety defaults.
    }
  }

  notify();
  return settings;
}

export function getSafetySettings(): SafetySettings {
  return settings;
}

export function setSafetySetting<K extends SafetySettingKey>(
  key: K,
  value: SafetySettings[K],
): void {
  if (!initialized) initializeSafetySettings();
  if (settings[key] === value) return;

  settings = { ...settings, [key]: value };
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(SAFETY_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // Keep controls functional for this session even if storage is unavailable.
    }
  }
  notify();
}

export function subscribeToSafetySettings(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
