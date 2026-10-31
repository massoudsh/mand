# Issues, Features & Improvements for Mand — AI Agent Markdown

Backlog for `massoudsh/mand` (Retention & Uplift Decisioning Engine for Iranian Consumer Platforms). Written so an AI coding agent can pick up each item with clear acceptance criteria, touchpoints, and risk notes.

Repo layout: `backend/`, `frontend/`, `db/`, `scripts/`, `docs/gh-wiki/`, `ROADMAP.md`, `README.md`.

---

## 1) Bug / Issue Backlog

### Issue A — No real channel execution (P0 gap)
**Type:** Bug / Missing Integration
**Priority:** High (P0)
**Context:** README lists "Channel connection hub for SMS, push, phone and CRM — P0" as top next feature. `POST /api/campaigns/:id/activate` approves execution but no adapter sends.
**Task:** Implement `ChannelAdapter` interface + at least one reference adapter (console/file for tests) + dispatch worker.
**Acceptance Criteria:**
- Interface: `send(recipient, template, metadata) -> {status, providerId, error?}`.
- Campaign lifecycle: `draft → queued → sending → sent|failed` with per-recipient results.
- `sent` only after adapter confirmation (no fake success).
- Unit tests for retry, partial failure, idempotency.
**Notes:** Keep adapters pluggable in `backend/`. Feature flag `ENABLE_LIVE_SENDS=false` by default.

### Issue B — Uplift estimates unvalidated against real holdout
**Type:** Bug / Methodology
**Priority:** High
**Context:** MVP uses realistic synthetic data; uplift engine outputs unverified.
**Task:** Add validation harness computing uplift on synthetic data with known ground-truth uplift; assert model recovery within tolerance.
**Acceptance Criteria:**
- Synthetic generator supports configurable true uplift per segment.
- Model recovers true uplift within ±X% on benchmark (document X).
- Test fails on systematic bias (e.g., overestimate on sleeping-dog segment).

### Issue C — Explainability engine not surfaced end-to-end
**Type:** Bug / Spec Gap
**Priority:** High
**Context:** README promises every decision has a human-readable reason; dashboard/API contract unspecified.
**Task:** Define `DecisionExplanation` schema (`factors[]`, `counterfactual`, `confidence`) across `/api/overview`, `/api/segments`, campaign suggestions.
**Acceptance Criteria:**
- Every decision object includes `explanation`.
- Dashboard renders factors consistently (RTL-safe).
- Contract tests per endpoint.

### Issue D — Competitor comparison data is estimated, not sourced
**Type:** Bug / Data Integrity
**Priority:** Medium
**Context:** Competitor data is analytical estimate; must be validated before business decisions.
**Task:** Add provenance fields (`sourceType: estimated|interviewed|verified`, `sourceDate`, `confidence`) + disclaimer badge in comparison tab.
**Acceptance Criteria:**
- `GET /api/comparison` returns provenance per row.
- UI shows warning badge when `sourceType=estimated`.
- Tests assert disclaimer rendering.

### Issue E — No persistence layer described
**Type:** Bug / Architecture Gap
**Priority:** Medium
**Context:** `db/` holds sample data; no schema/migrations/ORM documented.
**Task:** Add schema (Prisma or similar) covering users, segments, campaigns, decisions, experiments, audit log; seed script for synthetic data.
**Acceptance Criteria:**
- `npm run db:migrate && npm run db:seed` produces working demo DB.
- Tests run against real ephemeral DB (or in-memory equivalent).
- README documents setup.

### Issue F — Auth / RBAC unspecified for campaign activation
**Type:** Bug / Security
**Priority:** Medium
**Context:** `POST /api/campaigns/:id/activate` approves money-spending execution; no auth/RBAC documented.
**Task:** Add auth (API key or session) + role check (`approver` required) + audit log entry.
**Acceptance Criteria:**
- Unauthenticated → `401`; wrong role → `403`.
- Activation writes audit event (actor, campaign, timestamp).
- Tests for all three cases.

### Issue G — No idempotency / dedupe on activation
**Type:** Bug / Correctness
**Priority:** Medium
**Task:** Add idempotency keys to activation and send dispatch to prevent double-spends.
**Acceptance Criteria:**
- Repeated activation with same key returns cached result, no re-send.
- Concurrent activation tested.

### Issue H — Budget cap enforcement undefined
**Type:** Bug / Business Logic
**Priority:** High
**Context:** Value prop: spend only where it works. No cap enforced.
**Task:** Enforce per-campaign and per-customer budget cap; block activation if estimated cost > cap.
**Acceptance Criteria:**
- `expectedCost` computed server-side from incentive config.
- Activation rejected `422` with reason when over cap.
- Tests for cap boundary (equal, over, under).

### Issue I — Test coverage claims unverified
**Type:** Bug / Documentation
**Priority:** Medium
**Task:** Add coverage reporting and CI (Node 20, lint, test, build).
**Acceptance Criteria:**
- CI badge in README; threshold (e.g., 80% backend).
- Failing coverage blocks merge.

---

## 2) Features

### Feature 1 — Customer journey builder with triggers and branching (P0)
**Priority:** High (P0)
**Task:** `journeys` model + `POST/GET /api/journeys` with triggers (`segment_entry`, `event`, `time_delay`), branches (condition → path), steps (channel, template, wait).
**Acceptance Criteria:**
- Validation rejects cycles and orphan steps.
- `POST /api/journeys/:id/activate` requires approver role.
- `/api/journeys/:id/simulate` estimates reach and cost on synthetic data.
- Tests for branch conditions and trigger firing.

### Feature 2 — Loyalty wallet (points, expiry, spend cap) (P1)
**Priority:** Medium (P1)
**Task:** `/api/wallets/:userId` (balance, ledger, expiry) + `/api/wallets/:userId/redeem` with spend-cap enforcement.
**Acceptance Criteria:**
- Append-only ledger; balance derived.
- Expiry job marks lots and fires events.
- Redemption respects cap + idempotency key.

### Feature 3 — A/B & holdout experimentation center (P1)
**Priority:** Medium (P1)
**Task:** Experiment model, deterministic assignment, uplift measurement at `/api/experiments/:id/results`.
**Acceptance Criteria:**
- Assignment stable and reproducible.
- Results include `lift`, `ci_low`, `ci_high`, `p_value`, `n`.
- Tests with synthetic ground-truth verify CI coverage.

### Feature 4 — Customer service & call timeline (P2)
**Priority:** Low (P2)
**Task:** `/api/customers/:id/timeline` aggregating campaign sends, support tickets, calls; UI timeline.
**Acceptance Criteria:**
- Paginated, ordered by timestamp.
- RTL-safe; tests for empty/partial timelines.

### Feature 5 — Holdout-aware budget allocator
**Priority:** High
**Task:** `/api/allocation` proposing budget split maximizing expected incremental value subject to caps, reserving holdout.
**Acceptance Criteria:**
- Output sums to ≤ budget cap.
- Holdout share ≥ configurable minimum.
- Tests verify objective monotonicity on synthetic uplift.

### Feature 6 — Campaign templates library
**Priority:** Medium
**Task:** `/api/templates` CRUD with channel-specific variables + RTL-safe preview.
**Acceptance Criteria:**
- Preview renders variables with synthetic user.
- Missing-variable errors surfaced at save time.

### Feature 7 — Decision export (CSV / JSON)
**Priority:** Medium
**Task:** `GET /api/overview/export?format=csv|json` with filters (segment, date range, decision type).
**Acceptance Criteria:**
- Stable columns documented in OpenAPI.
- Streamed for large result sets.

### Feature 8 — Synthetic data generator CLI
**Priority:** Medium
**Task:** `npm run gen:data -- --users 10000 --seed 42 --true-uplift config.json` producing reproducible dataset with ground truth.
**Acceptance Criteria:**
- Deterministic output for given seed.
- Validated by schema; consumed by Issue B harness.

---

## 3) Improvements

### Improvement 1 — OpenAPI spec + generated client
**Priority:** High
**Task:** `openapi.yaml` for all `/api/*`; Swagger UI in dev; CI validates on PR.
**Acceptance:** Breaking-change detection; generated typed client used by frontend.

### Improvement 2 — Structured logging + request IDs
**Priority:** High
**Task:** `pino` with `requestId`, route, latency, decision IDs (never raw PII).
**Acceptance:** Redaction tests; `X-Request-Id` propagated.

### Improvement 3 — Health & readiness endpoints
**Priority:** High
**Task:** `/api/health` (liveness) + `/api/ready` (DB + adapter checks).
**Acceptance:** `503` when dependencies down; documented.

### Improvement 4 — Config validation on boot
**Priority:** High
**Task:** Zod-validated env schema; fail fast with clear errors; document all vars in README.
**Acceptance:** Tests for invalid configs.

### Improvement 5 — Error envelope consistency
**Priority:** Medium
**Task:** Standardize `{ error: { code, message, details? } }` across handlers.
**Acceptance:** Contract tests; changelog note.

### Improvement 6 — RTL UI test coverage
**Priority:** Medium
**Task:** Playwright visual regression for RTL layout across five tabs.
**Acceptance:** CI screenshots on PR; diffs flagged.

### Improvement 7 — Privacy minimization
**Priority:** High
**Task:** Hash user identifiers; never log raw IDs; add data-retention policy doc.
**Acceptance:** Security tests assert no PII in logs/responses beyond minimum.

### Improvement 8 — Property-based tests for decision engine
**Priority:** High
**Task:** `fast-check` invariants: holdout never treated, budget cap never exceeded, no negative expected value recommended.
**Acceptance:** 10k-case property suite in CI.

### Improvement 9 — Frontend build reproducibility
**Priority:** Medium
**Task:** Pin toolchain, add lockfile, document build; self-host RTL fonts (no external CDN).
**Acceptance:** `npm ci && npm run build` from clean cache in CI.

### Improvement 10 — AGENTS.md + wiki discipline
**Priority:** Medium
**Task:** Add `AGENTS.md` (like Sudban) with wiki rules; CI check that new entities have wiki pages.
**Acceptance:** Failing check names missing page.

### Improvement 11 — Roadmap ↔ issue sync check
**Priority:** Low–Medium
**Task:** CI script verifying every `ROADMAP.md` item links to an issue and every P0/P1 is in a milestone.
**Acceptance:** CI fails on drift; report printed.

### Improvement 12 — Synthetic data realism documentation
**Priority:** Medium
**Task:** Document generator parameters, distributions, limitations; link from README "Status".
**Acceptance:** `docs/SYNTHETIC_DATA.md` exists; Issue B references it.

---

## 4) Suggested Agent Execution Order

1. Improvement 3 + 4 (health/config).
2. Issue E (persistence + seed).
3. Improvement 1 (OpenAPI) + Improvement 5 (error envelope).
4. Issue B (uplift validation) + Feature 8 (data generator).
5. Improvement 8 (property tests) + Issue H (budget cap).
6. Feature 5 (allocator) + Issue C (explainability surface).
7. Issue A (channel adapters) + Feature 1 (journey builder) — P0 delivery.
8. Feature 3 (experimentation) + Issue G (idempotency).
9. Feature 2 (loyalty) + Feature 4 (timeline).
10. Improvement 6 + 7 (RTL tests, privacy).

---

## 5) Definition of Done (per item)

- [ ] Code + tests (unit; integration where DB/channel involved).
- [ ] `npm test` and `npm start` pass; CI green.
- [ ] Docs updated: `README.md`, `ROADMAP.md`, `docs/gh-wiki/` (per `AGENTS.md`).
- [ ] Feature flagged if external behavior changes (`ENABLE_LIVE_SENDS`, etc.).
- [ ] No raw PII in logs or responses; hashed identifiers only.
- [ ] Budget-cap and holdout invariants covered by tests when money/decisions involved.
- [ ] Changelog entry; no breaking change without version bump.

---

## 6) Notes for Agents

- Mand is Phase 0 (exploration / design partner). Prefer correctness harnesses and contracts (Issues B, C, H; Improvements 1, 8) before expanding surface area.
- Core promise: incremental value with explainability. Any budget-spending feature needs server-computed cost, cap enforcement, holdout reservation, and human-readable reason.
- Iranian network constraints: self-host fonts/assets, avoid external CDNs, keep payloads small.
- Competitor comparison is estimated data — always carry provenance and disclaimer.
- Follow existing split (`backend/`, `frontend/`, `db/`, `scripts/`, `docs/gh-wiki/`). Don't add a top-level dir without updating `README.md`.