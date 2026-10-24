import { expect, test } from '@playwright/test';

test('Audio Mapping MVP edits mappings live, persists settings, and adapts per scene', async ({ page }) => {
  await page.addInitScript(() => {
    try {
      window.localStorage.setItem('audiocanvas.photosensitivity-acknowledged.v1', 'true');
      window.localStorage.removeItem('audiocanvas.audio-mappings.v1');
    } catch {
      // Ignore opaque-origin storage during about:blank.
    }
  });

  await page.goto('/studio');
  const canvas = page.locator('.visualizer-canvas');
  await expect(canvas).toHaveAttribute('data-render-status', 'ready');
  await expect(page.getByRole('heading', { name: 'Audio mapping' })).toBeVisible();
  await expect(page.getByTestId('mapping-card')).toHaveCount(3);
  await expect(canvas).toHaveAttribute('data-mapping-count', '3');

  await page.getByRole('combobox', { name: 'Mapping 1 source' }).selectOption('treble');
  await page.getByRole('combobox', { name: 'Mapping 1 target' }).selectOption('colorFlash');
  await page.getByRole('checkbox', { name: 'Mapping 1 invert' }).check();
  await page.getByRole('checkbox', { name: 'Mapping 1 enabled' }).uncheck();
  await expect(canvas).toHaveAttribute('data-mapping-count', '2');

  const storedMapping = await page.evaluate(() => {
    const raw = window.localStorage.getItem('audiocanvas.audio-mappings.v1');
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { 'radial-wave-disk': Array<{ source: string; target: string; invert: boolean; enabled: boolean }> };
    return parsed['radial-wave-disk'][0];
  });
  expect(storedMapping).toMatchObject({ source: 'treble', target: 'colorFlash', invert: true, enabled: false });

  // Growing/shrinking the inspector must not resize the WebGL viewport or change its apparent zoom.
  const stage = page.locator('.stage-wrap');
  const initialStageSize = await stage.evaluate((element) => ({
    width: element.clientWidth,
    height: element.clientHeight,
  }));

  await page.getByRole('button', { name: 'Add mapping' }).click();
  await expect(page.getByTestId('mapping-card')).toHaveCount(4);
  const stageSizeAfterAdd = await stage.evaluate((element) => ({
    width: element.clientWidth,
    height: element.clientHeight,
  }));
  expect(Math.abs(stageSizeAfterAdd.width - initialStageSize.width)).toBeLessThanOrEqual(1);
  expect(Math.abs(stageSizeAfterAdd.height - initialStageSize.height)).toBeLessThanOrEqual(1);

  await page.getByRole('button', { name: 'Remove mapping 4' }).click();
  await expect(page.getByTestId('mapping-card')).toHaveCount(3);
  const stageSizeAfterRemove = await stage.evaluate((element) => ({
    width: element.clientWidth,
    height: element.clientHeight,
  }));
  expect(Math.abs(stageSizeAfterRemove.width - initialStageSize.width)).toBeLessThanOrEqual(1);
  expect(Math.abs(stageSizeAfterRemove.height - initialStageSize.height)).toBeLessThanOrEqual(1);
  await page.getByRole('button', { name: 'Reset defaults' }).click();
  await expect(canvas).toHaveAttribute('data-mapping-count', '3');

  await page.getByRole('button', { name: 'Switch to Particle Vortex' }).click();
  await expect(canvas).toHaveAttribute('data-scene', 'particle-vortex');
  await expect(page.getByRole('combobox', { name: 'Mapping 1 target' })).toContainText('Particle turbulence');
  await expect(page.getByRole('combobox', { name: 'Mapping 1 target' })).toContainText('Color flash');

  await page.reload();
  await expect(page.locator('.visualizer-canvas')).toHaveAttribute('data-render-status', 'ready');
  await expect(page.locator('.visualizer-canvas')).toHaveAttribute('data-mapping-count', '3');
});
