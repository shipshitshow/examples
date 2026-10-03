/**
 * OpeaApiClient — typed HTTP client for the OpenSora API.
 *
 * Usage:
 *   import { createApiClient } from '@opea/api-client';
 *   const api = createApiClient({ baseUrl: 'http://localhost:3000' });
 *   const { accessToken, user } = await api.auth.login({ email, password });
 */

import type {
  AuthTokens,
  CreditBalance,
  GenerateVideoDto,
  LoginDto,
  RegisterDto,
  User,
  Video,
  VideosListResponse,
} from '@opea/shared';

import type { WireAuthResponse, WireGeneration, WireGenerationsList } from './serializers';
import {
  serializeAuth,
  serializeCreditBalance,
  serializeUser,
  serializeVideo,
  serializeVideosList,
} from './serializers';

export interface ApiClientConfig {
  baseUrl: string;
  /** Optional token provider — called before each authenticated request. */
  getToken?: () => Promise<string | null> | string | null;
}

export interface ApiClient {
  auth: {
    register(dto: RegisterDto): Promise<AuthTokens>;
    login(dto: LoginDto): Promise<AuthTokens>;
  };
  videos: {
    list(): Promise<VideosListResponse>;
    get(id: string): Promise<Video>;
    generate(dto: GenerateVideoDto): Promise<Video>;
  };
  users: {
    me(): Promise<User>;
  };
  credits: {
    balance(): Promise<CreditBalance>;
  };
}

export function createApiClient(config: ApiClientConfig): ApiClient {
  const { baseUrl, getToken } = config;

  async function request<T>(
    path: string,
    options: RequestInit = {},
    authenticated = true,
  ): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (authenticated && getToken) {
      const token = await getToken();
      if (token) headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(`${baseUrl}${path}`, { ...options, headers });

    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as { message?: string; error?: string };
      throw new Error(err.message ?? err.error ?? `HTTP ${res.status}`);
    }

    return res.json() as Promise<T>;
  }

  return {
    auth: {
      async register(dto: RegisterDto): Promise<AuthTokens> {
        const raw = await request<WireAuthResponse>(
          '/auth/register',
          {
            method: 'POST',
            body: JSON.stringify(dto),
          },
          false,
        );
        return serializeAuth(raw);
      },

      async login(dto: LoginDto): Promise<AuthTokens> {
        const raw = await request<WireAuthResponse>(
          '/auth/login',
          {
            method: 'POST',
            body: JSON.stringify(dto),
          },
          false,
        );
        return serializeAuth(raw);
      },
    },

    videos: {
      async list(): Promise<VideosListResponse> {
        const raw = await request<WireGenerationsList>('/generations');
        return serializeVideosList(raw);
      },

      async get(id: string): Promise<Video> {
        const raw = await request<WireGeneration>(`/generations/${id}`);
        return serializeVideo(raw);
      },

      async generate(dto: GenerateVideoDto): Promise<Video> {
        const raw = await request<WireGeneration>('/generations', {
          method: 'POST',
          body: JSON.stringify(dto),
        });
        return serializeVideo(raw);
      },
    },

    users: {
      async me(): Promise<User> {
        const raw = await request<Pick<User, 'id' | 'email'> & { createdAt?: string }>('/users/me');
        return serializeUser(raw);
      },
    },

    credits: {
      async balance(): Promise<CreditBalance> {
        const raw = await request<CreditBalance>('/credits/balance');
        return serializeCreditBalance(raw);
      },
    },
  };
}
