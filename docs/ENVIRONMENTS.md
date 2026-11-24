# Pulse environment configuration

Pulse offers three workflow environments: `qa`, `staging`, and `prod`.

## Configure each environment

1. Open **Repository Settings → Environments**.
2. Create or open the environments named exactly `qa`, `staging`, and `prod`.
3. In each environment, add a variable named `TEST_BASE_URL` with the base URL for that environment.
4. For `prod`, configure required reviewers and deployment protection rules before allowing production runs.

Use URLs for systems you own or are authorised to test. The selected environment is passed to the GitHub Actions job, and Playwright uses its `TEST_BASE_URL` as `baseURL`.

Manual dashboard dispatches fail before tests start if the selected environment has no valid HTTP(S) `TEST_BASE_URL`. This prevents a QA, staging, or production request from silently running against the sample fallback site. Push and pull-request validation retain the existing ParaBank demo fallback when no environment variable is available.

## Workflow inputs

- `environment`: `qa`, `staging`, or `prod`
- `script`: an existing repository-relative `.spec.js` file or test folder
- `browser`: `all`, `chromium`, `firefox`, or `webkit`

The workflow validates the script path and browser value again on GitHub Actions. Dashboard-side validation is not treated as a security boundary.

## Reports and downloads

- The HTML report for each non-PR run is published under `reports/<run-id>/` and copied into the `pulse-reports` archive branch.
- The dashboard's Observation tab links to that run's report.
- Playwright HTML report and test-results artifacts can be downloaded from the Observation tab while GitHub retains them. The workflow currently retains artifacts for 14 days.
- The report archive branch is separate from `main`; do not delete it if historical Pages reports must remain available.

## GitHub token permissions

Use a fine-grained personal access token scoped only to this repository. The dashboard needs Actions read access to inspect runs and jobs, Actions write access to dispatch workflows, and Metadata read access. The dashboard also requests artifact and job-log downloads, which require Actions read access.

The token is held in browser memory only and is cleared when the dashboard disconnects or the page is closed. A static public GitHub Pages site cannot keep a token secret from people who can use the browser. For a multi-user or production deployment, move authentication and GitHub API calls behind a secured backend or a GitHub App. Do not share a personal access token with other users.

Never put credentials in this file. Store sensitive test credentials as GitHub Environment secrets and expose only the minimum required values to the workflow.
