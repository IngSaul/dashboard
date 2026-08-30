# Frontend image. The backend lives in server/Dockerfile — see
# docker-compose.yml for how the two are wired together.

FROM node:22-bookworm-slim AS build
WORKDIR /app

# Only the `server` workspace's manifest is needed here, so npm's workspace
# resolution succeeds without installing/compiling its native dependencies
# (better-sqlite3, argon2) — `--ignore-scripts` skips that entirely, which is
# safe because this build never touches server code. The frontend's own
# dependencies (React, Vite, ...) are all pure JS.
COPY package.json package-lock.json ./
COPY server/package.json ./server/package.json
RUN npm ci --ignore-scripts

COPY tsconfig.json tsconfig.app.json tsconfig.node.json tsconfig.test.json vite.config.ts index.html ./
COPY public ./public
COPY src ./src
RUN npm run build

FROM nginx:1.27-alpine AS runtime
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
