# WilsTracker

![Next.js](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-19-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Supabase](https://img.shields.io/badge/Supabase-3FCF8E?style=for-the-badge&logo=supabase&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)
![Vercel](https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)
![Anthropic Claude](https://img.shields.io/badge/Claude-D97757?style=for-the-badge&logo=anthropic&logoColor=white)

WilsTracker is a lightweight applicant tracking system (ATS). Admins create
accounts, customers post jobs and manage their hiring pipeline on a drag-and-drop
Kanban board, and candidates apply through a public careers site and track their
applications in their own portal. An AI-assisted CV assessment scores each
applicant against the job they applied for.

Live: [wilstracker.vercel.app](https://wilstracker.vercel.app)

It was built as a one-week coding test, with the goal of getting a first
customer live quickly on a clean, well-documented codebase, then extended with a
full candidate experience.

## Table of contents

1. [What we're building](#what-were-building)
2. [Core features](#core-features)
3. [Tech stack](#tech-stack)
4. [Architecture and security](#architecture-and-security)
5. [Data model](#data-model)
6. [Project layout](#project-layout)
7. [Getting started](#getting-started)
8. [Environment variables](#environment-variables)
9. [Scripts](#scripts)
10. [Documentation](#documentation)
11. [Assumptions](#assumptions)

## What we're building

A focused ATS for small recruiting teams, with a candidate side bolted on so
applicants are first-class users rather than rows in someone else's database. The
design follows what makes recruiters productive (see
[`docs/ATS-RESEARCH.md`](docs/ATS-RESEARCH.md)):

- Speed and low click-count. Moving a candidate is a single drag.
- A visual pipeline instead of spreadsheets, so the Kanban board is the home screen.
- Candidate data stays clean, with the CV file and LinkedIn always one click away.
- A light AI assist that scores fit against the job. It is advisory only.
- Quick to adopt, so a customer can be live the same day.

Three roles share one codebase. Admins create and manage accounts and can act on
any customer's behalf. Customers manage their own jobs and pipeline. Candidates
apply to roles and follow their own applications.

## Core features

### The original brief

These are the user stories the project started from:

- As an admin, I can create accounts (both admin accounts and customer accounts).
- As a customer, I can log in.
- As a customer, I can post jobs I'm recruiting for.
- As a customer, I can add candidates with their profile information (for example, a LinkedIn link).
- As a customer, I can see a compact Kanban view with all candidates associated with my jobs.
- As a customer, I can filter the Kanban view by job and candidate name.
- As an admin, I can do everything a customer can do on their behalf.

### The candidate experience

The candidate side was added on top of the brief:

- A public landing page is the front door, with links to open roles, sign in, and sign up.
- A public careers page lists every open role, each with its own detail page.
- Candidates can self-register for a candidate account (recruiters and admins stay admin-created).
- Applying requires a candidate account. A signed-out visitor who clicks apply is sent to sign in or sign up and returned to the same job afterwards.
- Each candidate has a portal that shows their applications with a stage progress track, plus a profile they can edit and a résumé they can replace.
- Candidates receive email notifications when they apply and when their application changes stage.

### Additional capabilities

- AI CV assessment. Claude scores an application against the job and returns a structured result with a numeric score, a breakdown, strengths, gaps, and a recommendation. It reads PDF and DOCX résumés directly.
- Résumé upload. Résumé files (PDF, DOC, or DOCX) are stored privately in Supabase Storage and served through short-lived signed URLs that check ownership first.
- Avatar upload. A candidate can have a profile photo, with coloured initials shown as a fallback.
- A decoupled data model. The person and the pipeline entry are separate, so one person can apply to several jobs, and every stage change is recorded in an audit trail.

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router, Server Components, Server Actions, `proxy.ts`) |
| Language | TypeScript, React 19 |
| Backend | Supabase (Postgres, Auth, Row Level Security, Storage) |
| Styling | Tailwind CSS |
| Drag and drop | @dnd-kit |
| AI | Anthropic Claude (structured tool-use output) |
| Document parsing | mammoth (DOCX to text for the assessment) |
| Email | Resend (HTTP API, optional) |
| Hosting | Vercel |

## Architecture and security

- Roles. Each profile has a role of `admin`, `customer`, or `candidate`, stored on `profiles.role`. The role drives routing: staff land on the board, candidates land on their portal.
- Row Level Security. Every table has RLS. Customers only see rows they own through `owner_id = auth.uid()`. Candidates only see their own person row and their own applications, and can never read assessments, notes, or stage history. Admins pass an `is_admin()` check and can see everything.
- No policy recursion. The candidate and application policies reference each other, so the cross-table checks run through `SECURITY DEFINER` helper functions (`user_owns_candidate`, `is_my_application`) that bypass RLS and avoid an infinite-recursion error.
- Three Supabase clients for three trust levels:
  - `lib/supabase/client.ts` is the browser client (anon key) and runs under RLS.
  - `lib/supabase/server.ts` is the server client bound to the user's session and also runs under RLS.
  - `lib/supabase/admin.ts` is the service-role client that bypasses RLS. It imports `server-only`, so the build fails if it is ever pulled into browser code.
- Authorize, then act. A privileged server action first checks access through the user-scoped client, where RLS makes the decision, and only then uses the service-role client for the storage or write operation. A signed résumé URL is generated from the candidate row the caller is proven to own, never from a path passed in by the caller.
- Identity from the session, not the form. Applying takes the candidate identity from the signed-in session rather than an email field, so an application cannot be filed against someone else or used to overwrite their profile.

## Data model

The person (`candidates`) is separate from the pipeline entry (`applications`),
so the same person can apply to multiple jobs and each application moves through
the pipeline on its own.

| Table | Key columns | Purpose |
|---|---|---|
| `profiles` | `id -> auth.users`, `full_name`, `role`, `created_by` | identity and role |
| `jobs` | `id`, `owner_id -> profiles`, `title`, `description`, `location`, `status` | postings |
| `candidates` | `id`, `auth_user_id -> auth.users`, `full_name`, `email`, `phone`, `linkedin_url`, `portfolio_url`, `location`, `headline`, `resume_url`, `avatar_url` | the person |
| `applications` | `id`, `candidate_id -> candidates`, `job_id -> jobs`, `owner_id -> profiles`, `stage`, `status`, `source`, `notes`, `applied_at` | one candidate applying to one job |
| `stage_history` | `id`, `application_id -> applications`, `from_stage`, `to_stage`, `moved_by`, `moved_at` | stage movement audit |
| `cv_assessments` | `id`, `application_id -> applications`, `score`, `summary`, `strengths`, `gaps`, `recommendation`, `raw_json` | AI feature |

## Project layout

```
src/
  app/
    (app)/             # staff routes: board, jobs, candidates, admin
    portal/            # candidate portal: applications and profile
    careers/           # public careers list, job detail, apply
    auth/callback/     # email confirmation / PKCE code exchange
    login/  signup/    # auth pages
    actions/           # server actions: auth, jobs, candidates, apply, ai, resume, avatar, admin, candidate-profile
    page.tsx           # role-aware landing page
  components/          # board, careers, portal, candidate forms, uploads, auth, ui, public-header
  lib/
    supabase/
      client.ts        # browser client (anon key)
      server.ts        # server client (user session)
      admin.ts         # service-role client (server only)
    dal.ts             # getProfile / requireStaff / requireAdmin / requireCandidate / getCandidate
    uploads.ts         # résumé and avatar validation and storage helpers
    email.ts           # Resend notifications (optional, no-op without a key)
    types.ts           # shared types mirroring the DB
  proxy.ts             # session refresh and route guard (Next 16 "middleware")
supabase/
  schema.sql           # full target schema: tables, RLS, triggers
  migrations/          # incremental migrations (candidate portal, RLS fixes)
  verify_rls.sql       # RLS assertion matrix
scripts/
  setup-storage.mjs    # create the Storage buckets
  seed-demo.mjs        # seed a demo admin, customers, jobs, and applications
docs/                  # PLAN, research, setup
```

## Getting started

See [`docs/SETUP.md`](docs/SETUP.md) for the full walkthrough. The short version:

```bash
# 1. Install
npm install

# 2. Configure env
cp .env.local.example .env.local   # then fill in your Supabase and Anthropic keys

# 3. Database and storage
#    Run supabase/schema.sql in the Supabase SQL editor, then:
node scripts/setup-storage.mjs     # create the resumes and avatars buckets

# 4. Create the first admin (see SETUP step 6), then run:
npm run dev                        # http://localhost:3000
```

For an existing database, apply the files in `supabase/migrations/` in order
instead of re-running the full schema.

## Environment variables

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public anon key (browser and server, RLS-bound) |
| `SUPABASE_SERVICE_ROLE_KEY` | Secret service-role key, used only on the server |
| `ANTHROPIC_API_KEY` | Claude API key for the CV assessment |
| `RESEND_API_KEY` | Resend key for candidate emails (optional, emails are skipped when unset) |
| `RESEND_FROM` | From address for those emails (optional) |

`.env.local` is gitignored and is never committed.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm run start` | Run the production build |
| `npm run lint` | Lint |
| `node scripts/setup-storage.mjs` | Create the Storage buckets |
| `node scripts/seed-demo.mjs` | Seed demo data |

## Documentation

- [`docs/PLAN.md`](docs/PLAN.md) covers the build plan, data model, and schedule.
- [`docs/ATS-RESEARCH.md`](docs/ATS-RESEARCH.md) explains the research behind the feature and design choices.
- [`docs/SETUP.md`](docs/SETUP.md) walks through the environment setup step by step.

## Assumptions

- Self-serve signup is enabled for the candidate role only. Recruiter and admin accounts stay admin-created, which matches the original brief.
- The person and the pipeline entry are separate, so one candidate can hold several applications across different jobs.
- Applying requires a candidate account, so every application is verified and trackable from the portal.
- The pipeline stages are fixed for the MVP. Custom per-job stages are future work.
- One customer maps to one recruiting organization (a single-user tenant) for the MVP.
- The AI assessment is advisory. It never auto-rejects a candidate.
- Email notifications are best-effort through Resend and degrade to a no-op when no key is configured.
