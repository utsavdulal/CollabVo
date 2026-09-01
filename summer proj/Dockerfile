# ---------- 1) Build client + admin ----------
FROM node:20-alpine AS build
WORKDIR /app

# Prepare client dir and install deps
RUN mkdir -p /app/client
COPY client/package.json client/package-lock.json* /app/client/
RUN cd /app/client && npm install

# Prepare admin dir and install deps
RUN mkdir -p /app/admin-client
COPY admin-client/package.json admin-client/package-lock.json* /app/admin-client/
RUN cd /app/admin-client && npm install

# Copy full sources
COPY client/ /app/client/
COPY admin-client/ /app/admin-client/

# Build-time env baked into the JS bundles
ARG VITE_GOOGLE_MAPS_API_KEY
ENV VITE_GOOGLE_MAPS_API_KEY=$VITE_GOOGLE_MAPS_API_KEY
ARG VITE_ADMIN_BASE
ENV VITE_ADMIN_BASE=$VITE_ADMIN_BASE

RUN cd /app/client && npm run build
RUN cd /app/admin-client && npm run build

# ---------- 2) Server runtime ----------
FROM node:20-alpine
WORKDIR /app/server

COPY server/package.json server/package-lock.json* ./
RUN npm install --omit=dev

COPY server/ ./

# Bring built frontends from stage 1 (must land at ../client/dist & ../admin-client/dist
# relative to /app/server, because server's app.js looks one level up)
COPY --from=build /app/client/dist /app/client/dist
COPY --from=build /app/admin-client/dist /app/admin-client/dist

EXPOSE 8080
ENV NODE_ENV=production
ENV PORT=8080
CMD ["node", "src/server.js"]
