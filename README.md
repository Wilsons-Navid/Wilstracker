# Mini ATS

A lightweight Applicant Tracking System: admins create accounts, customers post jobs,
add candidates, and manage them on a drag-and-drop Kanban board. Includes an AI-assisted
CV assessment that scores a candidate against a job.

Built for a coding test. Optimized to be live in a first customer's hands fast.

## Stack
- **Next.js 16** (App Router, Server Actions, `proxy.ts`)
- **Supabase** — Postgres, Auth, Row Level Security, Storage
- **Tailwind CSS**
- **@dnd-kit** — Kanban drag-and-drop
- **Anthropic Claude** — AI CV assessment (structured/tool-use output)

## Getting started
See [`docs/SETUP.md`](docs/SETUP.md) for full step-by-step setup. Short version:
1. Create a Supabase project and run `supabase/schema.sql`.
2. Copy `.env.local.example` → `.env.local` and fill in keys.
3. Create a first admin user (see SETUP step 6).
4. `npm run dev`.

## How it works
- **Roles:** `admin` and `customer`, stored on `profiles.role`.
- **Security:** every table has RLS. Customers see only rows where `owner_id = auth.uid()`;
  admins pass an `is_admin()` check and see/do everything — including acting on a customer's
  behalf by creating rows with that customer's `owner_id`.
- **Account creation** uses the Supabase service-role key and therefore runs only on the
  server (`src/lib/supabase/admin.ts`), never in the browser.

## Project layout
```
src/
  app/                 # routes (App Router)
  lib/
    supabase/
      client.ts        # browser client (anon key)
      server.ts        # server client (user session)
      admin.ts         # service-role client (server only)
    types.ts           # shared types mirroring the DB
  proxy.ts             # session refresh + route guard (Next 16 "middleware")
supabase/
  schema.sql           # tables, RLS, triggers — run in Supabase SQL editor
docs/                  # PLAN, research, setup
```

See [`docs/PLAN.md`](docs/PLAN.md) and [`docs/ATS-RESEARCH.md`](docs/ATS-RESEARCH.md) for the
build plan and the research behind the feature/design choices.
