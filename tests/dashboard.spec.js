// dashboard.spec.js
const { test, expect } = require('@playwright/test');

const DASHBOARD_URL = 'https://venkatesh9381.github.io/Playwright-practice-tests/dashboard.html';

test.describe('Playwright Dashboard - Full Coverage', () => {

  test.beforeEach(async ({ page }) => {
    // Dismiss any dialogs automatically
    page.on('dialog', dialog => dialog.dismiss());
    await page.goto(DASHBOARD_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(2000);
  });

  test('1. Dashboard loads with form and list area', async ({ page }) => {
    await expect(page.locator('.sidebar h1')).toContainText('Pipelines', { timeout: 15000 });
    await expect(page.locator('#env')).toBeVisible();
    await expect(page.locator('#script')).toBeVisible();
    await expect(page.locator('button.run')).toBeVisible();
  });

  test('2. Environment dropdown works for all options', async ({ page }) => {
    await expect(page.locator('#env')).toBeVisible({ timeout: 15000 });
    const options = ['qa', 'staging', 'prod'];
    for (const opt of options) {
      await page.selectOption('#env', opt);
      await expect(page.locator('#env')).toHaveValue(opt);
    }
  });

  test('3. Script name input accepts text', async ({ page }) => {
    await expect(page.locator('#script')).toBeVisible({ timeout: 15000 });
    await page.fill('#script', 'login.spec.js');
    await expect(page.locator('#script')).toHaveValue('login.spec.js');
  });

  test('4. Tabs switch correctly', async ({ page }) => {
    await expect(page.locator('text=Observation')).toBeVisible({ timeout: 15000 });
    await page.click('text=Observation');
    await expect(page.locator('#observation-tab')).toBeVisible();
    await page.click('text=Parameters Used');
    await expect(page.locator('#params-tab')).toBeVisible();
  });

  test('5. Report link is present', async ({ page }) => {
    await page.click('text=Observation');
    const link = page.locator('a:has-text("Open Playwright Report")');
    await expect(link).toBeVisible({ timeout: 10000 });
  });

  test('10. Multiple environment and script combinations', async ({ page }) => {
    await expect(page.locator('#env')).toBeVisible({ timeout: 15000 });
    const combos = [
      { env: 'qa', script: 'day-1.spec.js' },
      { env: 'staging', script: 'example.spec.js' }
    ];
    for (const c of combos) {
      await page.selectOption('#env', c.env);
      await page.fill('#script', c.script);
      await expect(page.locator('#env')).toHaveValue(c.env);
      await expect(page.locator('#script')).toHaveValue(c.script);
    }
  });
});
