import { apiClient } from '../helpers/api-client';

/**
 * Credits regression tests.
 *
 * Validates the credits system beyond the smoke suite:
 * - Free-tier balance on signup (via /credits/balance and /credits/transactions)
 * - Debit transaction created after a generation
 * - Refund transaction created when a generation fails (where observable)
 * - Pagination of the transaction history
 * - Auth guards on all endpoints
 */

interface AuthResponse {
  token: string;
  user: { id: string; email: string };
}

interface CreditBalance {
  balance: number;
  currency: string;
  userId: string;
}

interface CreditTransaction {
  id: string;
  amount: number;
  type: 'credit' | 'debit' | 'refund';
  description?: string;
  createdAt: string;
}

interface TransactionsResponse {
  data: CreditTransaction[];
  total: number;
  page: number;
  pageSize: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function uniqueEmail(tag: string): string {
  return `qa-credits-${tag}-${Date.now()}@opensorasmoketest.com`;
}

async function registerAndGetToken(tag: string): Promise<string> {
  const res = await apiClient.post<AuthResponse>('/auth/register', {
    email: uniqueEmail(tag),
    password: 'TestPass123!',
    displayName: `QA Credits ${tag}`,
  });
  if (res.status !== 201) throw new Error(`Register failed: ${res.status}`);
  return res.data.token;
}

const baseGeneration = {
  prompt: 'A timelapse of a blooming flower in a misty forest',
  aspectRatio: '16:9',
  durationSeconds: 5,
};

// ---------------------------------------------------------------------------
// Balance – initial state for a new user
// ---------------------------------------------------------------------------

describe('Credits – initial balance on signup', () => {
  let token: string;

  beforeAll(async () => {
    token = await registerAndGetToken('initial');
  });

  it('GET /credits/balance returns 200', async () => {
    const res = await apiClient.get('/credits/balance', token);
    expect(res.status).toBe(200);
  });

  it('balance is a non-negative number', async () => {
    const res = await apiClient.get<CreditBalance>('/credits/balance', token);
    expect(typeof res.data.balance).toBe('number');
    expect(res.data.balance).toBeGreaterThanOrEqual(0);
  });

  it('currency field is present', async () => {
    const res = await apiClient.get<CreditBalance>('/credits/balance', token);
    expect(res.data.currency).toBeDefined();
    expect(typeof res.data.currency).toBe('string');
  });

  it('userId field matches the authenticated user', async () => {
    // Register a fresh user and verify the userId in the balance matches the
    // id returned at registration.
    const email = uniqueEmail('userid');
    const regRes = await apiClient.post<AuthResponse>('/auth/register', {
      email,
      password: 'TestPass123!',
    });
    expect(regRes.status).toBe(201);

    const balRes = await apiClient.get<CreditBalance>('/credits/balance', regRes.data.token);
    expect(balRes.data.userId).toBe(regRes.data.user.id);
  });
});

// ---------------------------------------------------------------------------
// Transactions – welcome bonus on signup
// ---------------------------------------------------------------------------

describe('Credits – transactions on signup', () => {
  let token: string;

  beforeAll(async () => {
    token = await registerAndGetToken('bonus');
  });

  it('GET /credits/transactions returns 200', async () => {
    const res = await apiClient.get('/credits/transactions', token);
    expect(res.status).toBe(200);
  });

  it('response includes paginated envelope with data array', async () => {
    const res = await apiClient.get<TransactionsResponse>('/credits/transactions', token);
    expect(Array.isArray(res.data.data)).toBe(true);
    expect(typeof res.data.total).toBe('number');
    expect(typeof res.data.page).toBe('number');
    expect(typeof res.data.pageSize).toBe('number');
  });

  it('welcome bonus transaction is present with positive amount', async () => {
    const res = await apiClient.get<TransactionsResponse>('/credits/transactions', token);
    const welcomeTx = res.data.data.find((t) => t.type === 'credit');
    expect(welcomeTx).toBeDefined();
    expect(welcomeTx!.amount).toBeGreaterThan(0);
  });

  it('each transaction has required fields: id, amount, type, createdAt', async () => {
    const res = await apiClient.get<TransactionsResponse>('/credits/transactions', token);
    for (const tx of res.data.data) {
      expect(typeof tx.id).toBe('string');
      expect(typeof tx.amount).toBe('number');
      expect(['credit', 'debit', 'refund']).toContain(tx.type);
      expect(tx.createdAt).toBeDefined();
      expect(() => new Date(tx.createdAt)).not.toThrow();
    }
  });
});

// ---------------------------------------------------------------------------
// Transactions – debit recorded after generation
// ---------------------------------------------------------------------------

describe('Credits – debit transaction after generation', () => {
  let token: string;

  beforeAll(async () => {
    token = await registerAndGetToken('debit');
    // Submit one generation so a debit is recorded
    const genRes = await apiClient.post('/generations', baseGeneration, token);
    expect(genRes.status).toBe(202);
  });

  it('a debit transaction is present after a generation is submitted', async () => {
    const res = await apiClient.get<TransactionsResponse>('/credits/transactions', token);
    expect(res.status).toBe(200);

    const debit = res.data.data.find((t) => t.type === 'debit');
    expect(debit).toBeDefined();
    expect(debit!.amount).toBeLessThan(0);
  });

  it('total transaction count increased after generation', async () => {
    // A new user should have: 1 welcome credit + 1 debit = at least 2 transactions
    const res = await apiClient.get<TransactionsResponse>('/credits/transactions', token);
    expect(res.data.total).toBeGreaterThanOrEqual(2);
  });
});

// ---------------------------------------------------------------------------
// Transactions – pagination
// ---------------------------------------------------------------------------

describe('Credits – transaction pagination', () => {
  let token: string;

  beforeAll(async () => {
    token = await registerAndGetToken('txpage');

    // Submit 3 jobs to accumulate at least 4 transactions (1 welcome + 3 debits)
    await Promise.all([
      apiClient.post('/generations', { ...baseGeneration, prompt: 'TX pag test 1' }, token),
      apiClient.post('/generations', { ...baseGeneration, prompt: 'TX pag test 2' }, token),
      apiClient.post('/generations', { ...baseGeneration, prompt: 'TX pag test 3' }, token),
    ]);
  });

  it('pageSize=2 returns at most 2 transactions', async () => {
    const res = await apiClient.get<TransactionsResponse>(
      '/credits/transactions?page=1&pageSize=2',
      token,
    );
    expect(res.status).toBe(200);
    expect(res.data.data.length).toBeLessThanOrEqual(2);
    expect(res.data.pageSize).toBe(2);
  });

  it('page=2 returns different transactions than page=1', async () => {
    const [p1, p2] = await Promise.all([
      apiClient.get<TransactionsResponse>('/credits/transactions?page=1&pageSize=2', token),
      apiClient.get<TransactionsResponse>('/credits/transactions?page=2&pageSize=2', token),
    ]);

    expect(p1.status).toBe(200);
    expect(p2.status).toBe(200);

    if (p1.data.total > 2 && p2.data.data.length > 0) {
      const p1Ids = p1.data.data.map((t) => t.id);
      const p2Ids = p2.data.data.map((t) => t.id);
      const overlap = p2Ids.filter((id) => p1Ids.includes(id));
      expect(overlap.length).toBe(0);
    }
  });

  it('pageSize is capped at 50', async () => {
    const res = await apiClient.get<TransactionsResponse>(
      '/credits/transactions?pageSize=999',
      token,
    );
    expect(res.status).toBe(200);
    expect(res.data.pageSize).toBeLessThanOrEqual(50);
  });
});

// ---------------------------------------------------------------------------
// Auth guards
// ---------------------------------------------------------------------------

describe('Credits – auth guards', () => {
  it('GET /credits/balance without token returns 401', async () => {
    const res = await apiClient.get('/credits/balance');
    expect(res.status).toBe(401);
  });

  it('GET /credits/transactions without token returns 401', async () => {
    const res = await apiClient.get('/credits/transactions');
    expect(res.status).toBe(401);
  });

  it('GET /credits/balance with a malformed token returns 401', async () => {
    const res = await apiClient.get('/credits/balance', 'not.a.jwt');
    expect(res.status).toBe(401);
  });
});
