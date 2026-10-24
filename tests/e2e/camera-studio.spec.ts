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

  const viewport = page.viewportSize();
  const panelBox = await panel.boundingBox();
  expect(viewport).not.toBeNull();
  expect(panelBox).not.toBeNull();
  if (viewport === null || panelBox === null) throw new Error('Expected a visible camera panel and browser viewport');
  expect(panelBox.x).toBeGreaterThanOrEqual(0);
  expect(panelBox.y).toBeGreaterThanOrEqual(0);
  expect(panelBox.x + panelBox.width).toBeLessThanOrEqual(viewport.width);
  expect(panelBox.y + panelBox.height).toBeLessThanOrEqual(viewport.height);

  const initialScene = await canvas.getAttribute('data-scene');
  await panel.getByRole('button', { name: 'Side view' }).click();
  await expect(canvas).toHaveAttribute('data-camera-preset', 'side');

  const rollSlider = panel.getByRole('slider', { name: 'Camera roll' });
  await rollSlider.focus();
  await page.keyboard.press('End');
  await expect(canvas).toHaveAttribute('data-camera-roll', '180');

  const scrollBody = panel.getByTestId('camera-studio-scroll-body');
  const pageScrollBeforeJump = await page.evaluate(() => window.scrollY);
  await expect.poll(() => scrollBody.evaluate((element) => element.scrollHeight > element.clientHeight)).toBe(true);

  await panel.getByRole('button', { name: 'XYZ axes' }).click();
  const xAxisSlider = panel.getByRole('slider', { name: 'Object X axis' });
  const zAxisSlider = panel.getByRole('slider', { name: 'Object Z axis' });
  await expect(xAxisSlider).toBeInViewport();
  await expect.poll(() => scrollBody.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
  // The shortcut must not scroll the page or move the popup outside its own viewport.
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(pageScrollBeforeJump);
  await expect(panel.getByRole('button', { name: 'Reset view' })).toBeVisible();

  // Verify the popup can scroll all the way down to Z and back up without a tab refresh.
  await scrollBody.hover();
  await page.mouse.wheel(0, 1600);
  await expect.poll(() => scrollBody.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
  await expect(zAxisSlider).toBeInViewport();
  await expect(panel.getByRole('button', { name: 'Reset view' })).toBeVisible();

  await page.mouse.wheel(0, -1800);
  await expect.poll(() => scrollBody.evaluate((element) => element.scrollTop)).toBe(0);
  await expect(panel.getByRole('button', { name: 'Front view' })).toBeInViewport();
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(pageScrollBeforeJump);

  // Jumping to the axes should still work after returning to the top.
  await panel.getByRole('button', { name: 'XYZ axes' }).click();
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


test('camera profiles stay isolated per scene and persist across reloads', async ({ page }) => {
  await page.addInitScript(() => {
    try {
      if (sessionStorage.getItem('audiocanvas.camera-test-initialized') !== 'true') {
        localStorage.removeItem('audiocanvas.camera-studio.v1');
        sessionStorage.setItem('audiocanvas.camera-test-initialized', 'true');
      }
      localStorage.setItem('audiocanvas.photosensitivity-acknowledged.v1', 'true');
    } catch {
      // Ignore opaque-origin storage before the first navigation.
    }
  });

  await page.goto('/studio');
  const canvas = page.locator('.visualizer-canvas');
  await expect(canvas).toHaveAttribute('data-render-status', 'ready');

  await page.getByRole('button', { name: 'Camera Studio' }).click();
  const panel = page.getByRole('dialog', { name: 'Camera Studio controls' });
  await expect(panel).toBeVisible();

  await panel.getByRole('button', { name: 'Side view' }).click();
  await expect(canvas).toHaveAttribute('data-camera-preset', 'side');
  const xAxis = panel.getByRole('slider', { name: 'Object X axis' });
  await xAxis.focus();
  await page.keyboard.press('End');
  await expect(canvas).toHaveAttribute('data-object-axis-x', '180');
  const roll = panel.getByRole('slider', { name: 'Camera roll' });
  await roll.focus();
  await page.keyboard.press('End');
  await expect(canvas).toHaveAttribute('data-camera-roll', '180');

  await page.getByRole('button', { name: 'Switch to Particle Vortex' }).click();
  await expect(canvas).toHaveAttribute('data-scene', 'particle-vortex');
  await expect(canvas).toHaveAttribute('data-camera-preset', 'front');
  await expect(canvas).toHaveAttribute('data-camera-roll', '0');
  await expect(canvas).toHaveAttribute('data-object-axis-x', '0');

  await panel.getByRole('button', { name: 'Top view' }).click();
  await expect(canvas).toHaveAttribute('data-camera-preset', 'top');
  const zAxis = panel.getByRole('slider', { name: 'Object Z axis' });
  await zAxis.focus();
  await page.keyboard.press('End');
  await expect(canvas).toHaveAttribute('data-object-axis-z', '180');

  await page.getByRole('button', { name: 'Switch to Radial Wave Disk' }).click();
  await expect(canvas).toHaveAttribute('data-camera-preset', 'side');
  await expect(canvas).toHaveAttribute('data-camera-roll', '180');
  await expect(canvas).toHaveAttribute('data-object-axis-x', '180');
  await expect(canvas).toHaveAttribute('data-object-axis-z', '0');

  const savedProfiles = await page.evaluate(() => {
    const raw = localStorage.getItem('audiocanvas.camera-studio.v1');
    return raw ? JSON.parse(raw) as {
      profiles: Record<string, { preset: string; rollDegrees: number; objectRotationDegrees: { x: number; z: number } }>;
    } : null;
  });
  expect(savedProfiles?.profiles['radial-wave-disk']).toMatchObject({
    preset: 'side',
    rollDegrees: 180,
    objectRotationDegrees: { x: 180, z: 0 },
  });
  expect(savedProfiles?.profiles['particle-vortex']).toMatchObject({
    preset: 'top',
    objectRotationDegrees: { z: 180 },
  });

  await page.reload();
  await expect(page.locator('.visualizer-canvas')).toHaveAttribute('data-render-status', 'ready');
  await expect(page.locator('.visualizer-canvas')).toHaveAttribute('data-camera-preset', 'side');
  await expect(page.locator('.visualizer-canvas')).toHaveAttribute('data-camera-roll', '180');
  await expect(page.locator('.visualizer-canvas')).toHaveAttribute('data-object-axis-x', '180');

  await page.getByRole('button', { name: 'Camera Studio' }).click();
  const reopenedPanel = page.getByRole('dialog', { name: 'Camera Studio controls' });
  await reopenedPanel.getByRole('button', { name: 'Reset view' }).click();
  await expect(page.locator('.visualizer-canvas')).toHaveAttribute('data-camera-preset', 'front');
  await expect(page.locator('.visualizer-canvas')).toHaveAttribute('data-camera-roll', '0');
  await expect(page.locator('.visualizer-canvas')).toHaveAttribute('data-object-axis-x', '0');

  const profilesAfterReset = await page.evaluate(() => {
    const raw = localStorage.getItem('audiocanvas.camera-studio.v1');
    return raw ? JSON.parse(raw) as { profiles: Record<string, { preset: string; objectRotationDegrees: { z: number } }> } : null;
  });
  expect(profilesAfterReset?.profiles['radial-wave-disk']).toMatchObject({ preset: 'front', objectRotationDegrees: { z: 0 } });
  expect(profilesAfterReset?.profiles['particle-vortex']).toMatchObject({ preset: 'top', objectRotationDegrees: { z: 180 } });
});
