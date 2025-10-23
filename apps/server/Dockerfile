# Use Node.js 20 LTS (Debian-based for onnxruntime compatibility)
FROM node:20-bookworm-slim AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./
RUN npm ci

# Build the application
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build TypeScript to JavaScript
RUN npm run build

# Production image, copy all the files and run the app
FROM node:20-bookworm-slim AS runner
WORKDIR /app

ENV NODE_ENV=production

# Install system libraries required by onnxruntime-node
RUN apt-get update && apt-get install -y --no-install-recommends \
    libc6 \
    libstdc++6 \
    libgomp1 \
  && rm -rf /var/lib/apt/lists/*

# Create a non-root user
RUN groupadd --system --gid 1001 nodejs && \
    useradd --system --uid 1001 --gid nodejs fastify

# Copy built application
COPY --from=builder --chown=fastify:nodejs /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

USER fastify

EXPOSE 8080

ENV PORT=8080
ENV HOST=0.0.0.0

CMD ["node", "dist/index.js"]
