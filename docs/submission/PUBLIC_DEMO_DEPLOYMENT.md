# Railway deployment and operations

**Production URL:** https://choicemirror-production.up.railway.app  
**GitHub source:** https://github.com/1tsDaksh/choiceMirror · `main`  
**Architecture:** One long-running service hosting two Next.js applications and Playwright Chromium.

The web app listens on Railway's injected `PORT` (the deployed listener is **8080**); the synthetic benchmark is bound to `127.0.0.1:3001` and cannot be accessed directly from the internet. Railway's public domain must target **8080**. The packaged application and browser have been tested together by the [Docker smoke workflow](../../.github/workflows/public-demo-smoke.yml).

## Current service

- Railway service: `choiceMirror` in the project's production environment.
- Source: `1tsDaksh/choiceMirror`, `main`.
- One replica; the in-memory single-flight runner and file-backed quota are **not safe for horizontal scaling**.
- Persistent `/data` volume for comparison JSON, trace evidence, screenshots and daily usage accounting.
- Private Nebius key: `NEBIUS_API_KEY`, set only in Railway's private Variables editor. A GitHub Actions secret with the same name is independent; one does not automatically provide the other.
- Health endpoint: https://choicemirror-production.up.railway.app/api/health. A ready response includes `{"status":"ready","benchmark":"ready","demo":"public"}`.

## Required Railway variables

```dotenv
PUBLIC_DEMO_ENABLED=1
CHOICEMIRROR_DATA_DIR=/data
PUBLIC_DEMO_DAILY_AI_LIMIT=12
PUBLIC_DEMO_DAILY_TOTAL_LIMIT=30
PUBLIC_DEMO_DAILY_VISITOR_LIMIT=3
```

Set these **privately**, without committing their values:

- `NEBIUS_API_KEY` — active Nebius Token Factory credential.
- `PUBLIC_DEMO_HASH_SECRET` — a separate random string (at least 32 bytes) used to hash visitor identifiers.

Railway provides `RAILWAY_VOLUME_MOUNT_PATH` when the volume is correctly attached. Public execution **fails closed** if that mount, the storage directory or the Nebius key is unavailable.

## Running and observing

1. Open the public domain and select one of the four controlled scenarios; no arbitrary URLs or custom prompts are supported.
2. Start a comparison in AI mode. HTTP 202 confirms it was accepted, **not** that it completed. Follow the comparison detail page until both journeys are complete.
3. Confirm `comparison.mode: "ai"`, two completed journey records and positive `journey.ai.inferenceCalls` for each journey. Verify linked PNG screenshots.
4. Check Railway's runtime and HTTP logs for failures or 429 quota responses; monitor Nebius credits and Railway resource usage.
5. Ensure the demo link works from a signed-out browser, not only from Railway's dashboard.

## Credit and abuse protection

The same-origin JSON API restricts request size, checks scenario/goal order and permits **one active comparison** at a time. Synchronous quota reservations persist on the mounted volume. Defaults are **12 AI pairs per UTC day**, **30 total comparisons**, and **3 per visitor** (best-effort IP identification). Quotas limit requests, **not total tokens spent**; set Nebius-side spending limits if available.

The key stays in server process memory and is never returned in a browser bundle, comparison JSON or evidence artifact. The browser agent only interacts with controlled synthetic benchmark pages under a strict origin guard.

### Emergency stop

Set `PUBLIC_DEMO_ENABLED=0` in Railway Variables and redeploy. In the Railway environment, this **blocks new comparison POSTs**, rather than falling back to an unmetered local mode. Disable or rotate `NEBIUS_API_KEY` if compromise is suspected.

### Recovery and deployment checks

- **502 / connection refused:** confirm the public Railway domain routes to the **web listener port** (currently 8080), not a stale generated port. This was the cause of the original public routing failure.
- **503 on /api/health:** check that the internal benchmark on `127.0.0.1:3001` is healthy and that the key and `/data` mount exist.
- **429 on /api/comparisons:** expected when the single-flight slot or persisted daily quota is exhausted.
- **Missing screenshots:** check persistent volume mount and evidence file permissions before restarting.
- **After changes to main:** confirm CI and actual container smoke checks pass; then verify one completed comparison on the public site without revealing keys.

## Limitations

The public service intentionally benchmarks synthetic scenarios only. Global and visitor quotas reduce abuse but are not a guaranteed monetary ceiling or a substitute for provider-level controls. The file-based job/store design requires **one replica**.

[Architecture](../Architecture.md) · [Public-demo guard](../../apps/web/lib/public-demo-guard.ts) · [Security report](SECURITY_REVIEW.md)
