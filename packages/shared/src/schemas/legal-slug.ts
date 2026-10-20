import { z } from 'zod';

/** Allowed document slugs for public legal and safety pages. */
export const legalSlugSchema = z.enum(['terms', 'privacy', 'photosensitivity']);

export type LegalSlug = z.infer<typeof legalSlugSchema>;
