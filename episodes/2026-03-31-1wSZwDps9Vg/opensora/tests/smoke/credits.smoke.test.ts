import { apiClient } from '../helpers/api-client';
import { testUser } from '../helpers/test-data';

/**
 * Credits smoke tests.
 *
 * Covers balance retrieval and transaction history.  A fresh QA user is
 * authenticated once per suite; new accounts should start with a non-negative
 * credit balance (free tier or trial credits).
 */

interface AuthResponse {
  token: string;
  user: { id: string; email: string };
}

interface CreditBalance {
  balance: number;
  currency?: string;
  userId?: string;
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
  total?: number;
  page?: number;
}

let authToken: string;

beforeAll(async () => {
  // Register a unique QA user for this suite.
  const registerRes = await apiClient.post<AuthResponse>('/auth/register', {
    email: `qa-credits-${Date.now()}@opensorasmoketest.com`,
    password: testUser.password,
    displayName: 'QA Credits Bot',
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

describe('Credits – balance', () => {
  it('GET /credits/balance with auth returns 200 and a balance object', async () => {
    const res = await apiClient.get<CreditBalance>('/credits/balance', authToken);

    expect(res.status).toBe(200);
    expect(res.data).toBeDefined();
    expect(typeof res.data.balance).toBe('number');
    expect(res.data.balance).toBeGreaterThanOrEqual(0);
  });

  it('GET /credits/balance without auth returns 401', async () => {
    const res = await apiClient.get('/credits/balance');

    expect(res.status).toBe(401);
  });
});

describe('Credits – transaction history', () => {
  it('GET /credits/transactions with auth returns 200 and an array', async () => {
    const res = await apiClient.get<TransactionsResponse | CreditTransaction[]>(
      '/credits/transactions',
      authToken,
    );

    expect(res.status).toBe(200);
    expect(res.data).toBeDefined();

    // Accept both a plain array and a paginated envelope.
    const items = Array.isArray(res.data) ? res.data : (res.data as TransactionsResponse).data;

    expect(Array.isArray(items)).toBe(true);

    // If there are transactions, verify their shape.
    if (items.length > 0) {
      const first = items[0] as CreditTransaction;
      expect(first.id).toBeDefined();
      expect(typeof first.amount).toBe('number');
      expect(first.createdAt).toBeDefined();
    }
  });

  it('GET /credits/transactions without auth returns 401', async () => {
    const res = await apiClient.get('/credits/transactions');

    expect(res.status).toBe(401);
  });
});
