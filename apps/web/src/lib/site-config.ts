export type NavigationItem = {
  readonly label: string;
  readonly href: `/${string}`;
};

/** Primary routes shared by the landing page and application shell. */
export const SITE_NAVIGATION = [
  { label: 'Studio', href: '/studio' },
  { label: 'Gallery', href: '/gallery' },
  { label: 'My presets', href: '/me' },
] as const satisfies readonly NavigationItem[];

/** Legal routes that must be available from the public application shell. */
export const LEGAL_NAVIGATION = [
  { label: 'Terms', href: '/legal/terms' },
  { label: 'Privacy', href: '/legal/privacy' },
  { label: 'Photosensitivity', href: '/legal/photosensitivity' },
] as const satisfies readonly NavigationItem[];

/** Returns true only for same-origin path references, not protocol-relative or backslash URLs. */
export function isSafeInternalHref(href: string): boolean {
  return href.startsWith('/') && !href.startsWith('//') && !href.includes('\\');
}
