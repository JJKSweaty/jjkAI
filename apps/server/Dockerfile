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

# Install system libraries required by onnxruntime-node and pdf-parse
RUN apt-get update && apt-get install -y --no-install-recommends \
    libc6 \
    libstdc++6 \
    libgomp1 \
    build-essential \
    libcairo2-dev \
    libpango1.0-dev \
    libjpeg-dev \
    libgif-dev \
    librsvg2-dev \
  && rm -rf /var/lib/apt/lists/*

# Create a non-root user
RUN groupadd --system --gid 1001 nodejs && \
    useradd --system --uid 1001 --gid nodejs fastify

# Create cache directory for xenova transformers and give permissions
RUN mkdir -p /tmp/xenova-cache && \
    chown -R fastify:nodejs /tmp/xenova-cache

# Copy built application
COPY --from=builder --chown=fastify:nodejs /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

# Create dummy test file for pdf-parse bug workaround
RUN mkdir -p ./test/data && \
    echo "dummy" > ./test/data/05-versions-space.pdf && \
    chown -R fastify:nodejs ./test

USER fastify

EXPOSE 8080

ENV PORT=8080
ENV HOST=0.0.0.0

CMD ["node", "dist/index.js"]
