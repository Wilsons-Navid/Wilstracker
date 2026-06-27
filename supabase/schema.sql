-- ============================================================================
-- WilsTracker — database schema, RLS, and triggers
-- Run this in the Supabase SQL Editor (Dashboard > SQL Editor > New query).
-- Safe to re-run: drops are guarded with "if exists".
-- ============================================================================

-- ---------- Enums -----------------------------------------------------------
do $$ begin
  create type public.user_role as enum ('admin', 'customer');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.candidate_stage as enum
    ('applied', 'screening', 'interview', 'offer', 'hired', 'rejected');
exception when duplicate_object then null; end $$;

-- ---------- Tables ----------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text,
  role        public.user_role not null default 'customer',
  created_by  uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now()
);

create table if not exists public.jobs (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references public.profiles (id) on delete cascade,
  title       text not null,
  description text,
  location    text,
  status      text not null default 'open',  -- open | closed
  created_at  timestamptz not null default now()
);

create table if not exists public.candidates (
  id           uuid primary key default gen_random_uuid(),
  owner_id     uuid not null references public.profiles (id) on delete cascade,
  job_id       uuid references public.jobs (id) on delete set null,
  full_name    text not null,
  email        text,
  linkedin_url text,
  avatar_url   text,
  resume_url   text,
  resume_text  text,
  stage        public.candidate_stage not null default 'applied',
  notes        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table if not exists public.cv_assessments (
  id             uuid primary key default gen_random_uuid(),
  candidate_id   uuid not null references public.candidates (id) on delete cascade,
  job_id         uuid references public.jobs (id) on delete set null,
  score          int,            -- 0..100
  summary        text,
  strengths      jsonb,          -- string[]
  gaps           jsonb,          -- string[]
  recommendation text,
  raw_json       jsonb,
  created_at     timestamptz not null default now()
);

-- Helpful indexes for policy/filter columns.
create index if not exists idx_jobs_owner        on public.jobs (owner_id);
create index if not exists idx_candidates_owner  on public.candidates (owner_id);
create index if not exists idx_candidates_job    on public.candidates (job_id);
create index if not exists idx_candidates_stage  on public.candidates (stage);
create index if not exists idx_cv_candidate      on public.cv_assessments (candidate_id);

-- ---------- Helper: is the current user an admin? --------------------------
-- SECURITY DEFINER so it bypasses RLS on profiles and avoids policy recursion.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- ---------- Trigger: mirror new auth users into profiles -------------------
-- Reads metadata passed to auth.admin.createUser (full_name, role).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    coalesce((new.raw_user_meta_data ->> 'role')::public.user_role, 'customer')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- Trigger: keep candidates.updated_at fresh ----------------------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists candidates_touch_updated_at on public.candidates;
create trigger candidates_touch_updated_at
  before update on public.candidates
  for each row execute function public.touch_updated_at();

-- ============================================================================
-- Row Level Security
-- ============================================================================
alter table public.profiles       enable row level security;
alter table public.jobs           enable row level security;
alter table public.candidates     enable row level security;
alter table public.cv_assessments enable row level security;

-- ---------- profiles --------------------------------------------------------
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select using (id = auth.uid() or public.is_admin());

-- Only admins manage profile rows directly (creation also happens via trigger).
drop policy if exists profiles_admin_write on public.profiles;
create policy profiles_admin_write on public.profiles
  for all using (public.is_admin()) with check (public.is_admin());

-- ---------- jobs ------------------------------------------------------------
drop policy if exists jobs_select on public.jobs;
create policy jobs_select on public.jobs
  for select using (owner_id = auth.uid() or public.is_admin());

drop policy if exists jobs_insert on public.jobs;
create policy jobs_insert on public.jobs
  for insert with check (owner_id = auth.uid() or public.is_admin());

drop policy if exists jobs_update on public.jobs;
create policy jobs_update on public.jobs
  for update using (owner_id = auth.uid() or public.is_admin())
  with check (owner_id = auth.uid() or public.is_admin());

drop policy if exists jobs_delete on public.jobs;
create policy jobs_delete on public.jobs
  for delete using (owner_id = auth.uid() or public.is_admin());

-- ---------- candidates ------------------------------------------------------
drop policy if exists candidates_select on public.candidates;
create policy candidates_select on public.candidates
  for select using (owner_id = auth.uid() or public.is_admin());

drop policy if exists candidates_insert on public.candidates;
create policy candidates_insert on public.candidates
  for insert with check (owner_id = auth.uid() or public.is_admin());

drop policy if exists candidates_update on public.candidates;
create policy candidates_update on public.candidates
  for update using (owner_id = auth.uid() or public.is_admin())
  with check (owner_id = auth.uid() or public.is_admin());

drop policy if exists candidates_delete on public.candidates;
create policy candidates_delete on public.candidates
  for delete using (owner_id = auth.uid() or public.is_admin());

-- ---------- cv_assessments (access derived from the parent candidate) ------
drop policy if exists cv_select on public.cv_assessments;
create policy cv_select on public.cv_assessments
  for select using (
    exists (
      select 1 from public.candidates c
      where c.id = candidate_id
        and (c.owner_id = auth.uid() or public.is_admin())
    )
  );

drop policy if exists cv_insert on public.cv_assessments;
create policy cv_insert on public.cv_assessments
  for insert with check (
    exists (
      select 1 from public.candidates c
      where c.id = candidate_id
        and (c.owner_id = auth.uid() or public.is_admin())
    )
  );

drop policy if exists cv_delete on public.cv_assessments;
create policy cv_delete on public.cv_assessments
  for delete using (
    exists (
      select 1 from public.candidates c
      where c.id = candidate_id
        and (c.owner_id = auth.uid() or public.is_admin())
    )
  );
