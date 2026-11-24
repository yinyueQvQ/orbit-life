FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json .npmrc ./
RUN npm ci --ignore-scripts --no-audit --no-fund
COPY . .
RUN npm run build:local
FROM node:24-bookworm-slim
ENV NODE_ENV=production ORBIT_DATA_DIR=/data PORT=8080
WORKDIR /app
COPY package.json package-lock.json .npmrc ./
RUN npm ci --omit=dev --ignore-scripts --no-audit --no-fund
COPY --from=build /app/dist-local ./dist-local
COPY server ./server
COPY shared ./shared
COPY deploy ./deploy
EXPOSE 8080
CMD ["node","deploy/server.mjs"]
