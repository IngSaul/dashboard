# Build context is the REPO ROOT (see docker-compose.yml) — `server` is an
# npm workspace, so the single lockfile lives at the root, not here.
#
# node:22-bookworm-slim (glibc), not Alpine: better-sqlite3 and argon2 are
# native (napi) modules, and glibc has the most reliable prebuilt-binary
# support — see specs/003-auth-persistence/research.md §7.

FROM node:22-bookworm-slim AS build
WORKDIR /app

# Build toolchain for the native modules — build-stage only, never shipped
# in the runtime image.
RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
COPY server/package.json ./server/package.json
RUN npm ci --workspace=server

COPY server/tsconfig.json server/tsconfig.build.json ./server/
COPY server/src ./server/src
RUN npm run build --workspace=server
RUN npm prune --omit=dev --workspace=server

FROM node:22-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/server/dist ./server/dist
COPY server/package.json ./server/package.json

EXPOSE 3210

CMD ["node", "server/dist/index.js"]
