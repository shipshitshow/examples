FROM node:22-alpine AS base
WORKDIR /app

# Install all monorepo dependencies
FROM base AS deps
COPY package*.json ./
COPY apps/web/package*.json ./apps/web/
COPY packages/shared/package*.json ./packages/shared/
COPY packages/api-client/package*.json ./packages/api-client/
COPY packages/ui/package*.json ./packages/ui/
RUN npm install --workspaces --if-present

# Build shared packages then the web app
FROM deps AS builder
COPY tsconfig*.json ./
COPY packages ./packages
COPY apps/web ./apps/web
RUN npm run build --workspace=@opea/shared
RUN npm run build --workspace=@opea/api-client
RUN npm run build --workspace=@opea/ui 2>/dev/null || true
RUN npm run build --workspace=@opea/web

# Production image
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/web/.next ./apps/web/.next
COPY --from=builder /app/apps/web/public ./apps/web/public
COPY --from=builder /app/apps/web/package.json ./apps/web/package.json
COPY --from=builder /app/apps/web/next.config.ts ./apps/web/next.config.ts

WORKDIR /app/apps/web
EXPOSE 3000
CMD ["npx", "next", "start"]
