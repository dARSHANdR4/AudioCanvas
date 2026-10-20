import { describe, expect, it } from 'vitest';
import { isSafeInternalHref, LEGAL_NAVIGATION, SITE_NAVIGATION } from '../../apps/web/src/lib/site-config';
import { presetShortIdSchema } from '../../packages/shared/src/schemas/preset-short-id';
import { legalSlugSchema } from '../../packages/shared/src/schemas/legal-slug';

describe('M0 route configuration', () => {
  it('contains the public route destinations from the UX specification', () => {
    const destinations = [...SITE_NAVIGATION, ...LEGAL_NAVIGATION].map((item) => item.href);
    expect(destinations).toContain('/studio');
    expect(destinations).toContain('/gallery');
    expect(destinations).toContain('/me');
    expect(destinations).toContain('/legal/terms');
    expect(destinations).toContain('/legal/privacy');
    expect(destinations).toContain('/legal/photosensitivity');
  });

  it('keeps navigation hrefs internal and unique', () => {
    const destinations = [...SITE_NAVIGATION, ...LEGAL_NAVIGATION].map((item) => item.href);
    expect(new Set(destinations).size).toBe(destinations.length);
    expect(destinations.every(isSafeInternalHref)).toBe(true);
  });

  it.each(['/studio', '/gallery', '/legal/privacy'])('accepts internal path %s', (href) => {
    expect(isSafeInternalHref(href)).toBe(true);
  });

  it.each(['//evil.example', 'https://evil.example', '/\\evil.example', 'javascript:alert(1)'])(
    'rejects unsafe navigation href %s',
    (href) => {
      expect(isSafeInternalHref(href)).toBe(false);
    },
  );

  it('validates legal route slugs against the approved page list', () => {
    expect(legalSlugSchema.safeParse('privacy').success).toBe(true);
    expect(legalSlugSchema.safeParse('photosensitivity').success).toBe(true);
    expect(legalSlugSchema.safeParse('scripts').success).toBe(false);
  });

  it('validates preset share IDs', () => {
    expect(presetShortIdSchema.safeParse('x7Kp2Qa').success).toBe(true);
    expect(presetShortIdSchema.safeParse('1234567890').success).toBe(true);
    expect(presetShortIdSchema.safeParse('').success).toBe(false);
    expect(presetShortIdSchema.safeParse('has spaces').success).toBe(false);
    expect(presetShortIdSchema.safeParse('<script>').success).toBe(false);
    expect(presetShortIdSchema.safeParse('too-long-id-1').success).toBe(false);
  });
});
