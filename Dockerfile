# M0 walking skeleton: single image with api (tsx runtime) and the built SPA.
# Hardening (multi-stage prune, non-root) is scheduled for M8 pilot readiness.
FROM node:22-alpine

WORKDIR /repo
RUN corepack enable

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/contracts/package.json packages/contracts/
COPY packages/core/package.json packages/core/
COPY packages/business/package.json packages/business/
RUN pnpm install --frozen-lockfile --ignore-scripts

COPY . .
RUN pnpm --filter @veriq/web build

EXPOSE 3000
CMD ["pnpm", "--filter", "@veriq/api", "start"]
