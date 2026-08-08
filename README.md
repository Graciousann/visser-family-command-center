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


## Sync-route repair

This build uses `/api/sync` instead of `/api/state` to force Cloudflare Pages to compile a fresh sync route.


## D1-based household authentication

This build no longer requires `HOUSEHOLD_TOKEN`.

On the first authenticated sync attempt, the supplied family code is SHA-256 hashed and the hash is stored in D1. The plaintext code is never stored in D1 or GitHub. Subsequent devices must use the same family code.

If you ever need to reset the household code, run:

```sql
DELETE FROM household_config WHERE id = 'visser';
```

Then the next family code entered becomes the new household code.
