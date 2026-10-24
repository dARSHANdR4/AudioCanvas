import { expect, test } from '@playwright/test';

test('theme presets apply live, stay isolated per scene, and persist after reload', async ({ page }) => {
  await page.addInitScript(() => {
    try {
      // This runs on every navigation, including reloads. Clear old test data only once per tab.
      if (sessionStorage.getItem('audiocanvas.theme-test-initialized') !== 'true') {
        localStorage.removeItem('audiocanvas.scene-themes.v1');
        sessionStorage.setItem('audiocanvas.theme-test-initialized', 'true');
      }
      localStorage.setItem('audiocanvas.photosensitivity-acknowledged.v1', 'true');
    } catch {
      // Ignore opaque-origin storage during about:blank.
    }
  });

  await page.goto('/studio');
  const canvas = page.locator('.visualizer-canvas');
  await expect(canvas).toHaveAttribute('data-render-status', 'ready');
  await expect(canvas).toHaveAttribute('data-theme', 'cyberpunk');

  await page.getByRole('tab', { name: 'Theme' }).click();
  await expect(page.getByRole('heading', { name: 'Theme presets' })).toBeVisible();
  await expect(page.getByTestId('theme-preset-card')).toHaveCount(5);

  await page.getByRole('button', { name: 'Use Aurora theme' }).click();
  await expect(canvas).toHaveAttribute('data-theme', 'aurora');
  await expect(page.getByRole('button', { name: 'Use Aurora theme' })).toHaveAttribute('aria-pressed', 'true');

  const stored = await page.evaluate(() => {
    const raw = localStorage.getItem('audiocanvas.scene-themes.v1');
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { 'radial-wave-disk': string };
    return parsed['radial-wave-disk'];
  });
  expect(stored).toBe('aurora');

  await page.getByRole('button', { name: 'Switch to Particle Vortex' }).click();
  await expect(canvas).toHaveAttribute('data-scene', 'particle-vortex');
  await expect(canvas).toHaveAttribute('data-theme', 'cyberpunk');

  await page.getByRole('button', { name: 'Switch to Radial Wave Disk' }).click();
  await expect(canvas).toHaveAttribute('data-theme', 'aurora');

  await page.reload();
  await expect(page.locator('.visualizer-canvas')).toHaveAttribute('data-render-status', 'ready');
  await page.getByRole('tab', { name: 'Theme' }).click();
  await expect(page.locator('.visualizer-canvas')).toHaveAttribute('data-theme', 'aurora');
  await page.getByRole('button', { name: 'Reset theme' }).click();
  await expect(page.locator('.visualizer-canvas')).toHaveAttribute('data-theme', 'cyberpunk');
});
