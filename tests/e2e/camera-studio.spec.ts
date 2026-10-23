import { expect, test } from '@playwright/test';

test('Camera Studio provides camera presets, roll and a front-view reset', async ({ page }) => {
  // Keep this interaction test focused on Camera Studio; the dedicated first-visit
  // safety notice has its own behavior and must not race client hydration here.
  await page.addInitScript(() => {
    try {
      window.localStorage.setItem('audiocanvas.photosensitivity-acknowledged.v1', 'true');
    } catch {
      // The initial about:blank page can have an opaque origin before navigation.
    }
  });
  await page.goto('/studio');

  const canvas = page.locator('.visualizer-canvas');
  await expect(canvas).toHaveAttribute('data-render-status', 'ready');

  const cameraButton = page.getByRole('button', { name: 'Camera Studio' });
  await expect(cameraButton).toBeVisible();
  await cameraButton.click();

  const panel = page.getByRole('dialog', { name: 'Camera Studio controls' });
  await expect(panel).toBeVisible();
  await expect(panel.getByRole('button', { name: 'Reset view' })).toBeVisible();

  const initialScene = await canvas.getAttribute('data-scene');
  await panel.getByRole('button', { name: 'Side view' }).click();
  await expect(canvas).toHaveAttribute('data-camera-preset', 'side');

  const rollSlider = panel.getByRole('slider', { name: 'Camera roll' });
  await rollSlider.focus();
  await page.keyboard.press('End');
  await expect(canvas).toHaveAttribute('data-camera-roll', '180');

  await panel.getByRole('button', { name: 'XYZ axes' }).click();
  const xAxisSlider = panel.getByRole('slider', { name: 'Object X axis' });
  await expect(xAxisSlider).toBeInViewport();
  await xAxisSlider.focus();
  await page.keyboard.press('End');
  await expect(canvas).toHaveAttribute('data-object-axis-x', '180');

  await panel.getByRole('button', { name: 'Reset view' }).click();
  await expect(canvas).toHaveAttribute('data-camera-preset', 'front');
  await expect(canvas).toHaveAttribute('data-camera-roll', '0');
  await expect(canvas).toHaveAttribute('data-object-axis-x', '0');
  await expect(canvas).toHaveAttribute('data-object-axis-y', '0');
  await expect(canvas).toHaveAttribute('data-object-axis-z', '0');
  await expect(canvas).toHaveAttribute('data-scene', initialScene ?? '');
});
