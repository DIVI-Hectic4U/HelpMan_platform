# ── Stage 1: Build ──────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copy root workspace files
COPY package.json package-lock.json* tsconfig.json ./
COPY prisma ./prisma/

# Copy server workspace and shared packages
COPY apps/server ./apps/server/
COPY packages ./packages/

# Install all dependencies (workspace-aware)
RUN npm install --workspace=apps/server --include=dev

# Generate Prisma client
RUN npx prisma generate --schema=prisma/schema.prisma

# Build shared package
RUN cd packages/shared && npx tsc

# Build TypeScript server
RUN cd apps/server && npx tsc

# ── Stage 2: Production ────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

# Copy prisma schema (needed by Prisma Client at runtime)
COPY prisma ./prisma/

# Copy root package files
COPY package.json package-lock.json* ./

# Copy server package and built shared packages
COPY apps/server/package.json ./apps/server/package.json
COPY --from=builder /app/packages ./packages/

# Install production deps only
RUN npm install --workspace=apps/server --omit=dev
RUN npx prisma generate --schema=prisma/schema.prisma

# Copy compiled JS from builder
COPY --from=builder /app/apps/server/dist ./apps/server/dist

ENV NODE_ENV=production

EXPOSE 10000

CMD ["node", "apps/server/dist/index.js"]
