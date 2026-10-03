import { apiClient } from '../helpers/api-client';
import { testUser } from '../helpers/test-data';

/**
 * Auth smoke tests.
 *
 * These run against the live staging API.  A fresh QA user is registered once
 * in beforeAll, and the resulting JWT is reused for the remaining tests in this
 * suite.  The user is not deleted in afterAll because the staging database is
 * expected to be reset periodically; add cleanup if that assumption changes.
 */

interface AuthResponse {
  token: string;
  user: {
    id: string;
    email: string;
    displayName?: string;
  };
}

interface UserProfile {
  id: string;
  email: string;
  displayName?: string;
  createdAt: string;
}

let authToken: string;
let registeredUserId: string;

describe('Auth – registration', () => {
  it('POST /auth/register succeeds with valid payload and returns a JWT', async () => {
    const res = await apiClient.post<AuthResponse>('/auth/register', {
      email: testUser.email,
      password: testUser.password,
      displayName: testUser.displayName,
    });

    expect(res.status).toBe(201);
    expect(res.data.token).toBeDefined();
    expect(typeof res.data.token).toBe('string');
    expect(res.data.token.length).toBeGreaterThan(10);
    expect(res.data.user).toBeDefined();
    expect(res.data.user.email).toBe(testUser.email);

    // Stash for downstream tests in this file.
    authToken = res.data.token;
    registeredUserId = res.data.user.id;
  });
});

describe('Auth – login', () => {
  // Ensure we have a token even if the registration describe block was skipped.
  beforeAll(async () => {
    if (!authToken) {
      const res = await apiClient.post<AuthResponse>('/auth/login', {
        email: testUser.email,
        password: testUser.password,
      });
      if (res.status === 200 && res.data.token) {
        authToken = res.data.token;
        registeredUserId = res.data.user.id;
      }
    }
  });

  it('POST /auth/login returns 200 and a JWT token with valid credentials', async () => {
    const res = await apiClient.post<AuthResponse>('/auth/login', {
      email: testUser.email,
      password: testUser.password,
    });

    expect(res.status).toBe(200);
    expect(res.data.token).toBeDefined();
    expect(typeof res.data.token).toBe('string');
    expect(res.data.user.email).toBe(testUser.email);
  });

  it('POST /auth/login returns 401 with an invalid password', async () => {
    const res = await apiClient.post('/auth/login', {
      email: testUser.email,
      password: 'WrongPassword999!',
    });

    expect(res.status).toBe(401);
  });

  it('POST /auth/login returns 401 with an unknown email address', async () => {
    const res = await apiClient.post('/auth/login', {
      email: `nonexistent-${Date.now()}@opensorasmoketest.com`,
      password: testUser.password,
    });

    expect(res.status).toBe(401);
  });
});

describe('Auth – current user profile', () => {
  beforeAll(async () => {
    // Obtain a token if not yet available from earlier describes.
    if (!authToken) {
      const res = await apiClient.post<AuthResponse>('/auth/login', {
        email: testUser.email,
        password: testUser.password,
      });
      if (res.status === 200) {
        authToken = res.data.token;
        registeredUserId = res.data.user.id;
      }
    }
  });

  it('GET /users/me with a valid token returns 200 and user data', async () => {
    const res = await apiClient.get<UserProfile>('/users/me', authToken);

    expect(res.status).toBe(200);
    expect(res.data).toBeDefined();
    expect(res.data.id).toBeDefined();
    expect(res.data.email).toBe(testUser.email);
    expect(res.data.createdAt).toBeDefined();

    // Cross-check with the ID we got at registration if available.
    if (registeredUserId) {
      expect(res.data.id).toBe(registeredUserId);
    }
  });

  it('GET /users/me without a token returns 401', async () => {
    const res = await apiClient.get('/users/me');

    expect(res.status).toBe(401);
  });
});
