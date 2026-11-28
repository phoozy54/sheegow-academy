# G0 Threat Note — DEP-1: Single canonical deployment architecture

**Nooca:** 1.1 · **Taariikhda:** 2026-11-28 · **Gate:** G0 → G1 → G2 dhammeeyay (pending independent review; G3/G4 ma jiro)

```
Feature / endpoint:
  Deployment architecture + /api/health + DB bootstrap scripts

Asset affected:
  Production availability + database integrity + operator clarity during incidents

Trust boundary crossed:
  Operator/CI → build scripts → Vercel (app) + Neon (Postgres) + Render (chat)

Worst-case abuse / breakage:
  Three "canonical" configs (vercel.json, render.yaml, Caddyfile/.zscripts)
  make an operator run the wrong build: SQLite file copied into a Postgres app,
  `db push --accept-data-loss` against live data, or health checks pointed at
  the wrong service. No `/api/health` means no early signal on DB failure.

Primary control + test:
  Document ONE target: app = Vercel, DB = Neon Postgres, chat = Render (existing
  render.yaml, unchanged). Add a public, read-only /api/health (SELECT 1, no
  secrets, no-store, 503 on failure, 10s per-instance cache so a public probe
  cannot exhaust Neon connections). Replace `db:push` with a guarded bootstrap
  that refuses a non-empty DB and never overrides an exported `DATABASE_URL`;
  add `db:deploy` (`prisma migrate deploy`) for reviewed migrations (a no-op
  until migration files exist). No migration file is created or applied. Mark
  self-host Caddy/.zscripts as ARCHIVED (do not delete user work).
  Tests: canonical_architecture_documented, no_accept_data_loss_and_no_env_override,
         render_yaml_chat_only, schema_provider_postgresql, archived_self_host_marked,
         health_payload_shape, health_route_no_leak,
         health_probe_is_throttled_and_no_store,
         health_failure_returns_503_without_exposing_the_error.

Rollback / kill switch:
  Docs + scripts + one new read-only route; no schema change, no migration
  applied, no env value read, no infra change, no deploy. Rollback = revert files.
```

**Go'aanka mulkiilaha (2026-11-28):** `Vercel + Neon` waa qaabka rasmiga ah; chat service-ku wuxuu ku harayaa Render.

**G1 ee la sameeyay:** `src/lib/health.ts` + `src/lib/health-handler.ts` + `src/app/api/health/route.ts` (`SELECT 1`, `no-store`, `503`, 10s cache, wax host/secret/error ah ma jiro); `scripts/db-bootstrap.mjs` (empty-DB keliya, `dotenv.config()` aan `override` lahayn); `package.json` (`db:deploy`, `db:*` oo dhan override la'aan); `README.md`/`DEPLOYMENT.md`/`.env.example`/`render.yaml`/`src/lib/socket.ts` hal target; `Caddyfile`, `.zscripts/*`, `tests/database-runtime-build.sh` oo calaamad `ARCHIVED — NON-CANONICAL` leh; `tests/deployment.test.ts` (9 tests, oo `GET()` dhab ah wacaya).

**Dib-u-eegis #1 (3 MED + 4 LOW) — dhammaan la hagaajiyay:** exported `DATABASE_URL` hadda wuu guulaystaa; `db:push` waxay diidaa DB aan madhnayn; health waa la throttled gareeyay; route-ka si dhab ah ayaa loo tijaabiyaa; README/Railway/3003 waa la saxay; calaamado archived ah ayaa lagu daray; magacyada test-ka iyo playbook waa la waafajiyay.

**Dib-u-eegis #2 (M-1):** `spawnSync` raw output (`stdio: "inherit"`) waa la saaray; hadda waa `["ignore","pipe","pipe"]`, stdout/stderr waa la qabtaa oo la tuuraa, fariin guud keliya ayaa la daabacaa — P1001/host/connection-string fragment ma gudbayo terminal/CI log. Test-ku wuxuu caddeynayaa `shell: false` iyo in `result.stdout`/`result.stderr` aan la isticmaalin.

**Xusuusin:** Ma jiro schema/migration/env value/auth/bin/dependency change; ma jiro deploy ama production touch. `db:push` waa empty-DB bootstrap keliya; xog dhab ah → snapshot + migrations la eegay. `db:deploy` weli ma abuuro schema ilaa `prisma/migrations/` la keeno.
