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
    if (url.pathname.endsWith('/actions/runs')) {
      const pageNumber = Number(url.searchParams.get('page') || 1);
      const older = { id: 104, run_number: 20, name: 'Playwright Tests', display_title: 'Older run', status: 'completed', conclusion: 'success', head_branch: 'main', event: 'push', created_at: '2026-11-23T10:00:00Z', run_started_at: '2026-11-23T10:00:02Z', updated_at: '2026-11-23T10:01:00Z', html_url: 'https://github.com/example/run/104', run_attempt: 1 };
      return route.fulfill({ json: { total_count: pageNumber === 1 ? runs.length : 4, workflow_runs: pageNumber === 1 ? runs : [older] } });
    }
    if (url.pathname.endsWith('/actions/runs/102/artifacts')) return route.fulfill({ json: { artifacts: [{ id: 222, name: 'playwright-report-102', expired: false, created_at: '2026-11-24T11:01:00Z' }] } });
    if (url.pathname.endsWith('/actions/artifacts/222/zip')) return route.fulfill({ status: 200, contentType: 'application/zip', body: 'fake-zip-content' });
    if (url.pathname.endsWith('/actions/jobs/2/logs')) return route.fulfill({ status: 200, contentType: 'text/plain', body: 'failed test log' });
    if (url.pathname.endsWith('/actions/runs/101/jobs')) return route.fulfill({ json: { jobs: [{ id: 1, name: 'test', status: 'completed', conclusion: 'success', started_at: '2026-11-24T10:00:02Z', completed_at: '2026-11-24T10:01:00Z', steps: [{ name: 'Install dependencies', status: 'completed', conclusion: 'success' }, { name: 'Run tests', status: 'completed', conclusion: 'success' }] }] } });
    if (url.pathname.endsWith('/actions/runs/102/jobs')) return route.fulfill({ json: { jobs: [{ id: 2, name: 'test', status: 'completed', conclusion: 'failure', started_at: '2026-11-24T11:00:02Z', completed_at: '2026-11-24T11:01:00Z', steps: [{ name: 'Login assertion', status: 'completed', conclusion: 'failure' }] }] } });
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
  await expect(page.getByTestId('browser')).toHaveValue('all');
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
  await page.getByTestId('browser').selectOption('firefox');
  await page.getByTestId('run-pipeline').click();
  await expect.poll(() => payload).toEqual({ ref: 'main', inputs: { environment: 'staging', script: 'tests/login.spec.js', browser: 'firefox' } });
});

test('rejects invalid spec paths without dispatching', async ({ page }) => {
  await page.getByRole('button', { name: 'Connect GitHub' }).click();
  await page.getByTestId('token-input').fill('test-token');
  await page.getByRole('button', { name: 'Connect', exact: true }).click();
  await page.getByTestId('script').fill('not-a-spec.txt');
  await page.getByTestId('run-pipeline').click();
  await expect(page.locator('#toast')).toContainText('valid Playwright spec path');
});


test('shows a report link for the selected pipeline inside Observation', async ({ page }) => {
  await expect(page.getByRole('link', { name: 'Open Latest Report' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Connect GitHub' }).click();
  await page.getByTestId('token-input').fill('test-token');
  await page.getByRole('button', { name: 'Connect', exact: true }).click();
  await page.locator('.run-row').filter({ hasText: 'Dashboard smoke' }).click();
  await page.getByRole('button', { name: 'Observation' }).click();
  const report = page.getByRole('link', { name: 'Open Report' });
  await expect(report).toBeVisible();
  await expect(report).toHaveAttribute('href', './reports/101/index.html');
  await expect(report).toHaveAttribute('target', '_blank');
});

test('disconnects GitHub and clears the connected dashboard state', async ({ page }) => {
  await page.getByRole('button', { name: 'Connect GitHub' }).click();
  await page.getByTestId('token-input').fill('test-token');
  await page.getByRole('button', { name: 'Connect', exact: true }).click();
  await expect(page.locator('#connection-status')).toContainText('qa-user');
  await page.getByRole('button', { name: 'Disconnect' }).click();
  await expect(page.locator('#connection-status')).toContainText('Not connected');
  await expect(page.getByRole('button', { name: 'Connect GitHub' })).toBeVisible();
  await expect(page.locator('#pipeline-list')).toContainText('Connect GitHub to load workflow runs');
});

test('cancel closes the GitHub connection dialog when not connected', async ({ page }) => {
  await page.getByRole('button', { name: 'Connect GitHub' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeHidden();
});


test('accepts a Playwright test folder path', async ({ page }) => {
  let payload;
  await page.route('https://api.github.com/repos/Venkatesh9381/Playwright-practice-tests/actions/workflows/playwright.yml/dispatches', async route => {
    payload = route.request().postDataJSON();
    await route.fulfill({ status: 204, body: '' });
  });
  await page.getByRole('button', { name: 'Connect GitHub' }).click();
  await page.getByTestId('token-input').fill('test-token');
  await page.getByRole('button', { name: 'Connect', exact: true }).click();
  await page.getByTestId('script').fill('tests');
  await page.getByTestId('run-pipeline').click();
  await expect.poll(() => payload).toEqual({ ref: 'main', inputs: { environment: 'qa', script: 'tests', browser: 'all' } });
});


test('shows failure diagnostics and downloads run artifacts and failed job logs', async ({ page }) => {
  await page.getByRole('button', { name: 'Connect GitHub' }).click();
  await page.getByTestId('token-input').fill('test-token');
  await page.getByRole('button', { name: 'Connect', exact: true }).click();
  await page.locator('.run-row').filter({ hasText: 'Login regression' }).click();
  await page.getByRole('button', { name: 'Observation' }).click();
  await expect(page.locator('#tab-content')).toContainText('FAILURE DIAGNOSTICS');
  await expect(page.locator('#tab-content')).toContainText('Login assertion');
  const artifactDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download Results' }).click();
  expect((await artifactDownload).suggestedFilename()).toBe('playwright-results-102.zip');
  const logDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download job logs' }).click();
  expect((await logDownload).suggestedFilename()).toBe('job-2-logs.zip');
});

test('keeps loaded history when refreshing the latest page', async ({ page }) => {
  const firstPage = Array.from({ length: 50 }, (_, index) => ({
    ...runs[0], id: 1000 + index, run_number: 1000 + index, display_title: 'History run ' + index
  }));
  const older = { ...runs[0], id: 2000, run_number: 2000, display_title: 'Older history run' };
  await page.route('https://api.github.com/repos/Venkatesh9381/Playwright-practice-tests/actions/runs?per_page=50&page=1', route =>
    route.fulfill({ json: { total_count: 51, workflow_runs: firstPage } }));
  await page.route('https://api.github.com/repos/Venkatesh9381/Playwright-practice-tests/actions/runs?per_page=50&page=2', route =>
    route.fulfill({ json: { total_count: 51, workflow_runs: [older] } }));
  await page.getByRole('button', { name: 'Connect GitHub' }).click();
  await page.getByTestId('token-input').fill('test-token');
  await page.getByRole('button', { name: 'Connect', exact: true }).click();
  await expect(page.locator('.run-row')).toHaveCount(50);
  await page.getByRole('button', { name: 'Load older' }).click();
  await expect(page.locator('.run-row')).toHaveCount(51);
  await page.getByTestId('refresh').click();
  await expect(page.locator('.run-row')).toHaveCount(51);
  await expect(page.locator('#pagination-note')).toContainText('Page 2');
});

test('shows a clear error when GitHub authentication fails', async ({ page }) => {
  await page.route('https://api.github.com/user', route =>
    route.fulfill({ status: 401, json: { message: 'Bad credentials' } }));
  await page.getByRole('button', { name: 'Connect GitHub' }).click();
  await page.getByTestId('token-input').fill('invalid-token');
  await page.getByRole('button', { name: 'Connect', exact: true }).click();
  await expect(page.locator('#toast')).toContainText('Bad credentials');
  await expect(page.locator('#connection-status')).toContainText('Not connected');
});
