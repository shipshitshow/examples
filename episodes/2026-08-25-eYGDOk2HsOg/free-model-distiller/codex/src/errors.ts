import type { PublicError } from "./types.ts";

export class DistillerError extends Error {
  readonly code: string;
  readonly retryable: boolean;
  readonly retryAfterSeconds: number | undefined;
  readonly issues: string[] | undefined;

  constructor(
    code: string,
    message: string,
    options: { retryable?: boolean; retryAfterSeconds?: number; issues?: string[] } = {},
  ) {
    super(message);
    this.name = "DistillerError";
    this.code = code;
    this.retryable = options.retryable ?? false;
    this.retryAfterSeconds = options.retryAfterSeconds;
    this.issues = options.issues;
  }

  toPublic(): PublicError {
    return {
      code: this.code,
      message: this.message,
      retryable: this.retryable,
      ...(this.retryAfterSeconds === undefined
        ? {}
        : { retryAfterSeconds: this.retryAfterSeconds }),
      ...(this.issues === undefined ? {} : { issues: this.issues }),
    };
  }
}

export function asDistillerError(error: unknown): DistillerError {
  if (error instanceof DistillerError) return error;
  if (error instanceof Error) {
    return new DistillerError("INTERNAL_ERROR", error.message);
  }
  return new DistillerError("INTERNAL_ERROR", "Unknown failure");
}
