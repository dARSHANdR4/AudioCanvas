import { z } from 'zod';

export const AUDIO_FILE_MAX_BYTES = 100 * 1024 * 1024;

export const audioFileMetadataSchema = z.object({
  name: z
    .string()
    .min(1)
    .max(255)
    .refine((value) => !/[\/\\\u0000-\u001f]/.test(value), 'The file name is invalid.'),
  size: z.number().int().nonnegative().max(AUDIO_FILE_MAX_BYTES),
  type: z.string().max(128),
}).strict();

export type AudioFileMetadata = z.infer<typeof audioFileMetadataSchema>;
