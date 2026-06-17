# ---- Build ----
FROM node:20-alpine AS build
# OpenSSL é necessário para os engines do Prisma detectarem a versão correta (musl/openssl-3).
RUN apk add --no-cache openssl && corepack enable
WORKDIR /repo

# Manifests primeiro (cache de deps)
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/
RUN pnpm install --frozen-lockfile

# Código
COPY packages/shared packages/shared
COPY apps/api apps/api
RUN pnpm --filter @uc/shared build \
  && pnpm --filter @uc/api exec prisma generate \
  && pnpm --filter @uc/api build

# ---- Runtime ----
FROM node:20-alpine AS runtime
RUN apk add --no-cache openssl && corepack enable
WORKDIR /repo
ENV NODE_ENV=production

COPY --from=build /repo/pnpm-workspace.yaml /repo/package.json /repo/pnpm-lock.yaml ./
COPY --from=build /repo/packages/shared packages/shared
COPY --from=build /repo/apps/api/package.json apps/api/
RUN pnpm install --prod --frozen-lockfile

COPY --from=build /repo/apps/api/dist apps/api/dist
COPY --from=build /repo/apps/api/prisma apps/api/prisma
# Gera o Prisma Client no node_modules de produção (pnpm guarda no virtual store).
RUN pnpm --filter @uc/api exec prisma generate

WORKDIR /repo/apps/api
EXPOSE 3333
# Aplica migrações e sobe a API.
CMD ["sh", "-c", "pnpm prisma migrate deploy && node dist/main.js"]
