/**
 * Serializers — normalize raw API wire responses into @opea/shared types.
 *
 * The compiled API bundle uses different field names in several places:
 *   auth:        { token }        → AuthTokens { accessToken }
 *   generation:  { jobId }        → Video      { id }
 *   generation:  route /generations → Video type
 *
 * All consumers (web, mobile) should import from @opea/api-client instead of
 * hand-rolling their own mappings.
 */

import type { AuthTokens, CreditBalance, User, Video, VideosListResponse } from '@opea/shared';

// ---------------------------------------------------------------------------
// Wire types — what the API actually returns over HTTP
// ---------------------------------------------------------------------------

export interface WireAuthResponse {
  token: string;
  user: Pick<User, 'id' | 'email'>;
}

export interface WireGeneration {
  jobId: string;
  status: Video['status'];
  prompt: string;
  aspectRatio?: string;
  durationSeconds?: number | null;
  url?: string | null;
  thumbnailUrl?: string | null;
  errorMessage?: string | null;
  createdAt: string;
  updatedAt?: string;
}

export interface WireGenerationsList {
  data: WireGeneration[];
  total: number;
  page: number;
  pageSize: number;
}

// ---------------------------------------------------------------------------
// Serializers
// ---------------------------------------------------------------------------

export function serializeAuth(raw: WireAuthResponse): AuthTokens {
  return {
    accessToken: raw.token,
    user: {
      id: raw.user.id,
      email: raw.user.email,
      createdAt: (raw.user as User).createdAt ?? new Date().toISOString(),
    },
  };
}

export function serializeVideo(raw: WireGeneration): Video {
  return {
    id: raw.jobId,
    prompt: raw.prompt,
    aspectRatio: raw.aspectRatio,
    durationSeconds: raw.durationSeconds ?? null,
    status: raw.status,
    url: raw.url ?? null,
    errorMessage: raw.errorMessage ?? null,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt ?? raw.createdAt,
  };
}

export function serializeVideosList(raw: WireGenerationsList): VideosListResponse {
  return {
    data: raw.data.map(serializeVideo),
    total: raw.total,
    page: raw.page,
    pageSize: raw.pageSize,
  };
}

export function serializeCreditBalance(raw: CreditBalance): CreditBalance {
  // Wire format already matches — pass through with type guarantee
  return {
    balance: raw.balance,
    currency: raw.currency,
    userId: raw.userId,
  };
}

export function serializeUser(raw: Pick<User, 'id' | 'email'> & { createdAt?: string }): User {
  return {
    id: raw.id,
    email: raw.email,
    createdAt: raw.createdAt ?? new Date().toISOString(),
  };
}
