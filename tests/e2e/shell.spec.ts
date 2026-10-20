import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const publicRoutes = [
  { path: '/', heading: 'Let your music' },
  { path: '/studio', heading: 'Your sound, reimagined.' },
  { path: '/gallery', heading: 'Find your frequency.' },
  { path: '/me', heading: 'My presets.' },
  { path: '/p/demo123', heading: 'Meet a new frequency.' },
  { path: '/legal/terms', heading: 'Terms of use' },
  { path: '/legal/privacy', heading: 'Privacy by design' },
  { path: '/legal/photosensitivity', heading: 'A note on light' },
];

test.describe('M0 application shell', () => {
  for (const route of publicRoutes) {
    test(`renders ${route.path}`, async ({ page }) => {
      await page.goto(route.path);
      await expect(page.getByRole('heading', { name: new RegExp(route.heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) })).toBeVisible();
    });
  }

  test('primary landing action opens the studio shell', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: /open the studio/i }).click();
    await expect(page).toHaveURL(/\/studio$/);
    await expect(page.getByRole('heading', { name: 'Your sound, reimagined.' })).toBeVisible();
  });

  test('invalid preset IDs are rejected', async ({ page }) => {
    const response = await page.goto('/p/%3Cscript%3E');
    expect(response?.status()).toBe(404);
    await expect(page.getByRole('heading', { name: 'This page missed the beat.' })).toBeVisible();
  });


  test('shows a dismissible first-visit photosensitivity notice', async ({ page }) => {
    await page.goto('/');
    const notice = page.getByRole('region', { name: 'A note on flashing visuals' });
    await expect(notice).toBeVisible();
    await page.getByRole('button', { name: 'Dismiss photosensitivity notice' }).click();
    await expect(notice).toHaveCount(0);
    await page.reload();
    await expect(notice).toHaveCount(0);
  });

  test('landing page has no automated axe violations', async ({ page }) => {
    await page.goto('/');
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });
});
