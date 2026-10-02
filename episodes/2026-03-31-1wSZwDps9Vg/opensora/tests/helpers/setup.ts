/**
 * Jest global setup file (setupFilesAfterEnv).
 *
 * Runs once in each worker process immediately after the Jest framework is
 * installed in the environment, before any test files are executed.
 *
 * Responsibilities:
 * - Validate required env vars
 * - Expose shared globals used by test suites
 * - Log the target environment so CI logs are unambiguous
 */

const BASE_URL = process.env['BASE_URL'] ?? 'http://localhost:3000';
const TEST_AUTH_TOKEN = process.env['TEST_AUTH_TOKEN'] ?? '';
const CI = process.env['CI'] === 'true';

// Expose on the Node global so any test file can read these without importing.
(global as Record<string, unknown>)['API_BASE_URL'] = BASE_URL;
(global as Record<string, unknown>)['TEST_AUTH_TOKEN'] = TEST_AUTH_TOKEN;
(global as Record<string, unknown>)['IS_CI'] = CI;

const banner = [
  '',
  '='.repeat(60),
  '  OpenSora QA Test Harness',
  `  Target : ${BASE_URL}`,
  `  CI mode: ${CI ? 'YES' : 'NO'}`,
  `  Token  : ${TEST_AUTH_TOKEN ? '*** (provided via env)' : '(none - tests will obtain their own)'}`,
  '='.repeat(60),
  '',
].join('\n');

// eslint-disable-next-line no-console
console.log(banner);

export {};
