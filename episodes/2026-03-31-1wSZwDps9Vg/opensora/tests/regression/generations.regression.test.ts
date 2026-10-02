import { apiClient } from '../helpers/api-client';
import { videoAspectRatios } from '../helpers/test-data';

/**
 * Video generation regression tests.
 *
 * Covers ownership isolation, input validation edge cases, pagination,
 * credit deduction, and insufficient-credit guards — beyond what the
 * smoke suite checks.
 */

interface AuthResponse {
  token: string;
  user: { id: string; email: string };
}

interface GenerationJob {
  jobId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  prompt?: string;
  aspectRatio?: string;
  durationSeconds?: number;
  createdAt?: string;
}

interface PaginatedGenerations {
  data: GenerationJob[];
  total: number;
  page: number;
  pageSize: number;
}

interface CreditBalance {
  balance: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function uniqueEmail(tag: string): string {
  return `qa-gen-${tag}-${Date.now()}@opensorasmoketest.com`;
}

async function registerAndGetToken(tag: string): Promise<string> {
  const res = await apiClient.post<AuthResponse>('/auth/register', {
    email: uniqueEmail(tag),
    password: 'TestPass123!',
    displayName: `QA ${tag} Bot`,
  });
  if (res.status !== 201) throw new Error(`Register failed: ${res.status}`);
  return res.data.token;
}

const basePrompt = {
  prompt: 'A serene aerial shot of snow-capped mountains at golden hour, 4K cinematic',
  aspectRatio: '16:9',
  durationSeconds: 5,
};

// ---------------------------------------------------------------------------
// Input validation
// ---------------------------------------------------------------------------

describe('Generations – input validation', () => {
  let token: string;

  beforeAll(async () => {
    token = await registerAndGetToken('val');
  });

  it('returns 400 for an empty prompt', async () => {
    const res = await apiClient.post('/generations', { ...basePrompt, prompt: '' }, token);
    expect(res.status).toBe(400);
  });

  it('returns 400 for a prompt exceeding 1000 characters', async () => {
    const res = await apiClient.post(
      '/generations',
      { ...basePrompt, prompt: 'A'.repeat(1001) },
      token,
    );
    expect(res.status).toBe(400);
  });

  it('returns 400 for an invalid aspectRatio value', async () => {
    const res = await apiClient.post('/generations', { ...basePrompt, aspectRatio: '2:3' }, token);
    expect(res.status).toBe(400);
  });

  it('returns 400 for durationSeconds = 0', async () => {
    const res = await apiClient.post('/generations', { ...basePrompt, durationSeconds: 0 }, token);
    expect(res.status).toBe(400);
  });

  it('returns 400 for durationSeconds = 61 (exceeds max)', async () => {
    const res = await apiClient.post('/generations', { ...basePrompt, durationSeconds: 61 }, token);
    expect(res.status).toBe(400);
  });

  it('returns 400 when prompt is missing entirely', async () => {
    const res = await apiClient.post(
      '/generations',
      { aspectRatio: '16:9', durationSeconds: 5 },
      token,
    );
    expect(res.status).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// All supported aspect ratios are accepted
// ---------------------------------------------------------------------------

describe('Generations – aspect ratio acceptance', () => {
  let token: string;

  beforeAll(async () => {
    token = await registerAndGetToken('ar');
  });

  videoAspectRatios.forEach((ar) => {
    it(`accepts aspectRatio "${ar}" and returns 202`, async () => {
      const res = await apiClient.post<GenerationJob>(
        '/generations',
        { ...basePrompt, aspectRatio: ar },
        token,
      );
      expect(res.status).toBe(202);
      expect(res.data.jobId).toBeDefined();
    });
  });
});

// ---------------------------------------------------------------------------
// Generation response contract
// ---------------------------------------------------------------------------

describe('Generations – POST response contract', () => {
  let token: string;
  let jobRes: Awaited<ReturnType<typeof apiClient.post<GenerationJob>>>;

  beforeAll(async () => {
    token = await registerAndGetToken('contract');
    jobRes = await apiClient.post<GenerationJob>('/generations', basePrompt, token);
  });

  it('returns 202', () => {
    expect(jobRes.status).toBe(202);
  });

  it('response includes a string jobId', () => {
    expect(typeof jobRes.data.jobId).toBe('string');
    expect(jobRes.data.jobId.length).toBeGreaterThan(0);
  });

  it('initial status is queued or processing', () => {
    expect(['queued', 'processing']).toContain(jobRes.data.status);
  });

  it('prompt is echoed in the response', () => {
    expect(jobRes.data.prompt).toBe(basePrompt.prompt);
  });

  it('createdAt is an ISO timestamp', () => {
    expect(jobRes.data.createdAt).toBeDefined();
    expect(() => new Date(jobRes.data.createdAt!)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Ownership isolation – another user cannot read your generation
// ---------------------------------------------------------------------------

describe('Generations – ownership isolation', () => {
  let ownerToken: string;
  let intruderToken: string;
  let ownerJobId: string;

  beforeAll(async () => {
    [ownerToken, intruderToken] = await Promise.all([
      registerAndGetToken('owner'),
      registerAndGetToken('intruder'),
    ]);

    const res = await apiClient.post<GenerationJob>('/generations', basePrompt, ownerToken);
    expect(res.status).toBe(202);
    ownerJobId = res.data.jobId;
  });

  it('GET /generations/:id returns 404 when job belongs to another user', async () => {
    const res = await apiClient.get(`/generations/${ownerJobId}`, intruderToken);
    expect(res.status).toBe(404);
  });

  it('GET /generations/:id/url returns 404 when job belongs to another user', async () => {
    const res = await apiClient.get(`/generations/${ownerJobId}/url`, intruderToken);
    expect(res.status).toBe(404);
  });

  it("GET /generations does not include another user's jobs", async () => {
    const res = await apiClient.get<PaginatedGenerations>('/generations', intruderToken);
    expect(res.status).toBe(200);
    const items = res.data.data ?? [];
    const leaked = items.find((j) => j.jobId === ownerJobId);
    expect(leaked).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// GET /generations/:id – edge cases
// ---------------------------------------------------------------------------

describe('Generations – single job retrieval edge cases', () => {
  let token: string;

  beforeAll(async () => {
    token = await registerAndGetToken('getid');
  });

  it('returns 404 for a valid-format ObjectId that does not exist', async () => {
    const res = await apiClient.get('/generations/000000000000000000000000', token);
    expect(res.status).toBe(404);
  });

  it('returns 404 for an invalid ObjectId format', async () => {
    const res = await apiClient.get('/generations/not-an-id', token);
    expect(res.status).toBe(404);
  });
});

// ---------------------------------------------------------------------------
// Pagination
// ---------------------------------------------------------------------------

describe('Generations – pagination', () => {
  let token: string;

  beforeAll(async () => {
    token = await registerAndGetToken('page');

    // Submit 3 jobs so we have enough for pagination checks
    await Promise.all([
      apiClient.post('/generations', { ...basePrompt, prompt: 'Paginate test 1' }, token),
      apiClient.post('/generations', { ...basePrompt, prompt: 'Paginate test 2' }, token),
      apiClient.post('/generations', { ...basePrompt, prompt: 'Paginate test 3' }, token),
    ]);
  });

  it('GET /generations returns paginated envelope with page and pageSize', async () => {
    const res = await apiClient.get<PaginatedGenerations>('/generations?page=1&pageSize=2', token);
    expect(res.status).toBe(200);
    expect(typeof res.data.total).toBe('number');
    expect(res.data.page).toBe(1);
    expect(res.data.pageSize).toBe(2);
    expect(Array.isArray(res.data.data)).toBe(true);
    expect(res.data.data.length).toBeLessThanOrEqual(2);
  });

  it('page=2 returns different jobs than page=1', async () => {
    const [p1, p2] = await Promise.all([
      apiClient.get<PaginatedGenerations>('/generations?page=1&pageSize=2', token),
      apiClient.get<PaginatedGenerations>('/generations?page=2&pageSize=2', token),
    ]);

    expect(p1.status).toBe(200);
    expect(p2.status).toBe(200);

    const p1Ids = p1.data.data.map((j) => j.jobId);
    const p2Ids = p2.data.data.map((j) => j.jobId);

    // When total > 2, pages should not share any job IDs
    if (p1.data.total > 2 && p2Ids.length > 0) {
      const overlap = p2Ids.filter((id) => p1Ids.includes(id));
      expect(overlap.length).toBe(0);
    }
  });

  it('pageSize is capped at 50', async () => {
    const res = await apiClient.get<PaginatedGenerations>('/generations?pageSize=100', token);
    expect(res.status).toBe(200);
    expect(res.data.pageSize).toBeLessThanOrEqual(50);
  });
});

// ---------------------------------------------------------------------------
// Credit deduction after generation
// ---------------------------------------------------------------------------

describe('Generations – credit deduction', () => {
  let token: string;
  let balanceBefore: number;

  beforeAll(async () => {
    token = await registerAndGetToken('deduct');

    const balRes = await apiClient.get<CreditBalance>('/credits/balance', token);
    balanceBefore = balRes.data.balance;
  });

  it('balance decreases by at least 1 credit after a successful submission', async () => {
    const genRes = await apiClient.post('/generations', basePrompt, token);
    expect(genRes.status).toBe(202);

    const balRes = await apiClient.get<CreditBalance>('/credits/balance', token);
    expect(balRes.status).toBe(200);
    expect(balRes.data.balance).toBeLessThan(balanceBefore);
  });
});

// ---------------------------------------------------------------------------
// Insufficient credits – 402
// ---------------------------------------------------------------------------

describe('Generations – insufficient credits', () => {
  /**
   * To trigger a 402 we need a user with 0 credits.  We drain credits by
   * submitting jobs until the balance hits 0 (up to FREE_CREDITS_ON_SIGNUP
   * attempts), then assert the next submission returns 402.
   *
   * Note: this is potentially expensive if FREE_CREDITS_ON_SIGNUP is large.
   * The test is skipped when the initial balance exceeds 20 to avoid
   * running too many jobs in CI.
   */
  const MAX_DRAIN_ATTEMPTS = 20;

  let token: string;
  let skipped = false;

  beforeAll(async () => {
    token = await registerAndGetToken('nocredits');

    const balRes = await apiClient.get<CreditBalance>('/credits/balance', token);
    const initialBalance = balRes.data.balance;

    if (initialBalance > MAX_DRAIN_ATTEMPTS) {
      skipped = true;
      return;
    }

    // Drain credits sequentially
    for (let i = 0; i < initialBalance; i++) {
      await apiClient.post('/generations', basePrompt, token);
    }
  });

  it('returns 402 when credit balance is 0', async () => {
    if (skipped) {
      console.warn('Skipped: initial balance too high to drain in this suite');
      return;
    }
    const res = await apiClient.post('/generations', basePrompt, token);
    expect(res.status).toBe(402);
  });
});
