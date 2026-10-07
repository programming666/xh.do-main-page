# Production deployment — editorial hero background

Date: 2026-10-07
Target: SSH alias `netcup-b`, application `/opt/xhdo/app`, PM2 process `xhdo`, existing port **3001** retained.
Local branch: `feat/editorial-appearance`; no Git commit or push performed.

## Validation before promotion

- Independently staged candidate at `/opt/xhdo/candidates/editorial-20261006` using a consistent SQLite backup of production.
- `npm test`: 18 passed, zero failures.
- Prisma migrations, Prisma generation, TypeScript and production build passed on the target host.
- ESLint: no errors; 8 warnings in existing files on the target installation.
- Browser: desktop 1440px and mobile 360px; full-page fixed hero, no separate media panel, automatic palette sampling active, no horizontal overflow. Dark-theme media also sampled successfully. Background stays fixed while scrolling.
- Candidate `/zh`, `/en`, both friend pages, login and icon returned 200. Protected appearance page returned 307, admin API returned 401 without authentication.
- Review was performed inline; the independent review agent could not run due to its model-service error.

## Promotion

Backup: `/opt/xhdo/backups/editorial-before-20261007`
Promotion/rollback-on-error script: `/opt/xhdo/deploy-input/editorial-20261006/promote.sh`

- Preserved production `.env`, Git metadata, PM2 ecosystem configuration, database and uploads.
- Preserved the previous build's hashed static assets so cached old HTML continues working.
- Stopped PM2 briefly, took a final database snapshot, synchronized validated code/build, applied the appearance migration, and restarted the existing process.
- Compared all pre-existing columns and records in every application table against the backup: unchanged.
- SQLite integrity and foreign-key checks passed.
- Origin and protected-route smoke checks passed; PM2 process is online and its process list was saved.

## Public verification and remaining cache action

Verified in a real browser:
- `https://xh.do/zh?release=editorial-20261007`: new UI, sampled palette, fixed backdrop, no overflow or console errors.
- English and friend pages with the same release query: HTTP 200, new UI.

**Plain `/zh` still serves the old cached page.** Cloudflare headers showed a cache HIT before promotion. The purge helper was attempted with `--urls-only`, but `CF_API_TOKEN` is absent, so it explicitly skipped the purge. This is a remaining operator action, not a successful purge.

Purge these URLs through the Cloudflare dashboard or the project's purge script once a scoped token is available:
- `https://xh.do/`
- `https://xh.do/zh`
- `https://xh.do/en`
- `https://xh.do/zh/friends`
- `https://xh.do/en/friends`

Browser console warnings observed after deployment concern unused CSS preloads, not runtime exceptions. A Python urllib probe was rejected by the edge with 403; browser checks above succeeded.

The candidate service was stopped during promotion. The local SSH preview tunnel had already been stopped automatically by the host for low memory; it was not restarted.
