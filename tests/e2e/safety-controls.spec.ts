import { expect, test } from '@playwright/test';

test('Safety controls affect rendering, retain preferences, and remain interactive', async ({ page }) => {
  await page.addInitScript(() => {
    try {
      window.localStorage.setItem('audiocanvas.photosensitivity-acknowledged.v1', 'true');
      window.localStorage.setItem(
        'audiocanvas.safety-settings.v1',
        JSON.stringify({ flashLimiter: true, reducedMotion: false }),
      );
    } catch {
      // The pre-navigation about:blank document can have an opaque origin.
    }
  });

  await page.goto('/studio');
  const canvas = page.locator('.visualizer-canvas');
  await expect(canvas).toHaveAttribute('data-render-status', 'ready');
  await expect(canvas).toHaveAttribute('data-safety-flash-limiter', 'true');
  await expect(canvas).toHaveAttribute('data-safety-reduced-motion', 'false');

  const flashLimiter = page.getByRole('switch', { name: 'Flash limiter' });
  const reducedMotion = page.getByRole('switch', { name: 'Reduced motion' });

  await expect(flashLimiter).toBeChecked();
  await expect(reducedMotion).not.toBeChecked();

  await flashLimiter.uncheck();
  await expect(canvas).toHaveAttribute('data-safety-flash-limiter', 'false');
  await flashLimiter.check();
  await expect(canvas).toHaveAttribute('data-safety-flash-limiter', 'true');

  await reducedMotion.check();
  await expect(canvas).toHaveAttribute('data-safety-reduced-motion', 'true');
  await expect(reducedMotion).toBeChecked();

  // Stored settings must survive a reload and initialise the renderer as well as the controls.
  await page.reload();
  await expect(page.locator('.visualizer-canvas')).toHaveAttribute('data-render-status', 'ready');
  await expect(page.locator('.visualizer-canvas')).toHaveAttribute('data-safety-flash-limiter', 'true');
  await expect(page.locator('.visualizer-canvas')).toHaveAttribute('data-safety-reduced-motion', 'true');
  await expect(page.getByRole('switch', { name: 'Reduced motion' })).toBeChecked();

  // Simulate the browser page-visibility signal to verify the renderer pauses and resumes.
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect(page.locator('.visualizer-canvas')).toHaveAttribute('data-render-paused', 'true');

  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect(page.locator('.visualizer-canvas')).toHaveAttribute('data-render-paused', 'false');
});
