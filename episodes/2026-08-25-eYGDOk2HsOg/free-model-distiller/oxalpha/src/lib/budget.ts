import { mkdirSync, readFileSync } from "node:fs";
import { dirname } from "node:path";

const DAY_LIMIT = 1000;
const DAY_MS = 86_400_000;

interface State {
  day: string;
  dayCount: number;
  stamps: number[];
}

export interface BudgetSnapshot {
  runRequests: number;
  today: number;
  minute: number;
  nearlyExhausted: boolean;
}

export class Budget {
  private runRequests = 0;
  private state!: State;

  constructor(private path: string) {}

  load(): void {
    this.runRequests = 0;
    let loaded: State | null = null;
    try {
      loaded = JSON.parse(readFileSync(this.path, "utf8")) as State;
    } catch {
      loaded = null;
    }
    const today = new Date().toISOString().slice(0, 10);
    if (
      !loaded ||
      typeof loaded !== "object" ||
      loaded.day !== today ||
      !Array.isArray(loaded.stamps)
    ) {
      this.state = { day: today, dayCount: 0, stamps: [] };
    } else {
      this.state = loaded;
    }
    mkdirSync(dirname(this.path), { recursive: true });
  }

  record(now = Date.now()): BudgetSnapshot {
    this.runRequests++;
    this.state.dayCount++;
    this.state.stamps.push(now);
    this.state.stamps = this.state.stamps.filter((t) => now - t < DAY_MS);
    try {
      Bun.write(this.path, JSON.stringify(this.state));
    } catch {
      // counter persistence is best-effort; never block a run
    }
    return this.snapshot();
  }

  snapshot(): BudgetSnapshot {
    const now = Date.now();
    const minute = this.state.stamps.filter((t) => now - t < 60_000).length;
    return {
      runRequests: this.runRequests,
      today: this.state.dayCount,
      minute,
      nearlyExhausted: this.state.dayCount >= DAY_LIMIT - 50,
    };
  }
}
