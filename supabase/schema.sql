-- ============================================================================
-- WilsTracker — database schema, RLS, and triggers (fresh install / target)
-- Run this in the Supabase SQL Editor (Dashboard > SQL Editor > New query).
-- Safe to re-run: drops are guarded with "if exists".
--
-- For an EXISTING database with data, do NOT run this file. Use the migration
-- in supabase/migrations/0001_candidate_portal.sql, which preserves live rows.
--
-- Model: the person (candidates) is decoupled from the pipeline entry
-- (applications). A candidate may have a login account (candidates.auth_user_id)
-- and many applications, one per job.
-- ============================================================================

-- ---------- Enums -----------------------------------------------------------
do $$ begin
  create type public.user_role as enum ('admin', 'customer', 'candidate');
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

-- The person. Optionally linked to a login account via auth_user_id.
create table if not exists public.candidates (
  id            uuid primary key default gen_random_uuid(),
  auth_user_id  uuid unique references auth.users (id) on delete set null,
  full_name     text not null,
  email         text,
  phone         text,
  linkedin_url  text,
  portfolio_url text,
  location      text,
  headline      text,
  avatar_url    text,
  resume_url    text,
  resume_text   text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- The pipeline entry: one candidate applying to one job.
create table if not exists public.applications (
  id           uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.candidates (id) on delete cascade,
  job_id       uuid references public.jobs (id) on delete cascade,
  owner_id     uuid not null references public.profiles (id) on delete cascade, -- the job owner (recruiter)
  stage        public.candidate_stage not null default 'applied',
  status       text not null default 'active',  -- active | withdrawn | archived
  source       text,                            -- website | referral | linkedin | recruiter | ...
  notes        text,
  applied_at   timestamptz not null default now(),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (candidate_id, job_id)
);

-- Movement audit for the candidate timeline.
create table if not exists public.stage_history (
  id             uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications (id) on delete cascade,
  from_stage     public.candidate_stage,
  to_stage       public.candidate_stage not null,
  moved_by       uuid references public.profiles (id) on delete set null,
  moved_at       timestamptz not null default now()
);

-- AI assessment, scoped to one application (candidate x job).
create table if not exists public.cv_assessments (
  id             uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications (id) on delete cascade,
  score          int,            -- 0..100
  summary        text,
  strengths      jsonb,          -- string[]
  gaps           jsonb,          -- string[]
  recommendation text,
  raw_json       jsonb,
  created_at     timestamptz not null default now()
);

-- Helpful indexes for policy/filter columns.
create index if not exists idx_jobs_owner          on public.jobs (owner_id);
create index if not exists idx_candidates_auth     on public.candidates (auth_user_id);
create index if not exists idx_applications_owner  on public.applications (owner_id);
create index if not exists idx_applications_cand   on public.applications (candidate_id);
create index if not exists idx_applications_job    on public.applications (job_id);
create index if not exists idx_applications_stage  on public.applications (stage);
create index if not exists idx_stage_history_app   on public.stage_history (application_id);
create index if not exists idx_cv_application      on public.cv_assessments (application_id);

-- ---------- Helpers ---------------------------------------------------------
-- SECURITY DEFINER so they bypass RLS on profiles and avoid policy recursion.
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- Recruiter-or-admin (i.e. staff who manage the pipeline), not candidates.
create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('admin', 'customer')
  );
$$;

-- ---------- Trigger: mirror new auth users into profiles (+ candidate row) --
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_role public.user_role;
begin
  v_role := coalesce((new.raw_user_meta_data ->> 'role')::public.user_role, 'customer');

  insert into public.profiles (id, full_name, role)
  values (new.id, new.raw_user_meta_data ->> 'full_name', v_role)
  on conflict (id) do nothing;

  -- A self-registered candidate also gets a person row linked to the account.
  if v_role = 'candidate' then
    insert into public.candidates (auth_user_id, full_name, email)
    values (new.id, new.raw_user_meta_data ->> 'full_name', new.email)
    on conflict (auth_user_id) do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- Trigger: keep updated_at fresh ---------------------------------
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

drop trigger if exists applications_touch_updated_at on public.applications;
create trigger applications_touch_updated_at
  before update on public.applications
  for each row execute function public.touch_updated_at();

-- ---------- Trigger: record stage movements in stage_history ---------------
-- SECURITY DEFINER so the insert succeeds regardless of the mover's RLS.
create or replace function public.log_application_stage()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    insert into public.stage_history (application_id, from_stage, to_stage, moved_by)
    values (new.id, null, new.stage, auth.uid());
  elsif tg_op = 'UPDATE' and new.stage is distinct from old.stage then
    insert into public.stage_history (application_id, from_stage, to_stage, moved_by)
    values (new.id, old.stage, new.stage, auth.uid());
  end if;
  return new;
end;
$$;

drop trigger if exists applications_log_stage on public.applications;
create trigger applications_log_stage
  after insert or update on public.applications
  for each row execute function public.log_application_stage();

-- ============================================================================
-- Row Level Security
-- ============================================================================
alter table public.profiles       enable row level security;
alter table public.jobs           enable row level security;
alter table public.candidates     enable row level security;
alter table public.applications   enable row level security;
alter table public.stage_history  enable row level security;
alter table public.cv_assessments enable row level security;

-- ---------- profiles --------------------------------------------------------
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select using (id = auth.uid() or public.is_admin());

drop policy if exists profiles_admin_write on public.profiles;
create policy profiles_admin_write on public.profiles
  for all using (public.is_admin()) with check (public.is_admin());

-- ---------- jobs ------------------------------------------------------------
-- Public careers pages read open jobs through the service-role client, so no
-- anonymous select policy is exposed here. Staff manage their own jobs.
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

-- ---------- candidates (the person) ----------------------------------------
-- Staff see a candidate only if they own an application for that candidate.
-- A candidate sees only their own linked row.
drop policy if exists candidates_select on public.candidates;
create policy candidates_select on public.candidates
  for select using (
    auth_user_id = auth.uid()
    or public.is_admin()
    or exists (
      select 1 from public.applications a
      where a.candidate_id = candidates.id and a.owner_id = auth.uid()
    )
  );

-- Staff create candidate persons (manual add). Self-registered candidate rows
-- are created by the handle_new_user trigger (security definer) and public
-- applications by the service-role client, both bypassing this policy.
drop policy if exists candidates_insert on public.candidates;
create policy candidates_insert on public.candidates
  for insert with check (public.is_staff());

-- A candidate updates their own row; staff update candidates they own via an application.
drop policy if exists candidates_update on public.candidates;
create policy candidates_update on public.candidates
  for update using (
    auth_user_id = auth.uid()
    or public.is_admin()
    or exists (
      select 1 from public.applications a
      where a.candidate_id = candidates.id and a.owner_id = auth.uid()
    )
  ) with check (
    auth_user_id = auth.uid()
    or public.is_admin()
    or exists (
      select 1 from public.applications a
      where a.candidate_id = candidates.id and a.owner_id = auth.uid()
    )
  );

drop policy if exists candidates_delete on public.candidates;
create policy candidates_delete on public.candidates
  for delete using (
    public.is_admin()
    or exists (
      select 1 from public.applications a
      where a.candidate_id = candidates.id and a.owner_id = auth.uid()
    )
  );

-- ---------- applications ----------------------------------------------------
-- Staff manage applications they own. A candidate may read (not change) their own.
drop policy if exists applications_select on public.applications;
create policy applications_select on public.applications
  for select using (
    owner_id = auth.uid()
    or public.is_admin()
    or exists (
      select 1 from public.candidates c
      where c.id = candidate_id and c.auth_user_id = auth.uid()
    )
  );

drop policy if exists applications_insert on public.applications;
create policy applications_insert on public.applications
  for insert with check (owner_id = auth.uid() or public.is_admin());

drop policy if exists applications_update on public.applications;
create policy applications_update on public.applications
  for update using (owner_id = auth.uid() or public.is_admin())
  with check (owner_id = auth.uid() or public.is_admin());

drop policy if exists applications_delete on public.applications;
create policy applications_delete on public.applications
  for delete using (owner_id = auth.uid() or public.is_admin());

-- ---------- stage_history (staff only; access via the parent application) --
drop policy if exists stage_history_select on public.stage_history;
create policy stage_history_select on public.stage_history
  for select using (
    exists (
      select 1 from public.applications a
      where a.id = application_id and (a.owner_id = auth.uid() or public.is_admin())
    )
  );

-- ---------- cv_assessments (staff only; candidates never see these) --------
drop policy if exists cv_select on public.cv_assessments;
create policy cv_select on public.cv_assessments
  for select using (
    exists (
      select 1 from public.applications a
      where a.id = application_id and (a.owner_id = auth.uid() or public.is_admin())
    )
  );

drop policy if exists cv_insert on public.cv_assessments;
create policy cv_insert on public.cv_assessments
  for insert with check (
    exists (
      select 1 from public.applications a
      where a.id = application_id and (a.owner_id = auth.uid() or public.is_admin())
    )
  );

drop policy if exists cv_delete on public.cv_assessments;
create policy cv_delete on public.cv_assessments
  for delete using (
    exists (
      select 1 from public.applications a
      where a.id = application_id and (a.owner_id = auth.uid() or public.is_admin())
    )
  );
