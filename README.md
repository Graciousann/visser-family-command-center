# Visser Family Command Center

A shared household dashboard designed for GraceAnn + Andrew to distribute the *mental load*, not just the task list.

## What it does

- Today view with family events and a shared inbox
- GraceAnn / Andrew task ownership with one-click reassignment
- Fair-Play-inspired responsibility ownership (conception + planning + execution)
- Weekly view for the household
- Simple dinner plan for high-load work nights
- Keeps Hearth and each family member's Apple Calendar as source-of-truth systems instead of duplicating chores/calendars
- Offline-first local storage
- Optional cross-device shared state through Cloudflare Pages Functions + D1

## Deploy on Cloudflare Pages

This repo is intentionally build-free.

1. Create a Cloudflare Pages project from the GitHub repository.
2. Framework preset: **None**.
3. Build command: leave blank.
4. Build output directory: `/`.
5. Create a D1 database (for example `visser-command-center`).
6. Run `schema.sql` against that D1 database.
7. In Pages > Settings > Functions > D1 bindings, add a binding named **DB** pointing to that database.
8. In Pages > Settings > Environment variables, add an encrypted secret named **HOUSEHOLD_TOKEN**. Use a private family code known only to GraceAnn and Andrew.
9. Redeploy.
10. On each adult's device, open Settings in the dashboard and enter the same family code.

## Security

The shared API rejects reads and writes unless the `X-Household-Code` header exactly matches the Cloudflare secret `HOUSEHOLD_TOKEN`. Do not commit the actual family code to GitHub.

For stronger account-based protection, place Cloudflare Access in front of the entire site and allow only the adults' email addresses.

## Local development

Because the frontend is plain HTML/CSS/JS, open `index.html` directly for UI work. Shared syncing requires Cloudflare Pages Functions (or a compatible local Pages runtime) plus the DB and secret bindings.

## Project structure

- `index.html` – dashboard markup
- `styles.css` – responsive family dashboard styling
- `app.js` – interactions, local persistence, sync client
- `functions/api/state.js` – authenticated shared-state API
- `schema.sql` – D1 database schema
