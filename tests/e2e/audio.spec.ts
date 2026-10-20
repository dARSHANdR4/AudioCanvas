import { expect, test } from '@playwright/test';

function createFiveMinuteSilentMp3(): Buffer {
  // MPEG-1 Layer III, 128 kbps, 44.1 kHz, joint stereo. Zero side/main data forms silence.
  // Each unpadded frame is 417 bytes and contains 1152 samples (about 26.12 ms).
  const frameLength = 417;
  const frameCount = Math.ceil((300 * 44_100) / 1152);
  const audio = Buffer.alloc(frameLength * frameCount);
  for (let offset = 0; offset < audio.length; offset += frameLength) {
    audio[offset] = 0xff;
    audio[offset + 1] = 0xfb;
    audio[offset + 2] = 0x90;
    audio[offset + 3] = 0x64;
  }
  return audio;
}

test.describe('M1 audio core', () => {
  test('loads the built-in demo track without a network audio asset', async ({ page }) => {
    await page.goto('/studio');
    await page.getByRole('button', { name: 'Use demo track' }).click();

    await expect(page.getByText('AudioCanvas demo track')).toBeVisible();
    await expect(page.locator('.audio-time--duration')).toHaveText('00:08');
    await expect(page.getByRole('button', { name: 'Play audio' })).toBeEnabled();
  });


  test('TC-01: decodes a five-minute MP3 and displays a 05:00 timeline', async ({ page }) => {
    await page.goto('/studio');
    await page.locator('#audio-file-input').setInputFiles({
      name: 'five-minute-silence.mp3',
      mimeType: 'audio/mpeg',
      buffer: createFiveMinuteSilentMp3(),
    });

    await expect(page.getByText('five-minute-silence.mp3')).toBeVisible({ timeout: 5_000 });
    await expect(page.locator('.audio-time--duration')).toHaveText('05:00', { timeout: 5_000 });
    await expect(page.getByRole('slider', { name: 'Seek audio' })).toBeEnabled();
  });

  test('TC-02: rejects a .txt file without crashing the studio', async ({ page }) => {
    await page.goto('/studio');
    await page.locator('#audio-file-input').setInputFiles({
      name: 'notes.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('not audio'),
    });

    await expect(page.locator('.audio-error')).toContainText('Unsupported file type');
    await expect(page.getByRole('heading', { name: 'Your sound, reimagined.' })).toBeVisible();
  });

  test('TC-03: microphone denial shows guidance and offers file input', async ({ page }) => {
    await page.addInitScript(() => {
      const existing = navigator.mediaDevices;
      Object.defineProperty(navigator, 'mediaDevices', {
        configurable: true,
        value: {
          ...existing,
          getUserMedia: () => Promise.reject(new DOMException('Permission denied', 'NotAllowedError')),
          enumerateDevices: () => Promise.resolve([]),
        },
      });
    });
    await page.goto('/studio');
    await page.getByRole('button', { name: 'Enable microphone' }).click();

    await expect(page.locator('.audio-error')).toContainText('Microphone permission was denied');
    await expect(page.getByLabel('Choose audio file')).toBeAttached();
  });
});
