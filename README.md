# WilsTracker

WilsTracker is a lightweight applicant tracking system (ATS). Admins create
accounts, customers post jobs and add candidates, and the team manages the
hiring pipeline on a drag-and-drop Kanban board. It also includes an
AI-assisted CV assessment that scores each candidate against the job they
applied for.

Live: [wilstracker.vercel.app](https://wilstracker.vercel.app)

It was built as a one-week coding test, with the goal of getting a first
customer live quickly on a clean, well-documented codebase.

## Table of contents

1. [What we're building](#what-were-building)
2. [Features](#features)
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

A focused ATS for small recruiting teams. The design follows what makes
recruiters productive (see [`docs/ATS-RESEARCH.md`](docs/ATS-RESEARCH.md)):

- Speed and low click-count. Moving a candidate is a single drag.
- A visual pipeline instead of spreadsheets, so the Kanban board is the home screen.
- Candidate data stays clean, with the CV file and LinkedIn always one click away.
- A light AI assist that scores fit against the job. It is advisory only.
- Quick to adopt, so a customer can be live the same day.

Two roles share one codebase. Admins create and manage accounts and can act on
any customer's behalf. Customers manage only their own jobs and candidates.

## Features

- Admin-created accounts. There is no self-serve signup. Admins provision both admin and customer users, which needs the service-role key and runs only on the server.
- Jobs. Customers post and manage their job openings.
- Candidates. Add a candidate with a full name, email, LinkedIn link, stage, and notes.
- Kanban pipeline. Drag candidates across the stages applied, screening, interview, offer, and hired or rejected. Each column shows a count.
- Filters. Narrow the board by job and by candidate name.
- Résumé upload. Résumé files (PDF, DOC, or DOCX) are stored privately in Supabase Storage and served through short-lived signed URLs that check ownership first.
- Avatar upload. A candidate can have a profile photo, with initials shown as a fallback.
- AI CV assessment. Claude scores a candidate against the job and returns a structured result with a score, strengths, gaps, and a recommendation.
- Admin on behalf of a customer. An admin can create and manage rows under any customer's ownership without a separate code path.

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router, Server Actions, `proxy.ts`) |
| Backend | Supabase (Postgres, Auth, Row Level Security, Storage) |
| Styling | Tailwind CSS |
| Drag and drop | @dnd-kit |
| AI | Anthropic Claude (structured tool-use output) |
| Document parsing | mammoth (DOCX to text for the assessment) |
| Hosting | Vercel |

## Architecture and security

- Roles. Each profile has a role of `admin` or `customer`, stored on `profiles.role`.
- Row Level Security. Every table has RLS. Customers only see rows where `owner_id = auth.uid()`. Admins pass an `is_admin()` check and can see everything.
- Three Supabase clients for three trust levels:
  - `lib/supabase/client.ts` is the browser client (anon key) and runs under RLS.
  - `lib/supabase/server.ts` is the server client bound to the user's session and also runs under RLS.
  - `lib/supabase/admin.ts` is the service-role client that bypasses RLS. It imports `server-only`, so the build fails if it is ever pulled into browser code.
- Authorize, then act. A privileged server action first checks access through the user-scoped client, where RLS makes the decision, and only then uses the service-role client for the storage or write operation. A signed résumé URL is generated from the candidate row the caller is proven to own, never from a path passed in by the caller.

## Data model

| Table | Key columns | Purpose |
|---|---|---|
| `profiles` | `id -> auth.users`, `full_name`, `role`, `created_by` | identity and role |
| `jobs` | `id`, `owner_id -> profiles`, `title`, `description`, `location`, `status` | postings |
| `candidates` | `id`, `owner_id`, `job_id -> jobs`, `full_name`, `email`, `linkedin_url`, `resume_url`, `avatar_url`, `stage`, `notes` | candidates |
| `cv_assessments` | `candidate_id`, `score`, `summary`, `strengths`, `gaps`, `raw_json` | AI feature |

## Project layout

```
src/
  app/
    (app)/             # authenticated routes: board, jobs, candidates, admin
    actions/           # server actions: auth, jobs, candidates, resume, avatar, ai, admin
    login/             # login page
  components/          # board, candidate forms, uploads, assessment panel, ui
  lib/
    supabase/
      client.ts        # browser client (anon key)
      server.ts        # server client (user session)
      admin.ts         # service-role client (server only)
    dal.ts             # getProfile / requireProfile / requireAdmin
    uploads.ts         # résumé and avatar file validation and storage helpers
    types.ts           # shared types mirroring the DB
  proxy.ts             # session refresh and route guard (Next 16 "middleware")
supabase/
  schema.sql           # tables, RLS, triggers, run in the Supabase SQL editor
scripts/
  setup-storage.mjs    # create the Storage buckets
  seed-demo.mjs        # seed a demo admin, customers, jobs, and candidates
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

## Environment variables

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public anon key (browser and server, RLS-bound) |
| `SUPABASE_SERVICE_ROLE_KEY` | Secret service-role key, used only on the server |
| `ANTHROPIC_API_KEY` | Claude API key for the CV assessment |

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

- Self-serve signup is disabled. Accounts are admin-created only, which matches the spec.
- The pipeline stages are fixed for the MVP. Custom per-job stages are future work.
- One customer maps to one recruiting organization (a single-user tenant) for the MVP.
- The LinkedIn URL is the primary profile field, and résumé upload is optional.
- The AI assessment is advisory. It never auto-rejects a candidate.
