FROM node:20-alpine AS base

ENV PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING=1 \
    npm_config_fetch_retries=5 \
    npm_config_fetch_retry_factor=2 \
    npm_config_fetch_retry_mintimeout=10000

RUN apk add --no-cache openssl libc6-compat
WORKDIR /app

FROM base AS deps
COPY prisma ./prisma
COPY package*.json ./
RUN npm ci

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY package*.json tsconfig.json ./
COPY prisma ./prisma
COPY src ./src
RUN npx prisma generate && npx tsc -p tsconfig.json

FROM base AS prod-deps
COPY prisma ./prisma
COPY package*.json ./
RUN npm ci --omit=dev
RUN npx prisma generate

FROM base AS runner
ENV NODE_ENV=production
COPY package*.json ./
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
EXPOSE 3333
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/src/index.js"]
