# Engineering and responsible-AI standards

ChoiceMirror is maintained as a small, reproducible TypeScript project. These standards cover changes to the app, benchmark, AI adapter, browser policy and metrics.

## Before committing

1. Keep features within the controlled benchmark scope, or document and review any deliberate scope change.
2. Use strict TypeScript and Zod at boundaries where untrusted data enters.
3. Keep model decisions separate from the Playwright driver and deterministic metrics.
4. Run `pnpm typecheck`, `pnpm lint`, `pnpm test:unit`, `pnpm test:e2e` and `pnpm build`.
5. Check the public user-facing result, including empty, running, partial, failed and completed states.
6. Update the README, architecture, tests and submission evidence when an externally visible feature changes.

## Security boundaries

- Never commit secrets, private `.env.local` files, customer data or real account sessions.
- The public API accepts only catalogued scenario/goal pairs. Do not add arbitrary URL or prompt execution without new threat modelling and explicit permission controls.
- Nebius model output is untrusted; validate proposals against both Zod schemas and a fixed allowlist/action policy.
- Keep Chrome contexts isolated, block off-origin requests and account for redirect chains and service workers.
- Enforce time/action/token budgets and release browser resources in failure paths.
- Public Railway deployment remains a **single replica** while the quota and evidence store are file-backed; mounted storage and a provider-side spending cap are recommended.
- Never represent deterministic/mocked runs as live Nebius inference.

## Evidence integrity

- Counts must come from successful recorded events, not the model's opinion or fixture expectations.
- Goal selection, navigation, duplicated events and unobserved categories must not become counted actions.
- Do not calculate comparative differences unless both journeys completed with matching conditions.
- Validate finding references against actual stored event and screenshot identifiers.
- Keep observed evidence, calculated metrics and model-reported statements visibly separate.
- Describe results as controlled synthetic measurements, not proof of harmful intent, fraud or unlawful behaviour.

## Reproducibility

- Keep test fixtures deterministic and preserve documented real-model run metadata.
- Credential-free CI must not access Nebius secrets or spend inference credits.
- Opt-in live tests need an explicit `NEBIUS_LIVE=1` setting and a private environment key; repeatability testing requires a separate opt-in flag.
- Review security-sensitive changes with targeted tests and a real Docker smoke run.

**References:** [Architecture](Architecture.md) · [Product scope](PRD.md) · [Security review](submission/SECURITY_REVIEW.md).
