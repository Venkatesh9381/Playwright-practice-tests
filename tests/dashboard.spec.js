// dashboard.spec.js
const { test, expect } = require('@playwright/test');

const DASHBOARD_URL = 'https://venkatesh9381.github.io/Playwright-practice-tests/dashboard.html';
const TOKEN = process.env.GH_TOKEN || '';

test.describe('Playwright Dashboard - Full Coverage', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto(DASHBOARD_URL);
    // Auto-accept token prompt if it appears
    page.on('dialog', async dialog => {
      if (TOKEN) {
        await dialog.accept(TOKEN);
      } else {
        await dialog.dismiss();
      }
    });
  });

  // 1. Dashboard loads
  test('1. Dashboard loads with form and list area', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Pipelines');
    await expect(page.locator('#env')).toBeVisible();
    await expect(page.locator('#script')).toBeVisible();
    await expect(page.locator('button.run')).toBeVisible();
    await expect(page.locator('#pipeline-list')).toBeVisible();
  });

  // 2. Environment dropdown - all options
  test('2. Environment dropdown works for all options', async ({ page }) => {
    const options = ['qa', 'staging', 'prod'];
    for (const opt of options) {
      await page.selectOption('#env', opt);
      await expect(page.locator('#env')).toHaveValue(opt);
    }
  });

  // 3. Script name input
  test('3. Script name input accepts text', async ({ page }) => {
    await page.fill('#script', 'login.spec.js');
    await expect(page.locator('#script')).toHaveValue('login.spec.js');
    await page.fill('#script', 'day-1.spec.js');
    await expect(page.locator('#script')).toHaveValue('day-1.spec.js');
  });

  // 4. Tabs switch
  test('4. Tabs switch correctly', async ({ page }) => {
    await page.click('text=Observation');
    await expect(page.locator('#observation-tab')).toBeVisible();
    await page.click('text=Parameters Used');
    await expect(page.locator('#params-tab')).toBeVisible();
  });

  // 5. Report link
  test('5. Report link is present and opens in new tab', async ({ page }) => {
    await page.click('text=Observation');
    const link = page.locator('a:has-text("Open Playwright Report")');
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute('target', '_blank');
  });

  // 6. Pipeline list loads (requires valid token)
  test('6. Pipeline list loads after token', async ({ page }) => {
    test.skip(!TOKEN, 'Requires GH_TOKEN');
    await page.waitForTimeout(3000);
    const items = page.locator('.pipeline-item');
    await expect(items.first()).toBeVisible({ timeout: 10000 });
  });

  // 7. Select pipeline and see parameters
  test('7. Selecting pipeline shows parameters', async ({ page }) => {
    test.skip(!TOKEN, 'Requires GH_TOKEN');
    await page.waitForTimeout(3000);
    const first = page.locator('.pipeline-item').first();
    if (await first.isVisible()) {
      await first.click();
      await expect(page.locator('#selected-title')).not.toHaveText('Select a pipeline');
      await expect(page.locator('#params-content')).toContainText('Status');
    }
  });

  // 8. Trigger pipeline (requires valid token)
  test('8. Trigger pipeline with valid token', async ({ page }) => {
    test.skip(!TOKEN, 'Requires GH_TOKEN');
    await page.fill('#script', 'day-1.spec.js');
    await page.click('button.run');
    // Wait for alert
    page.once('dialog', async dialog => {
      expect(dialog.message()).toContain('triggered');
      await dialog.accept();
    });
  });

  // 9. Invalid token shows error
  test('9. Invalid token shows error on trigger', async ({ page }) => {
    // Force invalid token by clearing storage
    await page.evaluate(() => localStorage.setItem('gh_token', 'invalid-token-123'));
    await page.reload();
    await page.click('button.run');
    page.once('dialog', async dialog => {
      expect(dialog.message()).toContain('Error');
      await dialog.accept();
    });
  });

  // 10. Multiple environments + scripts combination
  test('10. Multiple environment and script combinations', async ({ page }) => {
    const combos = [
      { env: 'qa', script: 'day-1.spec.js' },
      { env: 'staging', script: 'example.spec.js' },
      { env: 'prod', script: 'login.spec.js' }
    ];
    for (const c of combos) {
      await page.selectOption('#env', c.env);
      await page.fill('#script', c.script);
      await expect(page.locator('#env')).toHaveValue(c.env);
      await expect(page.locator('#script')).toHaveValue(c.script);
    }
  });
});
