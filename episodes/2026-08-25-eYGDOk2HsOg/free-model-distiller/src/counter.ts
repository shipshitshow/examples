export class RequestCounter {
  private n = 0;
  increment(): number { return ++this.n; }
  get value(): number { return this.n; }
  toString(): string { return `${this.n} request(s)`; }
  budgetString(): string { return `${this.n}/1000 today (limit is requests, not tokens)`; }
}
