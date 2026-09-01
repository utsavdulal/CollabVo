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

# Build-time env is read by Vite from the committed client/.env and
# admin-client/.env files (COPY'd above). Do NOT set VITE_* as ENV here with
# empty ARGs, because that would override (clobber) the values in those .env
# files and produce bundles with empty VITE_* vars (blank admin / no maps).

# Admin app is served under /<ADMIN_ROUTE_PATH>, so its built assets must be
# namespaced under that base or they collide with the top-level client /assets.
ARG ADMIN_BASE=/ops-9f3k2/
ENV ADMIN_BASE=$ADMIN_BASE

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
