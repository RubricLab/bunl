FROM oven/bun:1 AS base

WORKDIR /app

COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile --production

COPY . .

ENV NODE_ENV=production
EXPOSE 1234

ENTRYPOINT ["bun", "run", "server.ts"]
