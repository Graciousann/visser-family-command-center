# Visser Family Command Center

Clean Cloudflare Pages build. The frontend is intentionally self-contained in `index.html` so there are no separate CSS/JS asset-loading failures.

## Cloudflare Pages
- Framework preset: None
- Build command: blank
- Build output directory: `/`
- D1 binding name: `DB` -> `visser-command-center`
- Secret: `HOUSEHOLD_TOKEN`
- Pages Functions: `functions/api/state.js` and `functions/api/health.js`

## D1 schema
Run `schema.sql` once.

## Health check
Open `/api/health`. Expected: `dbBound`, `tokenConfigured`, and `databaseReady` are all `true`.
    Deployment refresh
