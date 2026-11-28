# ARCHIVED — self-host / SQLite toolchain (DEP-1)

**Date:** 2026-11-28 · **Status:** `ARCHIVED — NON-CANONICAL`, kept intentionally (not deleted).

The owner selected one production architecture:

| Layer | Canonical target |
|---|---|
| Next.js app + API routes | **Vercel** |
| Database | **Neon Postgres** (`DATABASE_URL`, `provider = "postgresql"`) |
| Chat / WebRTC signaling | **Render** — the only service in `render.yaml` (`sheegow-chat`) |
| DNS | Cloudflare → Vercel |

The scripts in this directory (`build.sh`, `dev.sh`, `start.sh`,
`database-runtime-build.sh`) and the root `Caddyfile` belong to an earlier
self-hosted SQLite/Caddy deployment. They are retained for reference and local
experimentation only. **They MUST NOT be used for `sheegowacademy.com`, and a
`custom.db` file MUST NOT be copied into a Neon/Postgres deployment.**

Canonical health check: `GET https://www.sheegowacademy.com/api/health`
(public, read-only, `Cache-Control: no-store`, `503` when the DB check fails).
