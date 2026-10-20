import { z } from 'zod';

/** Accepts short preset IDs consisting only of URL-safe ASCII characters. */
export const presetShortIdSchema = z
  .string()
  .min(1)
  .max(10)
  .regex(/^[A-Za-z0-9_-]+$/);

export type PresetShortId = z.infer<typeof presetShortIdSchema>;
