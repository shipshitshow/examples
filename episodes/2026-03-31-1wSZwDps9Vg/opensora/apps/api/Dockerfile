FROM node:22-alpine AS base
WORKDIR /app

# Install dependencies for the full monorepo
FROM base AS deps
COPY package*.json ./
COPY apps/api/package*.json ./apps/api/
COPY packages/shared/package*.json ./packages/shared/
RUN npm install --workspaces --if-present

# Build shared packages then the API
FROM deps AS builder
COPY tsconfig*.json ./
COPY packages/shared ./packages/shared
COPY apps/api ./apps/api
RUN npm run build --workspace=@opea/shared
RUN npm run build --workspace=@opea/api

# Production image — only what's needed to run
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Copy only production dependencies (mongoose is external to the bundle)
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/dist ./dist

EXPOSE 3001
CMD ["node", "dist/index.js"]
