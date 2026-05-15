# HangarBrain SMS Module (`hangerbrain-sms`)

Separate deployable SMS workspace that consumes the existing HangarBrain API.  
This keeps the core app stable while enabling top-tier SMS workflows and reporting in a dedicated product surface.

## Product positioning

Move beyond checkbox compliance with one safety workspace for:

- Team-level operational visibility
- Safety signal monitoring from SDR and watchlists
- Compliance risk focus (overdue and pending AD/SB status)
- Organization-level SMS performance snapshot

## Architecture

- **Frontend:** Next.js (App Router, TypeScript)
- **Data source:** Existing HangarBrain API (`/api/*`)
- **Bridge:** built-in server-side API proxy (`/api/hb/*`) to avoid browser CORS issues
- **Auth model:** Uses API session context; optional static bearer token for local/demo
- **Deployment:** Independent from `hangarbrain-copilot-lite/frontend`

No backend changes are required for basic operation.

## Environment

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Required:

- `HB_API_URL` (example: `http://localhost:8000`)

Optional:

- `NEXT_PUBLIC_HB_APP_URL` (link back to core app)
- `HB_API_BEARER_TOKEN` (dev/demo only; consumed server-side by the SMS proxy)

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3010`.

## Existing API endpoints used

- `GET /api/session`
- `GET /api/organizations/current`
- `GET /api/organizations/members`
- `GET /api/job-assignments`
- `GET /api/watchlists/feed`
- `GET /api/compliance/fleet-status`
- `POST /api/search/sdr`

## Deploy independently

Deploy this app as its own service (Vercel, Netlify, container, etc.).  
Ensure HangarBrain backend CORS includes the deployed SMS origin.

## Create/push as standalone GitHub repo

```bash
cd /path/to/hangerbrain-sms
git init
git add .
git commit -m "Initial HangarBrain SMS module scaffold"
git branch -M main
git remote add origin git@github.com:<owner>/hangerbrain-sms.git
git push -u origin main
```

## Safety disclaimer

HangarBrain / SDR Copilot is an analytical decision-support tool. It does not provide maintenance instructions, airworthiness determinations, regulatory compliance decisions, or flight safety approvals. Always consult FAA-approved data, manufacturer manuals, service bulletins, Airworthiness Directives, and qualified aviation maintenance professionals.
