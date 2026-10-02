// Shared API types for OpenSora XYZ

export interface User {
  id: string;
  email: string;
  displayName?: string;
  createdAt: string;
}

export interface AuthTokens {
  accessToken: string;
  user: User;
}

export interface RegisterDto {
  email: string;
  password: string;
  displayName?: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

export type VideoStatus = 'queued' | 'processing' | 'completed' | 'failed';

export interface Video {
  id: string;
  userId?: string;
  prompt: string;
  aspectRatio?: string;
  durationSeconds: number | null;
  status: VideoStatus;
  /** Direct URL (R2 or fal.ai URL) — null until generation completes */
  url: string | null;
  errorMessage?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface GenerateVideoDto {
  prompt: string;
  aspectRatio?: string;
  durationSeconds?: number;
}

/** Response from POST /api/videos — the newly queued generation */
export type GenerateVideoResponse = Video;

export interface VideosListResponse {
  data: Video[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CreditBalance {
  balance: number;
  currency: string;
  userId: string;
}

export interface ApiError {
  error: string;
  message?: string;
  statusCode?: number;
}
