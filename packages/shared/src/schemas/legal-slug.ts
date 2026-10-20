import { z } from 'zod';

export const LEGAL_SLUGS = [
  'terms',
  'privacy',
  'photosensitivity',
] as const;

export const legalSlugSchema = z.enum(LEGAL_SLUGS);
export type LegalSlug = z.infer<typeof legalSlugSchema>;
