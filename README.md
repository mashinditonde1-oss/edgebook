# Edgebook

A phone-installable daily betting journal with a monthly calendar, guided bet entry, and Supabase cloud storage.

## Use

Serve the app over HTTPS with a static host, including GitHub Pages. `index.html` opens `betting-journal.html`. Publish the HTML, manifest, service worker, and the entire `icons` directory together.

For local preview, run `node scripts/preview.cjs` and open http://127.0.0.1:4173/betting-journal.html.

Tap a calendar date to log a bet. The form asks one step at a time: stake, result, payout for wins, details, then review. Loss returns are zero; pushes return the stake.

## Phone installation

Open the HTTPS website on the phone and use the Install app button. Chrome on Android offers Install app / Add to Home screen. On iPhone or iPad, open in Safari and choose Share → Add to Home Screen, keeping Open as Web App enabled if shown.

The app launches in its own window with an Edgebook icon. The service worker caches only the app shell. Cloud reads, saves, and deletes need a connection; bet records are never cached or queued offline.

## History and performance

History defaults to the calendar month and fetches only 20 rows per page. Switch to All time, search market/selection/notes, or filter results. Phone history uses compact cards in a bounded scrolling area; older records stay in the database.

The database returns overview totals and daily summaries separately, so all-time numbers remain correct without downloading every bet. Stable date/ID ordering, request version checks, and last-page adjustment handle paging and quick filter changes.

## Database

Apply `supabase/migrations/20261003_paged_journal.sql` to the configured project's existing `public.bets` table. This adds a date index and read-only summary/history functions using security invoker, so existing table permissions apply.

The app uses the frontend publishable key and has no sign-in, mock records, or browser-storage fallback. As requested, all visitors use the same publicly accessible journal; existing public read/write/delete permissions are unchanged.

A save or delete succeeds only after the cloud confirms it. Connection failures appear in the interface.

## Checks

Run `node --test tests/app.test.cjs` for pagination, stale request handling, failure states, PWA assets, and shell-only caching checks. Test fixtures run in an isolated VM and do not write to the database.

