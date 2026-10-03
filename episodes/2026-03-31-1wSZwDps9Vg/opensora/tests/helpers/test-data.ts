/**
 * Shared typed test fixtures used across smoke and regression suites.
 *
 * The timestamp embedded in testUser.email ensures each test run registers a
 * unique account, avoiding collisions when tests are run repeatedly against
 * the same staging environment.
 */

export interface TestUser {
  email: string;
  password: string;
  displayName: string;
}

export interface VideoGenerationPayload {
  prompt: string;
  aspectRatio: string;
  durationSeconds: number;
}

/** Unique QA user created fresh per test run. */
export const testUser: TestUser = {
  email: `qa-test-${Date.now()}@opensorasmoketest.com`,
  password: 'TestPass123!',
  displayName: 'QA Smoke Bot',
};

/** A realistic text-to-video prompt that should pass backend validation. */
export const validPrompt: VideoGenerationPayload = {
  prompt: 'A serene aerial shot of snow-capped mountains at golden hour, 4K, cinematic, slow pan',
  aspectRatio: '16:9',
  durationSeconds: 5,
};

/** An empty prompt that the backend should reject with 400. */
export const invalidPrompt: VideoGenerationPayload = {
  prompt: '',
  aspectRatio: '16:9',
  durationSeconds: 5,
};

/** All aspect ratios the OpenSora API is expected to accept. */
export const videoAspectRatios: string[] = ['16:9', '9:16', '1:1', '4:3', '3:4'];

/** Sentinel value used when a valid generation job ID is needed but none is
 *  available yet (e.g. before the generation endpoints go live). Replace with
 *  a real seeded ID once staging has persistent data. */
export const PLACEHOLDER_JOB_ID = '000000000000000000000000';
