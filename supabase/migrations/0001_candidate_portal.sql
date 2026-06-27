-- ============================================================================
-- Migration 0001 — Candidate Portal (Option B)
--
-- Transforms the original single-table pipeline (candidates carried owner_id,
-- job_id, stage) into the decoupled model: candidates = the person,
-- applications = the pipeline entry. Preserves existing rows.
--
-- DO NOT run this on the live database until the new application code is
-- deployed. The live app reads candidates.stage/owner_id/job_id, which this
-- migration removes. Validate on a Supabase branch first.
--
-- Idempotent where practical (guards + "if [not] exists" + backfill anti-joins).
-- ============================================================================

-- 1. Enum: add the candidate role (own statement; uses IF NOT EXISTS).
alter type public.user_role add value if not exists 'candidate';

-- 2. Helper: recruiter-or-admin staff (candidates excluded).
create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('admin', 'customer')
  );
$$;

-- 3. New self-managed columns on the person.
alter table public.candidates add column if not exists auth_user_id  uuid unique references auth.users (id) on delete set null;
alter table public.candidates add column if not exists phone         text;
alter table public.candidates add column if not exists portfolio_url text;
alter table public.candidates add column if not exists location      text;
alter table public.candidates add column if not exists headline      text;

-- 4. New tables.
create table if not exists public.applications (
  id           uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.candidates (id) on delete cascade,
  job_id       uuid references public.jobs (id) on delete cascade,
  owner_id     uuid not null references public.profiles (id) on delete cascade,
  stage        public.candidate_stage not null default 'applied',
  status       text not null default 'active',
  source       text,
  notes        text,
  applied_at   timestamptz not null default now(),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (candidate_id, job_id)
);

create table if not exists public.stage_history (
  id             uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications (id) on delete cascade,
  from_stage     public.candidate_stage,
  to_stage       public.candidate_stage not null,
  moved_by       uuid references public.profiles (id) on delete set null,
  moved_at       timestamptz not null default now()
);

-- 5. Backfill: each existing candidate becomes one application (its pipeline entry).
insert into public.applications (candidate_id, job_id, owner_id, stage, source, notes, applied_at, created_at, updated_at)
select c.id, c.job_id, c.owner_id, c.stage, 'recruiter', c.notes, c.created_at, c.created_at, c.updated_at
from public.candidates c
where not exists (select 1 from public.applications a where a.candidate_id = c.id);

-- 6. cv_assessments: re-key from candidate to application.
alter table public.cv_assessments add column if not exists application_id uuid references public.applications (id) on delete cascade;
update public.cv_assessments cv
set application_id = a.id
from public.applications a
where a.candidate_id = cv.candidate_id and cv.application_id is null;

-- 7. Drop OLD policies before dropping the columns they reference.
drop policy if exists candidates_select on public.candidates;
drop policy if exists candidates_insert on public.candidates;
drop policy if exists candidates_update on public.candidates;
drop policy if exists candidates_delete on public.candidates;
drop policy if exists cv_select on public.cv_assessments;
drop policy if exists cv_insert on public.cv_assessments;
drop policy if exists cv_delete on public.cv_assessments;

-- 8. Drop the moved/old columns (also drops their dependent indexes).
alter table public.candidates     drop column if exists owner_id;
alter table public.candidates     drop column if exists job_id;
alter table public.candidates     drop column if exists stage;
alter table public.candidates     drop column if exists notes;
alter table public.cv_assessments drop column if exists candidate_id;
alter table public.cv_assessments drop column if exists job_id;

-- 9. Enforce application_id once every assessment is matched.
do $$ begin
  if not exists (select 1 from public.cv_assessments where application_id is null) then
    alter table public.cv_assessments alter column application_id set not null;
  end if;
end $$;

-- 10. RLS on the new tables.
alter table public.applications  enable row level security;
alter table public.stage_history enable row level security;

-- 11. New policies (mirror supabase/schema.sql).
create policy candidates_select on public.candidates
  for select using (
    auth_user_id = auth.uid() or public.is_admin()
    or exists (select 1 from public.applications a where a.candidate_id = candidates.id and a.owner_id = auth.uid())
  );
create policy candidates_insert on public.candidates
  for insert with check (public.is_staff());
create policy candidates_update on public.candidates
  for update using (
    auth_user_id = auth.uid() or public.is_admin()
    or exists (select 1 from public.applications a where a.candidate_id = candidates.id and a.owner_id = auth.uid())
  ) with check (
    auth_user_id = auth.uid() or public.is_admin()
    or exists (select 1 from public.applications a where a.candidate_id = candidates.id and a.owner_id = auth.uid())
  );
create policy candidates_delete on public.candidates
  for delete using (
    public.is_admin()
    or exists (select 1 from public.applications a where a.candidate_id = candidates.id and a.owner_id = auth.uid())
  );

create policy applications_select on public.applications
  for select using (
    owner_id = auth.uid() or public.is_admin()
    or exists (select 1 from public.candidates c where c.id = candidate_id and c.auth_user_id = auth.uid())
  );
create policy applications_insert on public.applications
  for insert with check (owner_id = auth.uid() or public.is_admin());
create policy applications_update on public.applications
  for update using (owner_id = auth.uid() or public.is_admin())
  with check (owner_id = auth.uid() or public.is_admin());
create policy applications_delete on public.applications
  for delete using (owner_id = auth.uid() or public.is_admin());

create policy stage_history_select on public.stage_history
  for select using (
    exists (select 1 from public.applications a where a.id = application_id and (a.owner_id = auth.uid() or public.is_admin()))
  );

create policy cv_select on public.cv_assessments
  for select using (
    exists (select 1 from public.applications a where a.id = application_id and (a.owner_id = auth.uid() or public.is_admin()))
  );
create policy cv_insert on public.cv_assessments
  for insert with check (
    exists (select 1 from public.applications a where a.id = application_id and (a.owner_id = auth.uid() or public.is_admin()))
  );
create policy cv_delete on public.cv_assessments
  for delete using (
    exists (select 1 from public.applications a where a.id = application_id and (a.owner_id = auth.uid() or public.is_admin()))
  );

-- 12. Triggers.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_role public.user_role;
begin
  v_role := coalesce((new.raw_user_meta_data ->> 'role')::public.user_role, 'customer');
  insert into public.profiles (id, full_name, role)
  values (new.id, new.raw_user_meta_data ->> 'full_name', v_role)
  on conflict (id) do nothing;
  if v_role = 'candidate' then
    insert into public.candidates (auth_user_id, full_name, email)
    values (new.id, new.raw_user_meta_data ->> 'full_name', new.email)
    on conflict (auth_user_id) do nothing;
  end if;
  return new;
end;
$$;

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;
drop trigger if exists applications_touch_updated_at on public.applications;
create trigger applications_touch_updated_at before update on public.applications
  for each row execute function public.touch_updated_at();

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
create trigger applications_log_stage after insert or update on public.applications
  for each row execute function public.log_application_stage();

-- 13. New indexes.
create index if not exists idx_candidates_auth     on public.candidates (auth_user_id);
create index if not exists idx_applications_owner  on public.applications (owner_id);
create index if not exists idx_applications_cand   on public.applications (candidate_id);
create index if not exists idx_applications_job    on public.applications (job_id);
create index if not exists idx_applications_stage  on public.applications (stage);
create index if not exists idx_stage_history_app   on public.stage_history (application_id);
create index if not exists idx_cv_application      on public.cv_assessments (application_id);
