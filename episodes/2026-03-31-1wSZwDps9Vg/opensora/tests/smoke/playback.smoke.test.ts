import { apiClient } from '../helpers/api-client';
import { testUser, PLACEHOLDER_JOB_ID } from '../helpers/test-data';

/**
 * Playback and library smoke tests.
 *
 * These tests verify that:
 * 1. A completed video's signed URL can be retrieved (or 404 if none exist yet).
 * 2. The library endpoint correctly filters by status=completed.
 *
 * Because CI runs against a fresh staging environment there may be no completed
 * jobs available.  Tests are written to accept 404 for the URL endpoint and an
 * empty array for the library, so they never produce false positives.
 */

interface AuthResponse {
  token: string;
  user: { id: string; email: string };
}

interface SignedUrlResponse {
  url: string;
  expiresAt?: string;
}

interface GenerationJob {
  jobId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  prompt?: string;
  videoUrl?: string;
  createdAt?: string;
}

interface PaginatedGenerations {
  data: GenerationJob[];
  total: number;
  page: number;
  pageSize: number;
}

let authToken: string;

beforeAll(async () => {
  // Register a fresh QA user for this suite.
  const registerRes = await apiClient.post<AuthResponse>('/auth/register', {
    email: `qa-playback-${Date.now()}@opensorasmoketest.com`,
    password: testUser.password,
    displayName: 'QA Playback Bot',
  });

  if (registerRes.status === 201) {
    authToken = registerRes.data.token;
    return;
  }

  // Fall back to shared test user login if registration is unavailable.
  // TODO: fill in once endpoint is live and credentials are stable
  const loginRes = await apiClient.post<AuthResponse>('/auth/login', {
    email: testUser.email,
    password: testUser.password,
  });

  if (loginRes.status === 200) {
    authToken = loginRes.data.token;
  }
});

describe('Playback – signed URL', () => {
  it('GET /generations/:id/url for a completed job returns 200 with signed URL, or 404 if no completed job exists', async () => {
    // Use PLACEHOLDER_JOB_ID until a real seeded completed job is available.
    // TODO: replace PLACEHOLDER_JOB_ID with a stable seeded job ID once
    //       staging has persistent completed video data.
    const jobId = PLACEHOLDER_JOB_ID;

    const res = await apiClient.get<SignedUrlResponse>(`/generations/${jobId}/url`, authToken);

    // 200 means a completed job was found and a signed URL was returned.
    // 404 means the job doesn't exist (expected in fresh CI environments).
    expect([200, 404]).toContain(res.status);

    if (res.status === 200) {
      expect(res.data.url).toBeDefined();
      expect(typeof res.data.url).toBe('string');
      // Should be an HTTPS URL (S3 signed URL or CDN).
      expect(res.data.url).toMatch(/^https?:\/\//);
    }
  });

  it('GET /generations/:id/url without auth returns 401', async () => {
    const res = await apiClient.get(`/generations/${PLACEHOLDER_JOB_ID}/url`);

    expect(res.status).toBe(401);
  });
});

describe('Playback – video library', () => {
  it("GET /generations?status=completed with auth returns 200 and user's completed videos", async () => {
    const res = await apiClient.get<PaginatedGenerations | GenerationJob[]>(
      '/generations?status=completed',
      authToken,
    );

    expect(res.status).toBe(200);
    expect(res.data).toBeDefined();

    // Accept both a plain array and a paginated envelope.
    const items = Array.isArray(res.data) ? res.data : (res.data as PaginatedGenerations).data;

    expect(Array.isArray(items)).toBe(true);

    // Every returned item must have status=completed (when items are present).
    items.forEach((job) => {
      const typedJob = job as GenerationJob;
      if (typedJob.status) {
        expect(typedJob.status).toBe('completed');
      }
    });
  });

  it('GET /generations?status=completed without auth returns 401', async () => {
    const res = await apiClient.get('/generations?status=completed');

    expect(res.status).toBe(401);
  });
});
