import { expect, test } from '@playwright/test';

test('Camera Studio provides camera presets, roll and a front-view reset', async ({ page }) => {
  await page.goto('/studio');

  const noticeClose = page.locator('.photosensitivity-notice__close');
  if (await noticeClose.isVisible().catch(() => false)) {
    await noticeClose.click();
  }

  const canvas = page.locator('.visualizer-canvas');
  await expect(canvas).toHaveAttribute('data-render-status', 'ready');

  const cameraButton = page.getByRole('button', { name: 'Camera Studio' });
  await expect(cameraButton).toBeVisible();
  await cameraButton.click();

  const panel = page.getByRole('dialog', { name: 'Camera Studio controls' });
  await expect(panel).toBeVisible();

  const initialScene = await canvas.getAttribute('data-scene');
  await panel.getByRole('button', { name: 'Side view' }).click();
  await expect(canvas).toHaveAttribute('data-camera-preset', 'side');

  const rollSlider = panel.getByRole('slider', { name: 'Camera roll' });
  await rollSlider.focus();
  await page.keyboard.press('End');
  await expect(canvas).toHaveAttribute('data-camera-roll', '180');

  await panel.getByRole('button', { name: 'Reset view' }).click();
  await expect(canvas).toHaveAttribute('data-camera-preset', 'front');
  await expect(canvas).toHaveAttribute('data-camera-roll', '0');
  await expect(canvas).toHaveAttribute('data-scene', initialScene ?? '');
});
