# Opensora

Episode: https://www.youtube.com/watch?v=1wSZwDps9Vg

Node 20–24 and npm 10 are the historical runtime contract. This is an educational source snapshot, not a production-ready service.

```bash
npm install
npm run dev
```

Actual stack: Expo/React Native mobile, Next.js web, Fastify API with JWT/bcrypt and MongoDB/Mongoose. It also integrates Stripe, PostHog, R2 and Fal video generation; use sandbox credentials and review provider costs before running service calls. The original README's NestJS/Clerk claims and revenue target are historical aspirations, not implemented architecture or achieved results.

Placeholder configuration was relocated under each app's `config/environment*.example` to keep environment files out of Git staging. Copy placeholders into your own local environment only when configuring the app. No credentials are supplied. A fully credential-free generation mode is not implemented.

## Provenance and reuse

See `example.json` for source and verification state. Original documentation is retained as `README.original.md` when present. No performance or security guarantee is made by copying a historical demo. Source/asset reuse terms are pending; third-party notices must be preserved.
