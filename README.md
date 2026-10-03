# Edgebook

A daily betting journal with a responsive portfolio interface, Geist typography, monthly calendar, and date-based bet entry.

## Use

Serve this folder with any static web host. The entry point is `index.html`; the app is `betting-journal.html`.

Tap a calendar date to log a bet. The dashboard shows all-time P&L, stake, ROI, win rate, daily results, and bet history. Total return includes the original stake.

## Cloud storage

The app reads and writes the `bets` table in the configured Supabase project using its frontend publishable key. It has no sign-in, mock records, or browser-storage fallback. The shared table permits public read, insert, update, and delete access, as requested; all visitors use the same journal.

Failures are shown in the interface. A save or delete is reflected only after the cloud operation succeeds.
