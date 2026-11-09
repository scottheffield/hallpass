# Brief 23: Offline

**Owns:** `public/sw.js`, `src/lib/offline.ts`, `src/lib/api.ts`, `src/main.tsx`.
**Start after** Today, Plan and Directions views have merged.

## Build

- Service worker: cache the app shell, `agenda.json`, `rooms.json` and `public/floor/` on install. Network-first for `/api/*`, never cache API POSTs in the service worker.
- `src/lib/offline.ts`: save the last plan and profile responses to `localStorage` (wrapped in try/catch). When offline, `plan/get` and `profile/get` return the cached copy with a freshness time.
- Queued check-ins: when offline, save to a `localStorage` queue, show "Saved on this device. We'll send it when you're online." Send on `online` events. Check-in IDs make retries safe.
- Quiet, persistent offline notice using the `Notice` primitive, with the "as of" time.
- Corner agent says it needs network (Brief 21 handles the message; you expose `isOnline()`).

Register the service worker only on HTTPS (the live URL), so `npm run dev` is unaffected.

## Done when

On a phone at the live URL with airplane mode on: plan, Today and directions still show, a check-in queues and sends after reconnecting.
