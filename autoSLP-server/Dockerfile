# Multi-stage production Dockerfile for Fastify + TypeScript Backend
FROM node:20-alpine AS base

# Step 1: Install production dependencies
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json ./
# Run Prisma schema generation client steps if needed
RUN npm ci

# Step 2: Compile TypeScript to standalone JS output
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Compile TypeScript files with fast build steps
RUN npm run build

# Step 3: Minimal execution runner instance
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4000
ENV HOST=0.0.0.0

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 fastify

# Copy production node_modules and built dist bundle folders
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./package.json

# Copy prisma Client schemas to ensure safe DB integration
COPY --from=builder /app/src/prisma ./src/prisma

USER fastify

EXPOSE 4000

CMD ["node", "dist/index.js"]
