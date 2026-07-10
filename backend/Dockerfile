# syntax=docker/dockerfile:1

ARG NODE_VERSION=22.19.0

# Build stage
FROM node:${NODE_VERSION}-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

RUN npm ci

RUN ls -la node_modules/.bin
RUN npx tsc --version

COPY . .

RUN npm run build

# Production stage
FROM node:${NODE_VERSION}-alpine

WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001

# Copy package files
COPY package.json package-lock.json ./

# Install production dependencies only
RUN npm ci --omit=dev && npm cache clean --force

# Copy built app from builder
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist

USER nodejs

EXPOSE 5000

HEALTHCHECK --interval=10s --timeout=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5000/', (r) => { r.resume(); if (r.statusCode !== 200) process.exit(1); process.exit(0); }).on('error', () => process.exit(1))"

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/server.js"]
