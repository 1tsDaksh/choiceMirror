# ChoiceMirror — public live AI demo on Railway

This deployment is a controlled, credit-limited **live Nebius AI demo** of
ChoiceMirror. Visitors can run the four predefined synthetic scenarios; they
cannot submit arbitrary websites or choose a different model or key.

## Why Railway (one persistent service)

The current app runs actual Playwright Chromium in a background process and
stores screenshot/evidence files on disk. A per-request serverless function is
not suitable: runs may outlive requests, and ephemeral files can disappear.

The root Dockerfile starts **two Next.js servers in one Railway service**:
the public web app on Railway's \`PORT\`, and the private synthetic benchmark on
\`127.0.0.1:3001\` within the same container. **Only the web app is exposed.**
The benchmark UI is intentionally not linked publicly.

The app **must run exactly one replica** with a persistent Railway Volume.
The file-backed run store, synchronous quota writes and process-wide one-run
reservation are not safe for multiple replicas. If you need scaling, first
replace both the store and quotas with transactional shared infrastructure.

## Railway setup

1. In Railway, create/select a project and connect GitHub repository
   [1tsDaksh/choiceMirror](https://github.com/1tsDaksh/choiceMirror).
   Deploy the \`main\` branch, repository root \`/\`. It automatically detects
   the root **Dockerfile** and \`railway.json\`.
2. On this service, **attach a persistent Volume mounted at \`/data\`**.
   Do this before enabling public execution. Railway should inject
   \`RAILWAY_VOLUME_MOUNT_PATH=/data\`. Do not commit a \`/data\` directory.
3. Set the following **Railway service variables** (secrets entered in
   Railway's private Variables editor; never in code/chat/commit):
   - \`NEBIUS_API_KEY\` = your protected Nebius Token Factory API key.
     **Important: GitHub Actions secrets are NOT automatically available to
     Railway.** Add the key privately to this service as well.
   - \`CHOICEMIRROR_DATA_DIR=/data\`
   - \`PUBLIC_DEMO_ENABLED=1\`
   - \`PUBLIC_DEMO_DAILY_AI_LIMIT=12\` (maximum paid comparison *pairs*
     accepted each UTC day; each pair can make multiple inference calls)
   - \`PUBLIC_DEMO_DAILY_TOTAL_LIMIT=30\` (AI plus deterministic comparisons)
   - \`PUBLIC_DEMO_DAILY_VISITOR_LIMIT=3\` (best-effort per-client allowance)
   - \`PUBLIC_DEMO_HASH_SECRET\` = new private random value, different from
     the Nebius key. Used to hash visitor IPs in the daily quota file.
   - Optional: \`NEBIUS_MODEL=zai-org/GLM-5.3-Flash\`.
4. Deploy/redeploy staged Railway configuration. Configure **one replica** and
   budget adequate resources for *two Next.js apps plus Chromium* (start
   with at least 2 GB RAM if supported by your plan).
5. In the service Networking tab, use **Generate Domain** to obtain a stable
   HTTPS \`*.up.railway.app\` domain. The readiness route is \`/api/health\`;
   it returns HTTP 200 only when the internal benchmark responds and the
   key and persistent mount configuration are present.
6. Visit the generated domain from an incognito browser. Select an approved
   scenario, run Nebius AI, wait for both journeys to complete, then open
   real screenshot and trace evidence. Confirm the URL still works from a
   different device/network.
7. Publish this verified domain and the already captured genuine AI demo
   video in README and Devpost **only after** the owner approves.

## Budget and abuse controls

- Only the fixed four scenario IDs and their exact goal order are accepted;
  arbitrary URLs, custom prompts and external targets are rejected.
- The Nebius key is read **only by the server-side AI client**. It is never
  included in JSON responses or bundled into browser JS.
- Public execution requires a same-origin \`application/json\` POST.
- Single-flight: only one comparison executes at a time; other POSTs return
  HTTP 429.
- A synchronous, file-backed quota **persisted on the Railway volume** caps
  daily paid comparisons, all comparison requests, and hashed visitor IDs.
  The global cap protects credits even if proxy IP headers are manipulated.
- Missing volume, unreadable/corrupt quota data, or an absent model key
  disables public paid execution (**fail closed**). The API returns 503;
  it never falls back to deterministic mode while claiming AI.
- Requests from other origins are blocked; request JSON payloads are bounded.
- The browser navigation policy enforces a single private benchmark origin,
  validates the model's proposed actions, and limits actions/decisions/time.
- UTC-day reset. This is a safety *limit*, not a guaranteed monetary spend
  ceiling: model calls per comparison vary, and malicious users can exhaust
  an allocated day's quota. Set a spending cap in the Nebius provider
  console too, if offered.
- **Disable immediately** if you suspect abuse: set
  \`PUBLIC_DEMO_ENABLED=0\` (or remove the provider key) and redeploy. Rotate
  your key if compromised. The public UI becomes a non-live local preview.

## Verification / debugging

1. \`GET /api/health\` must return HTTP 200 and \`{"status":"ready",...}\`.
   If it returns 503, verify the benchmark server, \`/data\` mount, and key.
2. Start a live AI comparison: expect 202, then a completed result under
   \`/comparisons/cmp_...\`. Each of the two journeys must record at least
   one real \`inferenceCalls\` entry.
3. Repeat until the low per-visitor cap: expect 429 with \`Retry-After\`.
   Restart deployment and verify quotas remain effective (volume persists).
4. Check that the browser sees no \`NEBIUS_API_KEY\`, neither in page source,
   responses, JS bundles nor URLs. **Do not share keys in debugging logs**.
5. Run CI on the PR and main before judging the deployment ready. Use the
   existing verified 2:19 silent AI recording as a fallback if service credits
   are exhausted.

## Known limitations

The demo is a synthetic benchmark and does not perform live audits of outside
websites. A global and best-effort per-IP limit is not a full abuse prevention
system. This single-process quota is **not distributed** and must never run
with multiple replicas. This deployment configuration is not itself proof
that a Railway URL is publicly reachable; verify that separately.

See [Railway volumes](https://docs.railway.com/volumes),
[environment variables](https://docs.railway.com/variables), and
[Playwright on Railway](https://railway.com/guides/playwright).
