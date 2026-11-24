const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const dashboardUrl = pathToFileURL(path.resolve(__dirname, '../docs/dashboard.html')).href;
const runs = [
  { id: 101, run_number: 21, name: 'Playwright Tests', display_title: 'Dashboard smoke', status: 'completed', conclusion: 'success', head_branch: 'main', event: 'workflow_dispatch', created_at: '2026-11-24T10:00:00Z', run_started_at: '2026-11-24T10:00:02Z', updated_at: '2026-11-24T10:01:00Z', html_url: 'https://github.com/example/run/101', run_attempt: 1 },
  { id: 102, run_number: 22, name: 'Playwright Tests', display_title: 'Login regression', status: 'completed', conclusion: 'failure', head_branch: 'main', event: 'push', created_at: '2026-11-24T11:00:00Z', run_started_at: '2026-11-24T11:00:02Z', updated_at: '2026-11-24T11:01:00Z', html_url: 'https://github.com/example/run/102', run_attempt: 1 },
  { id: 103, run_number: 23, name: 'Playwright Tests', display_title: 'Checkout tests', status: 'in_progress', conclusion: null, head_branch: 'feature/test', event: 'workflow_dispatch', created_at: '2026-11-24T12:00:00Z', run_started_at: '2026-11-24T12:00:02Z', updated_at: '2026-11-24T12:00:10Z', html_url: 'https://github.com/example/run/103', run_attempt: 1 }
];

async function mockGitHub(page) {
  await page.route('https://api.github.com/**', async route => {
    const url = new URL(route.request().url());
    if (url.pathname === '/user') return route.fulfill({ json: { login: 'qa-user' } });
    if (url.pathname.endsWith('/actions/runs')) return route.fulfill({ json: { total_count: runs.length, workflow_runs: runs } });
    if (url.pathname.endsWith('/actions/runs/101/jobs')) return route.fulfill({ json: { jobs: [{ id: 1, name: 'test', status: 'completed', conclusion: 'success', started_at: '2026-11-24T10:00:02Z', completed_at: '2026-11-24T10:01:00Z', steps: [{ name: 'Install dependencies', status: 'completed', conclusion: 'success' }, { name: 'Run tests', status: 'completed', conclusion: 'success' }] }] } });
    if (url.pathname.endsWith('/actions/runs/102/jobs')) return route.fulfill({ json: { jobs: [{ id: 2, name: 'test', status: 'completed', conclusion: 'failure', steps: [] }] } });
    if (url.pathname.endsWith('/actions/runs/103/jobs')) return route.fulfill({ json: { jobs: [{ id: 3, name: 'test', status: 'in_progress', steps: [{ name: 'Run tests', status: 'in_progress' }] }] } });
    if (url.pathname.endsWith('/dispatches') && route.request().method() === 'POST') return route.fulfill({ status: 204, body: '' });
    return route.fulfill({ status: 404, json: { message: 'Not found in test mock' } });
  });
}

test.beforeEach(async ({ page }) => {
  await mockGitHub(page);
  await page.goto(dashboardUrl);
});

test('renders Pulse dashboard and execution controls', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'Execution overview' })).toBeVisible();
  await expect(page.getByTestId('environment')).toHaveValue('qa');
  await expect(page.getByTestId('script')).toHaveValue('day-1.spec.js');
  await expect(page.getByTestId('run-pipeline')).toBeVisible();
});

test('connects to GitHub and loads run statistics', async ({ page }) => {
  await page.getByRole('button', { name: 'Connect GitHub' }).click();
  await page.getByTestId('token-input').fill('test-token');
  await page.getByRole('button', { name: 'Connect', exact: true }).click();
  await expect(page.locator('#connection-status')).toContainText('qa-user');
  await expect(page.locator('#total-count')).toHaveText('3');
  await expect(page.locator('#success-count')).toHaveText('1');
  await expect(page.locator('#failure-count')).toHaveText('1');
  await expect(page.locator('#running-count')).toHaveText('1');
});

test('status cards filter the execution history', async ({ page }) => {
  await page.getByRole('button', { name: 'Connect GitHub' }).click();
  await page.getByTestId('token-input').fill('test-token');
  await page.getByRole('button', { name: 'Connect', exact: true }).click();
  await page.getByTestId('filter-success').click();
  await expect(page.locator('.run-row')).toHaveCount(1);
  await expect(page.locator('.run-row')).toContainText('Dashboard smoke');
  await page.getByTestId('filter-failure').click();
  await expect(page.locator('.run-row')).toHaveCount(1);
  await expect(page.locator('.run-row')).toContainText('Login regression');
  await page.getByTestId('filter-running').click();
  await expect(page.locator('.run-row')).toHaveCount(1);
  await expect(page.locator('.run-row')).toContainText('Checkout tests');
});

test('search filters runs and selection shows real job steps', async ({ page }) => {
  await page.getByRole('button', { name: 'Connect GitHub' }).click();
  await page.getByTestId('token-input').fill('test-token');
  await page.getByRole('button', { name: 'Connect', exact: true }).click();
  await page.getByTestId('search').fill('checkout');
  await expect(page.locator('.run-row')).toHaveCount(1);
  await page.getByTestId('search').fill('');
  await page.locator('.run-row').filter({ hasText: 'Dashboard smoke' }).click();
  await expect(page.locator('#selected-title')).toContainText('Pipeline #21');
  await expect(page.locator('#tab-content')).toContainText('Install dependencies');
  await expect(page.locator('#tab-content')).toContainText('Run tests');
});

test('dispatches the selected environment and spec to the workflow', async ({ page }) => {
  let payload;
  await page.route('https://api.github.com/repos/Venkatesh9381/Playwright-practice-tests/actions/workflows/playwright.yml/dispatches', async route => {
    payload = route.request().postDataJSON();
    await route.fulfill({ status: 204, body: '' });
  });
  await page.getByRole('button', { name: 'Connect GitHub' }).click();
  await page.getByTestId('token-input').fill('test-token');
  await page.getByRole('button', { name: 'Connect', exact: true }).click();
  await page.getByTestId('environment').selectOption('staging');
  await page.getByTestId('script').fill('tests/login.spec.js');
  await page.getByTestId('run-pipeline').click();
  await expect.poll(() => payload).toEqual({ ref: 'main', inputs: { environment: 'staging', script: 'tests/login.spec.js' } });
});

test('rejects invalid spec paths without dispatching', async ({ page }) => {
  await page.getByRole('button', { name: 'Connect GitHub' }).click();
  await page.getByTestId('token-input').fill('test-token');
  await page.getByRole('button', { name: 'Connect', exact: true }).click();
  await page.getByTestId('script').fill('not-a-spec.txt');
  await page.getByTestId('run-pipeline').click();
  await expect(page.locator('#toast')).toContainText('valid Playwright spec path');
});
