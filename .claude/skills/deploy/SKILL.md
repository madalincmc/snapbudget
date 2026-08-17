---
name: deploy
description: SnapBudget's path from a change to production — branching, the CI gate, merging, the Vercel deploy and how to verify it actually landed. Use when shipping anything to SnapBudget: opening or merging a PR, deploying to production, or checking whether a change really reached prod. Also covers the three ways this pipeline has reported success without shipping.
---

# Shipping a change to SnapBudget

`main` is protected — `enforce_admins: true`, no force-push, no deletion. Every change goes
branch → PR → CI → merge → deploy. There is no direct-push path, for anyone.

## 1. Branch

```bash
git checkout -b cotetiumadalin/mad-<n>-<short-slug>
```

Linear gives a branch name on each issue (`gitBranchName`); use it when working a ticket.

## 2. Pre-flight, then commit

Run what CI runs, because local answers in seconds and CI takes ~90s:

```bash
npx tsc --noEmit && npm run lint && npm test && npm run build
```

`npx prettier --write <changed files>` first — CI fails on formatting (`format:check`).

**If the change touches `supabase/migrations/`**, also run the RLS suites by hand. They are
deliberately not in CI: they need `SUPABASE_SERVICE_ROLE_KEY` and write to a live database, and
this repo is public.

```bash
node scripts/test-household-flow.mjs   # and the other scripts/test-*.mjs
```

## 3. Push and open the PR

CI (`.github/workflows/ci.yml`, job **"Lint, types, tests, build"**) runs on every PR and on push
to `main`: `npm ci`, `format:check`, `lint`, `tsc --noEmit`, `npm test`, `npm run build`. The build
step is the one that catches what the others cannot — a Server Component that only fails when Next
renders it.

Vercel builds a **preview deployment** for the PR. It uses the **same Supabase project as
production** — it is not an isolated environment. Anything a test writes there lands in real data.

## 4. Wait for the gate

```bash
gh pr view <n> --json mergeStateStatus,statusCheckRollup \
  --jq '(.mergeStateStatus) + " | " + ([.statusCheckRollup[] | (.name // .context) + "=" + (.conclusion // .state // .status)] | join(", "))'
```

`mergeable: MERGEABLE` only means "no conflicts" — it is **not** the gate. The gate is
`mergeStateStatus`: `BLOCKED` while CI runs, `CLEAN` when it can merge, `BEHIND` if `main` moved
ahead (protection is `strict: true`, so the branch must be up to date).

## 5. Merge

Confirm with the user before merging unless they have already said to ship it.

```bash
gh pr merge <n> --merge --delete-branch
```

`--merge`, not `--squash` — the history uses merge commits so each PR is visible.

## 6. Deploy to production

The Vercel git integration is supposed to deploy on merge to `main`. **It has silently skipped
merge commits.** Check, and deploy by hand when it has:

```bash
git branch --show-current && git status --short   # must be main, clean
vercel --prod --yes
```

`vercel --prod` ships the **working tree**, not a commit — verify the branch and that the tree is
clean first.

## 7. Verify against the artefact, not the status

Fetch production and look for the actual change — a CSS rule, a string, a status code:

```bash
curl -s -o /dev/null -w "%{http_code}\n" https://snapbudget-theta.vercel.app/demo
curl -s https://snapbudget-theta.vercel.app/demo | grep -o "<some new string>"
```

The production host is **`snapbudget-theta.vercel.app`**. `snapbudget.vercel.app` is an unrelated
site that answers 200 on `/` — probing it looks like a healthy deploy and is not one.

Signed-out app routes answer `307` to `/login`; `/demo*` answers `200`.

## 8. Close the loop in Linear

Comment on the issue with what shipped, what was verified, and what was not. Move to **In Review**
after deploying; to **Done** only once the user confirms the behaviour, unless the change is fully
covered by tests.

---

## Three ways this pipeline has reported success without shipping

**A commit with zero statuses reads as `pending`.** GitHub's combined-status API returns
`state: "pending"` for a commit that has *no* statuses at all — indistinguishable from a running
build. Check `.statuses[]` is non-empty before believing a `pending`, or skip it and check
production directly.

**Vercel can skip a merge entirely.** `main` at the new commit, CI green, and no deployment
created — the last production deploy still on the previous commit. Not a delay. Compare the latest
production deployment's SHA against `main`:

```bash
gh api "repos/madalincmc/snapbudget/deployments?per_page=5" --jq '.[] | {sha: .sha[0:7], env: .environment}'
```

**A Tailwind class that is never referenced in source is never generated.** A typo'd or unused
arbitrary class silently produces no CSS and the declaration is simply absent. After a
Tailwind-only change, grep the built stylesheet for the rule before believing it shipped.

## Changing the domain the app is served on

The host lives in four places outside the repo. Nothing in CI, the build, or `npm test` checks that
they agree, and each one fails differently and quietly. Production is currently
**`https://www.snapbudget.space`** — the apex 308s to `www`, so `www` is the canonical host.

**1. Supabase Auth → URL Configuration.** Site URL, and the Redirect URLs allow-list.

The failure is deceptive: Supabase rejects a `redirectTo` that is not allow-listed and silently
falls back to the Site URL, so signing in from the new domain drops the reader on the *old* host's
login page. It reads as "the button did nothing, I had to press it twice" — because the second
press happens on a host that is allow-listed. Keep the old `*.vercel.app` entry alongside the new
one, or preview deployments stop being able to sign in.

**2. `NEXT_PUBLIC_SITE_URL`** in Vercel. Invitation links are built from it, and `deliverInvitation`
returns `not_configured` when it is missing — invitations are then created with no email sent and
no error raised. Being `NEXT_PUBLIC_`, it is baked at build time: **setting it is not enough,
redeploy after.**

**3. The Resend sending domain.** DKIM on the root, SPF and MX on `send`, plus a `_dmarc` TXT.
`EMAIL_FROM` must be on a verified domain or mail fails SPF and is junked. A `*.vercel.app` host can
never be used here — you cannot add DNS records to a domain you do not own.

**4. Google OAuth** in the Google Cloud console, if the redirect ever stops going through
Supabase's own callback. It does not today, so this is usually nothing — but check it before
concluding the problem is elsewhere.

After changing any of them, verify by *doing the thing*, not by reading config: press the sign-in
button on the new host and confirm you land on that same host's dashboard.

## Environment notes

- The permission classifier in this harness sometimes blocks `gh pr merge` and `vercel --prod`.
  If blocked, say so and let the user run it with a `!` prefix — do not retry in a loop.
- Never kill Next dev servers broadly; this machine runs other projects. Match on the port *and*
  confirm the process command line contains `SnapBudget` before stopping anything.
