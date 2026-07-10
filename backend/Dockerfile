# syntax=docker/dockerfile:1

ARG NODE_VERSION=20

# ---------- Build stage ----------
FROM node:${NODE_VERSION}-alpine AS builder

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

RUN npx tsc

# ---------- Production stage ----------
FROM node:${NODE_VERSION}-alpine

WORKDIR /app

RUN apk add --no-cache dumb-init

RUN addgroup -S nodejs && adduser -S nodejs -G nodejs

COPY package*.json ./

RUN npm install --omit=dev

COPY --from=builder /app/dist ./dist

USER nodejs

EXPOSE 5000

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/server.js"]