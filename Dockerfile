FROM oven/bun:1.3-slim AS base

WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

COPY . .

ENV NODE_ENV=production
EXPOSE 1234

ENTRYPOINT ["bun", "run", "server.ts"]
