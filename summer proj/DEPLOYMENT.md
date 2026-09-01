# Collavo — Production Deployment Guide (Render + MongoDB Atlas + Azure Blob)

This guide deploys **Collavo** as a single **Render Web Service** using a Docker
image. The Express server serves the built **client** and **admin** apps from the
same origin, so the whole product runs on one service.

> The backend currently runs the demo seed in development. In production it is
> skipped unless `SEED_DEMO=true`. See [Demo data](#demo-data-optional) below.

---

## Architecture (what runs where)

| Piece | Technology | Where it lives |
|-------|-----------|----------------|
| API | Express + Node | Render Web Service (the Docker `node` process) |
| Database | MongoDB | **MongoDB Atlas** (cloud, free tier M0) |
| Uploaded files | Azure Blob Storage | Azure (persisted, survives redeploys) |
| Client app | React (Vite build) | Served statically by Express from `../client/dist` |
| Admin app | React (Vite build) | Served statically by Express at `/ops-9f3k2` |
| AI proposals | Google Gemini | Server-side (server `.env`) |
| Login | Google OAuth (optional) | Server-side callback |
| Maps | Google Maps JS SDK | Client-side (build-time key, `VITE_GOOGLE_MAPS_API_KEY`) |

Because the frontends are served by the API server on the same origin, in
production the frontend calls relative `/api` — no separate static host needed.

---

## Step 0 — Prerequisites

You need:

- A **GitHub** repo containing this project (use one service = one repo).
- A **MongoDB Atlas** account (free tier).
- A **Render** account (log in with GitHub). Render gives a free Web Service tier.
- An **Azure** account (free) for Blob storage of uploaded files.
- Your existing **Google Cloud** keys (OAuth + Maps) and **Gemini** key.

---

## Step 1 — MongoDB Atlas (database)

1. Create an account at https://www.mongodb.com/cloud/atlas.
2. Create a **free M0 cluster** (any region, e.g. `Singapore`/`Mumbai`).
3. Under **Database Access**, create a database user with a strong password.
   Save the username/password.
4. Under **Network Access**, click **Add IP Address** → **Allow access from
   anywhere** (`0.0.0.0/0`). *(For a real product, restrict to your host's IP.
   `0.0.0.0/0` is fine for a demo.)*
5. Click **Connect** → **Drivers** → copy the connection string, e.g.:

   ```
   mongodb+srv://<dbUser>:<dbPassword>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```

   You'll use this as `MONGO_URI`. Optionally append the database name:
   `...mongodb.net/collavo?retryWrites=true&w=majority`.

---

## Step 2 — Azure Blob Storage (uploaded files)

The app stores covers, profile/verification images, and deliverables. Without
Blob they go to local disk, which **Render wipes on every deploy** — so set this
up for persistence.

1. Create an Azure account at https://azure.microsoft.com free.
2. Create a **Storage account** (name like `collavostorage`; region near you;
   performance **Standard**, redundancy **LRS**).
3. Go to the storage account → **Access keys** → copy a **Connection string**,
   e.g.:
   ```
   DefaultEndpointsProtocol=https;AccountName=collavostorage;AccountKey=...;EndpointSuffix=core.windows.net
   ```
4. You'll set this as `AZURE_BLOB_CONNECTION_STRING`. The app auto-creates the
   `collavo-private` container on startup.

---

## Step 3 — Google Cloud (optional but recommended)

**Google OAuth (login)**
1. https://console.cloud.google.com → create/select a project.
2. **APIs & Services → Credentials → Create credentials → OAuth client ID**
   (type **Web application**).
3. Add **Authorized redirect URI**: `https://<your-app>.onrender.com/api/auth/google/callback`.
   (Set the other auth origins to your app URL.)
4. Copy `Client ID` and `Client secret` → `GOOGLE_CLIENT_ID`,
   `GOOGLE_CLIENT_SECRET`, and set `GOOGLE_CALLBACK_URL`.

**Google Maps (map in client)**
1. Enable the **Maps JavaScript API** and **Places API**.
2. Create an **API key**, restrict it to **HTTP referrers** = your
   `https://<your-app>.onrender.com/*`.
3. This key is baked into the frontend bundle at build time
   (`VITE_GOOGLE_MAPS_API_KEY`). **Never** put it in the React source itself.

**Gemini (AI proposal generation)**
1. Get an API key at https://aistudio.google.com/apikey.
2. Set `GEMINI_API_KEY` (server-side) and `GEMINI_MODEL`.

> Security note: the Google Maps key has appeared in your git history. **Restrict
> it to HTTP referrers** and, ideally, generate a fresh key for production.

---

## Step 4 — Repository layout & ignores

The server serves the client/admin `dist` folders one level up
(`../client/dist`, `../admin-client/dist`). The Dockerfile handles the
build + serve in one image, so the layout stays as it is.

Make sure `.env` is **not** committed (your `.gitignore` already excludes it).
Do **not** commit secrets. Secrets go in Render's environment variables.

---

## Step 5 — Create the Dockerfile

Create a file named **`Dockerfile`** in the **project root** (the folder that
contains `server/`, `client/`, `admin-client/`). This is a multi-stage build:

```dockerfile
# ---------- 1) Build client + admin ----------
FROM node:20-alpine AS build
WORKDIR /app

# Tailwind / build config shared by both apps
COPY client/package.json client/package-lock.json* ./client/
RUN cd client && npm install

COPY admin-client/package.json admin-client/package-lock.json* ./admin-client/
RUN cd admin-client && npm install

# copy sources
COPY client/ ./client/
COPY admin-client/ ./admin-client/

# Build-time env (baked into the JS bundle). Pass via --build-arg at build time.
ARG VITE_GOOGLE_MAPS_API_KEY
ENV VITE_GOOGLE_MAPS_API_KEY=$VITE_GOOGLE_MAPS_API_KEY

RUN cd client && npm run build
RUN cd admin-client && npm run build

# ---------- 2) Server runtime ----------
FROM node:20-alpine
WORKDIR /app/server

COPY server/package.json server/package-lock.json* ./
RUN npm install --omit=dev

COPY server/ ./

# Bring in the built frontends from stage 1
COPY --from=build /app/client/dist /app/client/dist
COPY --from=build /app/admin-client/dist /app/admin-client/dist

EXPOSE 8080
ENV NODE_ENV=production
ENV PORT=8080
CMD ["node", "src/server.js"]
```

> If you do not have `package-lock.json` committed, note Render/`npm install`
> still works, but committing the lockfiles makes builds reproducible.

---

## Step 6 — Deploy to Render

### 6a. Create the Web Service
1. Log in to https://dashboard.render.com with GitHub.
2. **New → Web Service** → connect your repo.
3. Render will auto-detect the `Dockerfile` (it may also see your
   `server/package.json`). **Choose the Docker** runtime/plan.
4. Set the following:

   **Build**
   - Dockerfile path: `./Dockerfile`
   - (If Render doesn't detect it, create a `render.yaml` — see below.)
   - Set the **build arg** `VITE_GOOGLE_MAPS_API_KEY` to your Maps key.

   **Runtime / Environment variables** (see the full table below):

   | Variable | Example / value | Notes |
   |----------|------------------|-------|
   | `NODE_ENV` | `production` | |
   | `PORT` | `8080` | must match Docker `EXPOSE` |
   | `MONGO_URI` | `mongodb+srv://user:pass@cluster...` | Atlas string |
   | `JWT_ACCESS_SECRET` | `<long-random>` | see below |
   | `JWT_REFRESH_SECRET` | `<long-random>` | see below |
   | `CLIENT_ORIGIN` | `https://<your-app>.onrender.com` | for CORS |
   | `ADMIN_CLIENT_ORIGIN` | `https://<your-app>.onrender.com` | for CORS |
   | `ADMIN_ROUTE_PATH` | `ops-9f3k2` | obscure path |
   | `AZURE_BLOB_CONNECTION_STRING` | `DefaultEndpointsProtocol=...` | for uploads |
   | `AZURE_BLOB_PRIVATE_CONTAINER` | `collavo-private` | |
   | `GOOGLE_CLIENT_ID` | *(optional)* | Google login |
   | `GOOGLE_CLIENT_SECRET` | *(optional)* | Google login |
   | `GOOGLE_CALLBACK_URL` | `https://<your-app>.onrender.com/api/auth/google/callback` | |
   | `GEMINI_API_KEY` | *(optional)* | AI proposals |
   | `GEMINI_MODEL` | `gemini-flash-lite-latest` | |
   | `SEED_DEMO` | `true` or unset | see Demo data |

   Generate the two JWT secrets with a long random string, e.g. run once:
   ```
   node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
   ```
   Use two different values for access and refresh.

5. **Create Web Service**. Render builds the Docker image, then starts the app.

### 6b. Optional: `render.yaml` blueprint (recommended)

Create `render.yaml` in the repo so everything is reproducible:

```yaml
services:
  - type: web
    name: collavo
    runtime: docker
    repo: https://github.com/<you>/<repo>
    plan: free
    dockerfilePath: ./Dockerfile
    dockerContext: .
    buildArgs:
      VITE_GOOGLE_MAPS_API_KEY: <your-maps-key>
    envVars:
      - key: NODE_ENV
        value: production
      - key: PORT
        value: 8080
      - key: MONGO_URI
        sync: false        # set interactively in dashboard (keeps it secret)
      - key: JWT_ACCESS_SECRET
        sync: false
      - key: JWT_REFRESH_SECRET
        sync: false
      - key: CLIENT_ORIGIN
        value: https://collavo.onrender.com
      - key: ADMIN_CLIENT_ORIGIN
        value: https://collavo.onrender.com
      - key: ADMIN_ROUTE_PATH
        value: ops-9f3k2
      - key: AZURE_BLOB_CONNECTION_STRING
        sync: false
      - key: AZURE_BLOB_PRIVATE_CONTAINER
        value: collavo-private
      - key: GEMINI_MODEL
        value: gemini-flash-lite-latest
```

`sync: false` means you fill in the secret value in Render's dashboard.

---

## Step 7 — First login / admin account

In `NODE_ENV=production`, the dev admin auto-create is skipped, and demo data is
skipped (unless `SEED_DEMO=true`). To create your **admin** account + the first
**business/creator** accounts, use `SEED_DEMO=true` on first boot, then set it
back to `false`. That runs `seedDemoData()` which creates:

- Admin: `admin@collavo.app` / `AdminPass123!`
- Business: `demo.business@collavo.app` / `Demo@1234`
- Creator: `demo.creator@collavo.app` / `Demo@1234`

> ⚠️ Those are default credentials. After you log in, **change the admin
> password** (edit in DB or via code) before presenting. For a teacher demo the
> demo accounts are convenient.

To instead create only the admin account cleanly, run the seed script directly:
```
node seed/createAdmin.js     # reads ADMIN_EMAIL / ADMIN_PASSWORD from env
```

---

## Step 8 — Verify the production app

After deploy, check:
- `https://<your-app>.onrender.com/` → client landing page loads.
- `https://<your-app>.onrender.com/ops-9f3k2/` or `/ops-9f3k2` → admin panel.
- Log in with demo accounts; post a campaign; upload a cover image (tests Azure
  Blob); apply as a creator; lock an escrow and release it; confirm the wallet
  balances and the `platform_fee` transaction.
- Confirm AI proposal generation works (Gemini).
- Open the network tab / run the e2e test against the deployed URL.

---

## Step 9 — Keeping it running

- **Free tiers** on Render sleep after ~15 min of inactivity and wake on the
  next request (first load can take ~50s). For an always-on demo, upgrade the
  Web Service to the **Starter** (paid) tier or use `curl` health-checking to
  keep it warm.
- Set up the **Monitoring** in Render to see logs and restarts.
- Every push to the connected branch triggers an automatic redeploy.

---

## Commands for local production-mode testing (before you push)

From the `server` folder, build + run production locally to catch issues:

```bash
# in client/ and admin-client/
npm run build

# in server/
cd ..   # project root, where client/, admin-client/, server/ live
NODE_ENV=production PORT=8080 \
MONGO_URI="mongodb+srv://..." \
JWT_ACCESS_SECRET=... JWT_REFRESH_SECRET=... \
CLIENT_ORIGIN=http://localhost:8080 ADMIN_CLIENT_ORIGIN=http://localhost:8080 \
SEED_DEMO=true \
node server/src/server.js
```

Then open `http://localhost:8080` (client), `http://localhost:8080/ops-9f3k2` (admin).

> Note: the dev `run.bat` runs nodemon on port 4000; production runs plain
> `node` on port 8080. Don't run both at once against the same Atlas DB unless
> you use `SEED_DEMO=false`.

---

## Troubleshooting

- **Blank page / 404 on refresh** → the SPA fallback should handle it; make sure
  the built `client/dist/index.html` exists in the image (the Docker `COPY
  --from=build` lines).
- **CORS errors** → confirm `CLIENT_ORIGIN` / `ADMIN_CLIENT_ORIGIN` equal your
  exact public URL (no trailing slash). Same-origin in production usually avoids
  CORS entirely.
- **Uploads 404 after redeploy** → you weren't using Azure Blob, so local files
  were wiped. Set `AZURE_BLOB_CONNECTION_STRING`.
- **`Missing required environment variables` on boot** → set `JWT_ACCESS_SECRET`
  and `JWT_REFRESH_SECRET` (required by `env.js`).
- **MongoDB connection refused** → check Atlas Network Access / user / string.
- **Google login redirects to localhost** → update `GOOGLE_CALLBACK_URL` to the
  Render URL and the OAuth **Authorized redirect URIs** in Google Console.
- **Maps blank** → `VITE_GOOGLE_MAPS_API_KEY` is a **build arg**, not a runtime
  env; changing it requires a rebuild.

---

## Security checklist before presenting

- [ ] Restrict the **Maps** API key to HTTP referrers; rotate it (it was exposed).
- [ ] Restrict/rotate **Gemini** key if it was exposed.
- [ ] Change the **admin password** from `AdminPass123!` in production.
- [ ] Keep `JWT_*` secrets and `MONGO_URI` secret (never commit).
- [ ] Restrict Atlas network access to your host or the Render service IP (or
      keep `0.0.0.0/0` for the demo and note the risk).
- [ ] Set `SEED_DEMO` off (`false`) once your demo data is in place.
