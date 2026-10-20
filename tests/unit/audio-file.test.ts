import { describe, expect, it } from 'vitest';
import { AUDIO_FILE_MAX_BYTES } from '../../packages/shared/src/schemas/audio-file';
import { validateAudioFile } from '../../apps/web/src/engine/audio/audio-file';

describe('audio file metadata validation', () => {
  it.each([
    { name: 'song.mp3', size: 1024, type: 'audio/mpeg' },
    { name: 'song.wav', size: 1024, type: 'audio/wav' },
    { name: 'song.flac', size: 1024, type: 'audio/flac' },
    { name: 'song.ogg', size: 1024, type: 'audio/ogg' },
    { name: 'song.m4a', size: 1024, type: 'audio/mp4' },
    { name: 'song.MP3', size: 1024, type: '' },
  ])('accepts supported local audio metadata: $name', (file) => {
    expect(validateAudioFile(file).valid).toBe(true);
  });

  it('TC-02: rejects a .txt file with a human-readable message', () => {
    const result = validateAudioFile({ name: 'notes.txt', size: 24, type: 'text/plain' });
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.message).toContain('Unsupported file type');
  });

  it('rejects files larger than 100 MB before reading their bytes', () => {
    const result = validateAudioFile({
      name: 'large.wav',
      size: AUDIO_FILE_MAX_BYTES + 1,
      type: 'audio/wav',
    });
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.message).toContain('100 MB');
  });

  it('rejects a mismatched supported extension and MIME type', () => {
    const result = validateAudioFile({ name: 'song.mp3', size: 100, type: 'audio/wav' });
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.message).toContain('does not match');
  });

  it('rejects empty files and unsafe file names', () => {
    expect(validateAudioFile({ name: 'song.wav', size: 0, type: 'audio/wav' }).valid).toBe(false);
    expect(validateAudioFile({ name: '../song.wav', size: 10, type: 'audio/wav' }).valid).toBe(false);
  });
});
