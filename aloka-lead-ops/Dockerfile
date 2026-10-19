FROM node:22-bookworm-slim AS base
WORKDIR /app
COPY package*.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/contracts/package.json packages/contracts/package.json
COPY packages/integrations/package.json packages/integrations/package.json
RUN npm ci
COPY . .
FROM base AS web
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
RUN npm run build
CMD ["npm","run","start","-w","@aloka/web"]
FROM base AS api
CMD ["npx","tsx","apps/api/src/server.ts"]
FROM base AS worker
CMD ["npm","run","worker"]
