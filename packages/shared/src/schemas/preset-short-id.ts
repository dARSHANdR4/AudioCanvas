import { z } from 'zod';

/** Validates the public identifier used by `/p/{shortId}` share links. */
export const presetShortIdSchema = z
  .string()
  .min(1)
  .max(10)
  .regex(/^[A-Za-z0-9_-]+$/, 'Preset IDs may contain only letters, numbers, hyphens, and underscores.');

export type PresetShortId = z.infer<typeof presetShortIdSchema>;
