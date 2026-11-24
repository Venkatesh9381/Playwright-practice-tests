# Pulse environment configuration

Pulse offers three workflow environments: `qa`, `staging`, and `prod`.

The selected value is passed to the GitHub Actions job as its GitHub Environment. Configure each environment in **Repository Settings → Environments** and add a repository/environment variable named `TEST_BASE_URL` containing that environment's base URL.

Examples (replace these with URLs you own and are authorised to test):

- `qa`: `https://qa.example.com`
- `staging`: `https://staging.example.com`
- `prod`: `https://www.example.com`

The Playwright configuration reads `TEST_BASE_URL` as its `baseURL`. The sample `day-1.spec.js` navigates to `/index.htm` relative to that base URL.

If `TEST_BASE_URL` is not configured, the sample test falls back to the existing ParaBank demo site. Configure production environment protection rules in GitHub before allowing production test dispatches.

Do not put credentials or tokens in this file. Store sensitive values as GitHub Environment secrets and consume them only in workflows that need them.
