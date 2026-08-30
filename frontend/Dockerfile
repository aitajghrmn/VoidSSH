FROM node:20-slim

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@9.15.9 --activate

# Rootless Podman/buildah inconsistently resolves pnpm's default store-dir
# across RUN steps (sometimes the host user's home leaks in). Pin it via
# .npmrc so build-time install and any later `pnpm add` inside the running
# container always agree on the same store location.
COPY .npmrc package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile

COPY . .

EXPOSE 5173

CMD ["pnpm", "run", "dev"]
