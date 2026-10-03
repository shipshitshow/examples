# OpenSora

The #1 AI Content Mobile App — a Sora replacement targeting $1M ARR by Q2 2026.

## Stack

- **Mobile:** React Native + Expo SDK 52 + Expo Router
- **Web:** Next.js 15 (marketing site)
- **API:** NestJS + MongoDB Atlas + Clerk
- **Monorepo:** Turborepo + npm workspaces
- **AI:** Fal.ai + Replicate

## Getting Started

### Prerequisites

- Node.js >= 20
- npm >= 10

### Install

```bash
npm install
```

This will also install Husky git hooks (pre-commit runs lint + format on staged files).

### Development

```bash
npm run dev          # start all apps
```

Or run a specific app:

```bash
cd apps/mobile && npm run dev
cd apps/web && npm run dev
cd apps/api && npm run dev
```

## Code Quality

| Command | Description |
|---|---|
| `npm run lint` | Run ESLint across all packages |
| `npm run lint:fix` | Auto-fix lint errors |
| `npm run format` | Format all files with Prettier |
| `npm run format:check` | Check formatting without writing |
| `npm run typecheck` | Run TypeScript type checking |

### Pre-commit hook

[Husky](https://typicode.github.io/husky/) runs `lint-staged` before every commit:
- `.ts/.tsx/.js/.jsx` — ESLint (with auto-fix) + Prettier
- `.json/.md/.css/.yml` — Prettier

### CI Gates

Every PR must pass:
- ESLint (no errors)
- Prettier format check
- TypeScript strict type checking

## TypeScript

All packages extend `tsconfig.base.json` which sets `"strict": true` and additional strict flags:
- `strictNullChecks`
- `noImplicitAny`
- `noUnusedLocals` / `noUnusedParameters`
- `exactOptionalPropertyTypes`
