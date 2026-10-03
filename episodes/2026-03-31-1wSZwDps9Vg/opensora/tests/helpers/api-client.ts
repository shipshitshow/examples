import axios from 'axios';
import type { AxiosResponse, AxiosError } from 'axios';

const BASE_URL = process.env['BASE_URL'] ?? 'http://localhost:3000';

/**
 * Builds authorization headers when a token is provided.
 */
function authHeaders(token?: string): Record<string, string> {
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

/**
 * Wraps an Axios call and always resolves (never throws), returning the raw
 * AxiosResponse so tests can assert on status codes including error responses.
 */
async function safeRequest<T = unknown>(
  fn: () => Promise<AxiosResponse<T>>,
): Promise<AxiosResponse<T>> {
  try {
    return await fn();
  } catch (err) {
    const axiosErr = err as AxiosError<T>;
    if (axiosErr.response) {
      return axiosErr.response;
    }
    throw err;
  }
}

/**
 * Typed API client backed by Axios.
 * Every method resolves with the raw AxiosResponse so callers can inspect
 * status, headers, and body without try/catch boilerplate.
 */
export const apiClient = {
  baseURL: BASE_URL,

  get<T = unknown>(path: string, token?: string): Promise<AxiosResponse<T>> {
    return safeRequest(() =>
      axios.get<T>(`${BASE_URL}${path}`, {
        headers: { ...authHeaders(token) },
        validateStatus: () => true,
      }),
    );
  },

  post<T = unknown>(path: string, body: unknown, token?: string): Promise<AxiosResponse<T>> {
    return safeRequest(() =>
      axios.post<T>(`${BASE_URL}${path}`, body, {
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders(token),
        },
        validateStatus: () => true,
      }),
    );
  },

  patch<T = unknown>(path: string, body: unknown, token?: string): Promise<AxiosResponse<T>> {
    return safeRequest(() =>
      axios.patch<T>(`${BASE_URL}${path}`, body, {
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders(token),
        },
        validateStatus: () => true,
      }),
    );
  },

  del<T = unknown>(path: string, token?: string): Promise<AxiosResponse<T>> {
    return safeRequest(() =>
      axios.delete<T>(`${BASE_URL}${path}`, {
        headers: { ...authHeaders(token) },
        validateStatus: () => true,
      }),
    );
  },
};
