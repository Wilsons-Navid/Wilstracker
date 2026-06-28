# Reviewer's guide

A quick path through WilsTracker so you can see the whole product, and the
engineering behind it, in a few minutes. For the full picture see the
[README](../README.md).

Live: [wilstracker.vercel.app](https://wilstracker.vercel.app)

## Demo logins

These come from the seed script (`scripts/seed-demo.mjs`) and are throwaway demo
accounts on the test project.

| Role | Email | Password | Lands on |
|---|---|---|---|
| Admin | `wadotiwawil@gmail.com` | `tracker123` | the board, with admin access to every customer |
| Customer | `acme.recruiter@example.com` | `demo12345` | Acme Corp's own board |
| Customer | `globex.recruiter@example.com` | `demo12345` | Globex Inc's own board |
| Candidate | *create your own* | — | the candidate portal |

There's no shared candidate login on purpose: candidates self-register. Click
**Sign up** to make one and you'll see the apply flow and portal exactly as an
applicant would.

## A five-minute tour

**As a customer (Acme):**
1. Land on the **board** — drag a candidate between stages; the move saves and is
   recorded in the stage-history audit trail.
2. Note the **colour-coded AI score** on cards, so you can spot strong applicants
   at a glance. Filter by job or candidate name with the controls up top.
3. Open a candidate to see their profile, the **résumé (both the original file
   and the auto-extracted text)**, any answers to custom questions, and the full
   AI assessment. Click **Run assessment** to score one live.
4. Go to **Jobs → manage** on a role to edit its description, add **custom
   application questions** (free-text or multiple choice), and **share** it to
   social media.

**As a candidate (your own account):**
1. Browse **Open roles**, open one, and **apply** — answering any custom
   questions the recruiter added.
2. In the **portal**, watch your application sit on a stage progress track, edit
   your profile, and swap your résumé or photo.

**As the admin:**
1. Everything a customer can do, for *any* customer, through the same screens.
2. The **Admin** tab manages accounts: create logins, edit a name/email/role, and
   deactivate or reactivate someone. Promoting to admin asks you to retype the
   account's email; you can't demote or deactivate yourself.

**On a phone:** open the live site on mobile — the nav collapses into a menu and
the board scrolls with a swipe.

## What to look at under the hood

The interesting engineering is mostly about trust boundaries:

- **Row Level Security on every table.** Customers see only what they own,
  candidates see only themselves, admins see all. See `supabase/schema.sql` and
  the assertion matrix in `supabase/verify_rls.sql`.
- **No policy recursion.** Cross-table checks run through `SECURITY DEFINER`
  helpers (`user_owns_candidate`, `is_my_application`) to avoid infinite
  recursion — see the migrations.
- **Three Supabase clients for three trust levels** (`src/lib/supabase/`): browser
  and server clients run under RLS; the service-role client is `server-only` so it
  can never reach the browser.
- **Authorize, then act.** Privileged server actions check access through the
  RLS-bound client first, then use the service-role client for the write. Good
  examples: `src/app/actions/resume.ts` (signed URLs from a proven-owned row) and
  `src/app/actions/admin.ts` (every account action is admin-gated).
- **Roles can't be self-assigned.** A new account's role is read from
  service-role-only `app_metadata`, never from the sign-up form, so public
  registration can only ever create a candidate. See
  `supabase/migrations/0004_secure_role_assignment.sql`.
- **AI scores extracted text, not the raw file** (`src/lib/extract.ts` +
  `src/app/actions/ai.ts`) — cheaper, and the text is visible to staff.

## Run it locally

```bash
npm install
cp .env.local.example .env.local     # fill in Supabase + Anthropic keys
# Run supabase/schema.sql in the Supabase SQL editor, then:
node scripts/setup-storage.mjs       # create the storage buckets
node scripts/seed-demo.mjs           # seed the demo accounts + data above
npm run dev                          # http://localhost:3000
```

Full setup detail is in [`docs/SETUP.md`](SETUP.md).

## Tests and CI

```bash
npm test          # Vitest unit tests
npm run typecheck # tsc --noEmit
npm run lint
npm run build
```

Every push and pull request runs lint, typecheck, tests, and a production build
through GitHub Actions (`.github/workflows/ci.yml`).
