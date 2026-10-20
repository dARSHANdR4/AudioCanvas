import {
  AUDIO_FILE_MAX_BYTES,
  audioFileMetadataSchema,
} from '@audiocanvas/shared/schemas/audio-file';

export const SUPPORTED_AUDIO_EXTENSIONS = ['mp3', 'wav', 'flac', 'ogg', 'm4a'] as const;
export type SupportedAudioExtension = (typeof SUPPORTED_AUDIO_EXTENSIONS)[number];

const MIME_TYPES_BY_EXTENSION = {
  mp3: ['audio/mpeg', 'audio/mp3'],
  wav: ['audio/wav', 'audio/x-wav', 'audio/wave', 'audio/vnd.wave'],
  flac: ['audio/flac', 'audio/x-flac'],
  ogg: ['audio/ogg', 'application/ogg'],
  m4a: ['audio/mp4', 'audio/x-m4a', 'audio/m4a'],
} as const satisfies Record<SupportedAudioExtension, readonly string[]>;

export type AudioFileValidation =
  | { valid: true; extension: SupportedAudioExtension }
  | { valid: false; message: string };

/** Validates local audio file metadata before allocating a decoder or reading file bytes. */
export function validateAudioFile(file: Pick<File, 'name' | 'size' | 'type'>): AudioFileValidation {
  if (file.size > AUDIO_FILE_MAX_BYTES) {
    return { valid: false, message: 'This file is larger than the 100 MB limit.' };
  }
  if (file.size === 0) {
    return { valid: false, message: 'This file is empty. Choose a valid audio file.' };
  }

  const parsedMetadata = audioFileMetadataSchema.safeParse({
    name: file.name,
    size: file.size,
    type: file.type || '',
  });
  if (!parsedMetadata.success) {
    return { valid: false, message: 'The selected file name or metadata is invalid.' };
  }

  const extension = file.name.split('.').pop()?.toLowerCase();
  if (
    extension === undefined ||
    !SUPPORTED_AUDIO_EXTENSIONS.includes(extension as SupportedAudioExtension)
  ) {
    return {
      valid: false,
      message: 'Unsupported file type. Choose an MP3, WAV, FLAC, OGG, or M4A file.',
    };
  }

  const supportedExtension = extension as SupportedAudioExtension;
  const mimeType = file.type.trim().toLowerCase();
  if (
    mimeType.length > 0 &&
    mimeType !== 'application/octet-stream' &&
    !(MIME_TYPES_BY_EXTENSION[supportedExtension] as readonly string[]).includes(mimeType)
  ) {
    return {
      valid: false,
      message: 'This file type does not match its extension. Choose a valid audio file.',
    };
  }

  return { valid: true, extension: supportedExtension };
}
