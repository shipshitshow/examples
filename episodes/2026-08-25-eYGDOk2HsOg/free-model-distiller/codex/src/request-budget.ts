import { REQUESTS_PER_DAY, REQUESTS_PER_MINUTE } from "./config.ts";
import { DistillerError } from "./errors.ts";
import type { RequestBudgetSnapshot } from "./types.ts";

export class RequestBudget {
  private used: 0 | 1 = 0;

  consume(): void {
    if (this.used === 1) {
      throw new DistillerError(
        "REQUEST_BUDGET_EXCEEDED",
        "A second model request was blocked by the per-run budget",
      );
    }
    this.used = 1;
  }

  snapshot(): RequestBudgetSnapshot {
    return {
      usedThisRun: this.used,
      maximumPerRun: 1,
      requestsPerMinute: REQUESTS_PER_MINUTE,
      requestsPerDay: REQUESTS_PER_DAY,
    };
  }
}
