---
name: local-testing
description: Spin up SnapBudget locally and drive it in a real, signed-in browser session to test or debug a change — starting the dev server, signing in as a dedicated fixture account (no OAuth, no real data touched), and cleaning up afterward. Use whenever a change needs verifying against the real running app (not just tests/build), or when debugging behavior that only shows up live.
---

# Local testing & debugging

End-to-end recipe for driving the real app locally instead of reasoning about it from
source. Use this whenever a fix needs to be seen working, not just type-checked.

## 1. Free port 3000, then start the dev server

Not a hard requirement anymore — sign-in (step 2) no longer goes through Supabase's OAuth
redirect allow-list, so no other port would actually break it. Keep using 3000 anyway: it's
what `playwright.config.ts`'s `baseURL` and every past session's notes assume, and staying
consistent avoids the two ever drifting.

```bash
netstat -ano | grep ":3000 " | grep LISTENING
```

If something is listening, close it — no need to identify or ask first, this is expected
routine for this workflow (this machine runs other, unrelated projects, and one of them
may well be sitting on 3000):

```bash
powershell -Command "Stop-Process -Id <pid> -Force"
```

Then start SnapBudget:

```bash
cd "C:\Users\My PC\Desktop\projects\SnapBudget" && npm run dev
```

(use the Bash tool's `run_in_background`). Poll until it responds rather than sleeping a
fixed guess:

```bash
for i in $(seq 1 10); do
  code=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000)
  [ "$code" = "200" ] || [ "$code" = "307" ] && break
  sleep 2
done
```

**Windows gotcha:** stopping the background task (`TaskStop`) does not kill the actual
`next dev` child process `npm` spawned — it survives as an orphan holding the port. If a
later `npm run dev` reports `Port 3000 is in use by process <pid>`, that's this happening;
kill that PID directly with `Stop-Process -Id <pid> -Force`, same as above.

**Must be `next dev`, not `next build && next start`.** Step 2's login route only exists
in dev (see below) — it 404s otherwise on purpose.

## 2. Sign in

No Google, no OAuth click, no dependency on any browser having a live Google session — that
approach was replaced (2026-08-19) because a Google session used only by automation can go
stale after enough idle time and force a manual re-auth. Instead, sign-in is seeded through
the same mechanism `e2e/add-expense.spec.ts` uses: a dedicated, isolated fixture account
(`e2e-playwright@snapbudget.test`), created on first use and reused after. It has no
household, no budgets, no prior receipts — realistic for testing the manual/photo-add flows
and anything single-user, not for testing household sharing or pre-existing data (there's
none to share; seed some by hand for that case, and clean it up after same as anything
else).

```bash
npx dotenv -e .env.local -- node scripts/e2e-account.mjs
```

prints a one-time URL like `http://localhost:3000/api/test/login?token_hash=...`. Load the
Chrome tools if not already loaded, then navigate to that exact URL:

```
ToolSearch: select:mcp__claude-in-chrome__tabs_context_mcp,mcp__claude-in-chrome__navigate,mcp__claude-in-chrome__computer,mcp__claude-in-chrome__find,mcp__claude-in-chrome__get_page_text
```

It redeems the token server-side (`app/api/test/login`, dev-only) and redirects to
`/dashboard` already signed in as "E2E". This is pre-authorized as part of this skill — no
need to ask before doing it each time; it never touches Google or any real account.

## 3. Test or debug

Drive the app as the bug/feature calls for — `computer`, `find`, `read_page`,
`file_upload`, `read_console_messages`, `read_network_requests` are the usual tools. A few
things worth remembering from prior sessions:

- **Prefer real UI interaction (clicks on `<Link>`s, form submits) over typing URLs into
  the address bar.** A typed URL is a hard/top-level navigation, not the SPA transition a
  real user gets from tapping around the app — it can produce different (worse) caching
  behavior than what users actually experience, and testing against it risks chasing a
  bug that doesn't reflect real usage.
- Console/network capture tools only see events from the moment they're first called —
  call them once early, then use `clear: true` on reads instead of `tabs_create_mcp`-ing a
  fresh tab mid-test, so you don't lose events to a cold start.
- The receipt/photo-scan flow needs an image; `docs/screenshots/receipt-scan.jpg` works
  fine as a throwaway upload even though its OCR output is garbage — the review screen
  lets every field be corrected before saving anyway.
- Some components render as a real DOM element type but report a different accessibility
  role than you'd expect from the tag — e.g. Base UI's `Button` reports `role="button"`
  even rendering as `<a href>` via its `render` prop. If a `find`/click seems to be looking
  for the right text but not finding it, check the actual role before assuming the element
  isn't there.

## 4. Clean up test data

```bash
npx dotenv -e .env.local -- node scripts/e2e-account.mjs cleanup
```

Deletes every receipt belonging to the fixture account. No prefix convention needed
anymore — the account is dedicated, so everything under it is test data by construction;
this can safely delete all of it rather than pattern-matching merchant names.

Re-check the dashboard afterward (or just trust the delete count printed) — it should be
back to the empty state.

## 5. Leave the dev server running

Don't stop it unless asked to — the user (or a later session) is likely still using it.
