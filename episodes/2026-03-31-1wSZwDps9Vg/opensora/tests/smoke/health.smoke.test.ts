import { apiClient } from '../helpers/api-client';

describe('Health check', () => {
  it('GET /health returns 200 with status ok', async () => {
    const res = await apiClient.get<{ status: string }>('/health');

    expect(res.status).toBe(200);
    expect(res.data).toBeDefined();
    expect(res.data.status).toMatch(/ok|healthy|up/i);
  });
});
