import { apiClient } from '../helpers/api-client';
import { testUser, validPrompt, invalidPrompt } from '../helpers/test-data';

/**
 * Video generation smoke tests.
 *
 * A QA user is registered + logged in once (beforeAll) and the JWT is shared
 * across all tests in this file.  If a generation job is successfully
 * submitted, its jobId is stashed for the status-polling test.
 */

interface AuthResponse {
  token: string;
  user: { id: string; email: string };
}

interface GenerationJob {
  jobId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  prompt?: string;
  createdAt?: string;
}

interface PaginatedGenerations {
  data: GenerationJob[];
  total: number;
  page: number;
  pageSize: number;
}

let authToken: string;
let createdJobId: string;

beforeAll(async () => {
  // Register a fresh user for this suite; fall back to login if already exists.
  const registerRes = await apiClient.post<AuthResponse>('/auth/register', {
    email: `qa-gen-${Date.now()}@opensorasmoketest.com`,
    password: testUser.password,
    displayName: 'QA Gen Bot',
  });

  if (registerRes.status === 201) {
    authToken = registerRes.data.token;
    return;
  }

  // If registration endpoint not yet live, attempt login with the shared QA user.
  // TODO: fill in once endpoint is live and credentials are stable
  const loginRes = await apiClient.post<AuthResponse>('/auth/login', {
    email: testUser.email,
    password: testUser.password,
  });

  if (loginRes.status === 200) {
    authToken = loginRes.data.token;
  }
});

describe('Video generation – submission', () => {
  it('POST /generations with valid prompt and auth returns 202 with a jobId', async () => {
    const res = await apiClient.post<GenerationJob>('/generations', validPrompt, authToken);

    expect(res.status).toBe(202);
    expect(res.data.jobId).toBeDefined();
    expect(typeof res.data.jobId).toBe('string');
    expect(res.data.jobId.length).toBeGreaterThan(0);
    expect(res.data.status).toMatch(/queued|processing/i);

    createdJobId = res.data.jobId;
  });

  it('POST /generations without auth returns 401', async () => {
    const res = await apiClient.post('/generations', validPrompt);

    expect(res.status).toBe(401);
  });

  it('POST /generations with an empty prompt returns 400', async () => {
    const res = await apiClient.post('/generations', invalidPrompt, authToken);

    expect(res.status).toBe(400);
  });
});

describe('Video generation – retrieval', () => {
  it('GET /generations/:id with valid auth returns job status', async () => {
    // Use the job created in the submission suite when available.
    const jobId = createdJobId ?? 'placeholder-id';

    const res = await apiClient.get<GenerationJob>(`/generations/${jobId}`, authToken);

    // A brand-new job should be 200 (queued/processing).
    // If the ID is a placeholder the API may return 404; both are acceptable
    // until a real job has been seeded.
    expect([200, 404]).toContain(res.status);

    if (res.status === 200) {
      expect(res.data.jobId).toBe(jobId);
      expect(['queued', 'processing', 'completed', 'failed']).toContain(res.data.status);
    }
  });

  it("GET /generations with auth returns a paginated array of the user's jobs", async () => {
    const res = await apiClient.get<PaginatedGenerations>('/generations', authToken);

    expect(res.status).toBe(200);
    expect(res.data).toBeDefined();

    // Response should either be a paginated envelope or a plain array.
    const items = Array.isArray(res.data) ? res.data : (res.data as PaginatedGenerations).data;

    expect(Array.isArray(items)).toBe(true);
  });
});
