# OpenSora QA Test Harness

Smoke and regression tests for the OpenSora API, written in TypeScript with **Jest** and **Axios**.

---

## What this harness covers

| Suite | File pattern | Purpose |
|---|---|---|
| Smoke | `*.smoke.test.ts` | Fast, high-confidence checks that critical API paths are alive and returning sane responses. Run after every deployment. |
| Regression | `*.regression.test.ts` | Deeper scenario coverage added as bugs are found and fixed. Run on a schedule or before releases. |
| Unit / helpers | `*.test.ts` | Helpers and utilities that do not hit the network. |

### Current smoke suites

| File | Coverage |
|---|---|
| `smoke/health.smoke.test.ts` | `/health` liveness check |
| `smoke/auth.smoke.test.ts` | Register, login (valid + invalid), `/users/me` auth guard |
| `smoke/generation.smoke.test.ts` | Submit generation, auth guard, empty-prompt validation, status polling, list |
| `smoke/credits.smoke.test.ts` | Balance retrieval, transaction history, auth guards |
| `smoke/playback.smoke.test.ts` | Signed URL retrieval, completed-video library filter |

---

## Running locally

### Prerequisites

- Node.js >= 20
- A running OpenSora API (local or staging)

### Install dependencies

```bash
cd tests
npm install
```

### Run all tests

```bash
BASE_URL=http://localhost:3000 npm test
```

### Run smoke tests only

```bash
BASE_URL=http://localhost:3000 npm run test:smoke
```

### Run regression tests only

```bash
BASE_URL=http://localhost:3000 npm run test:regression
```

### Run with coverage

```bash
BASE_URL=http://localhost:3000 npm run test:coverage
```

---

## Environment variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `BASE_URL` | No | `http://localhost:3000` | Base URL of the OpenSora API under test. |
| `TEST_AUTH_TOKEN` | No | _(none)_ | Pre-existing JWT to use instead of registering a fresh QA user. Useful for local debugging. |
| `CI` | No | `false` | Set to `true` in CI pipelines; enables additional logging. |

---

## How CI works

The workflow lives at `.github/workflows/qa-smoke.yml`.

**Trigger:** Every push to `main` (i.e. after a PR is merged).

**Steps:**
1. Check out the repository.
2. Set up Node.js 20.
3. `cd tests && npm ci` — install dependencies from the lockfile.
4. `npm run test:smoke` — run the smoke suite against the staging API.

The staging API URL is stored as a GitHub Actions secret named `STAGING_API_URL` and injected as `BASE_URL` at runtime.

If any smoke test fails the workflow job fails, blocking downstream jobs (e.g. production promotion).

---

## Naming conventions

| Pattern | Purpose |
|---|---|
| `smoke/<domain>.smoke.test.ts` | Smoke tests for a given domain (auth, credits, etc.) |
| `regression/<domain>.regression.test.ts` | Regression tests for a given domain |
| `helpers/<name>.ts` | Shared utilities, fixtures, and setup — not test files |

---

## How to add new tests

### New smoke test

1. Create `tests/smoke/<domain>.smoke.test.ts`.
2. Import `apiClient` from `../helpers/api-client` and fixtures from `../helpers/test-data`.
3. Use `beforeAll` to authenticate once per file, and `describe`/`it` for test organisation.
4. Run `npm run test:smoke` to verify locally before opening a PR.

### New regression test

1. Create `tests/regression/<domain>.regression.test.ts`.
2. Follow the same conventions as smoke tests.
3. Reference the GitHub issue or bug report in a comment at the top of the file.

### Adding a fixture

Add typed constants to `tests/helpers/test-data.ts`.  Keep values realistic; they will be sent to the live staging API.

---

## Tips

- Each test suite registers its own uniquely-timestamped QA user so suites can run in parallel without colliding.
- Tests are written to tolerate a fresh/empty staging environment (e.g. no completed videos yet); `404` is accepted where appropriate.
- Replace `PLACEHOLDER_JOB_ID` in `playback.smoke.test.ts` with a stable seeded job ID once staging has persistent completed video data.
