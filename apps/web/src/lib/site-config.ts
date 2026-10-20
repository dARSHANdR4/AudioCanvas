import { legalSlugSchema, LEGAL_SLUGS } from '@audiocanvas/shared/schemas/legal-slug';
import { presetShortIdSchema } from '@audiocanvas/shared/schemas/preset-short-id';

export const SITE_NAME = 'AudioCanvas';
export const SITE_DESCRIPTION =
  'A browser-based, sound-reactive visualizer studio inspired by Winamp and MilkDrop.';

export const ROUTES = {
  home: '/',
  studio: '/studio',
  gallery: '/gallery',
  me: '/me',
  preset: (shortId: string) => `/p/${shortId}`,
  legal: (slug: string) => `/legal/${slug}`,
} as const;

export function isSafeInternalHref(href: string): boolean {
  if (!href.startsWith('/') || href.startsWith('//') || href.startsWith('/\\')) {
    return false;
  }

  try {
    const parsed = new URL(href, 'https://audiocanvas.invalid');
    return parsed.origin === 'https://audiocanvas.invalid';
  } catch {
    return false;
  }
}

export function parseLegalSlug(value: string) {
  return legalSlugSchema.safeParse(value);
}

export function isLegalSlug(value: string): boolean {
  return LEGAL_SLUGS.includes(value as (typeof LEGAL_SLUGS)[number]);
}

export function isValidPresetShortId(value: string): boolean {
  return presetShortIdSchema.safeParse(value).success;
}
