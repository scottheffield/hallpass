# Brief 01: Data (agenda, rooms, Elastic, demo attendee)

**Owns:** `scripts/`, `public/agenda.json`, `public/rooms.json`, `public/floor/`, `worker/lib/search.ts`, `worker/routes/demo.ts`, `shared/fixtures/`.
**Can start before Phase 0 merges** for scripts and data files. Open the search PR after Phase 0 merges.

## PR 1: agenda and rooms (start immediately)

`scripts/fetch-agenda.mjs` (Node 22, no dependencies):

1. Fetch the [schedule page](https://events.linuxfoundation.org/kubecon-cloudnativecon-north-america/program/schedule/). Parse the JSON in `<script class="sched-data" type="application/json">`. Sessions are at `all.sessions`; also `speakers`, `rooms`, `categories`.
2. Normalize to `Session` in `shared/types.ts`. Join speakers, rooms and categories by ID.
3. Times have no offset and are Mountain Time. Write them with `-07:00`.
4. Drop breaks, registration, coat check and similar. Don't drop every empty description; some are real talks.
5. Set `all_access: true` for "ALL ACCESS PASS REQUIRED" full-day entries.
6. Build `search_text` (title, description stripped of HTML, track, subtopic, CNCF project) and `speaker_text` (each speaker's name, company, tagline, bio).
7. Write `public/agenda.json` as `{ source, attribution, pulled_at, sessions }`. Print counts: total, dropped, empty descriptions, per day.

Also save the raw page to `scripts/.cache/` (gitignored) so reruns need no bandwidth.

`public/rooms.json`: `Room[]` for every room in the agenda. Scott drafts the walking hints for about 10 demo rooms; the rest get `landmark` and `level` only, and `walking_hint: ""`. Floor image goes in `public/floor/` with its credit in the README.

## PR 2: Elastic (after Phase 0)

`scripts/elastic-setup.mjs` (run with `node --env-file=.dev.vars`):

- Index `hallpass-sessions`: `title` text, `track`, `room`, `speakers`, `tags` keyword, `start`, `end` date, `abstract` text with `index: false`, and `search_text` and `speaker_text` as two separate `semantic_text` fields.
- Mappings for `<prefix>-profiles`, `-plans`, `-checkins`, `-readouts`, `-cases`, with `attendee_id`, `session_id`, `goal_themes`, `gap_themes`, `worth_it`, `moved_goal` as keyword so Insights can aggregate.
- Bulk ingest with session ID as document ID, 50 per call, retry only 429/502/503/504.

`worker/lib/search.ts`: keep the Phase 0 signature. Use `match` on the `semantic_text` field (not the legacy `semantic` query). Filter by day. Return a `score`. Keep the agenda keyword fallback when Elastic is unconfigured or errors, and mark results with `source: "fallback"`.

Write `scripts/search-check.mjs` that runs 6 goal-style queries (for example "we spend too long finding the cause of Kubernetes incidents") semantic-only and hybrid (RRF, `rank_window_size: 50`) and prints top 5 titles and scores. Put the results and a recommendation in the PR description.

## PR 3: demo attendee

- `shared/fixtures/demo-profile.json` and `demo-plan.json` rebuilt from real session IDs: Alex, an SRE, platform engineering and AI inference goals, balanced pace. First day has at least 3 picks, one `beat_alternative` and one `clash_note`.
- `POST /api/demo/load` writes them for the current attendee ID and returns both.
- Check every speaker name you use is in the agenda.

## Done when

`agenda.json` is committed with its pull time, the demo attendee loads on the live URL, and search returns relevant sessions for the 6 queries.
