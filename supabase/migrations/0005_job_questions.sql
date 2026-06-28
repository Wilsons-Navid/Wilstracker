-- ============================================================================
-- Migration 0005 — per-job application questions + candidate answers
--
-- Customers (and admins) can attach extra questions to a job. Questions render
-- on the public apply form; each applicant's answers are stored per-application
-- and shown to staff on the candidate detail page.
--
-- Two question kinds:
--   'text'   — free-text answer (answer stored verbatim)
--   'choice' — single choice from `options` (a JSON array of strings)
--
-- Apply this after 0004. The public careers/apply pages read questions through
-- the service-role client, and applyToJobAsCandidate writes answers through it,
-- so no anonymous RLS policy is exposed on either table.
-- ============================================================================

create table if not exists public.job_questions (
  id         uuid primary key default gen_random_uuid(),
  job_id     uuid not null references public.jobs (id) on delete cascade,
  prompt     text not null,
  kind       text not null default 'text' check (kind in ('text', 'choice')),
  options    jsonb not null default '[]'::jsonb,   -- string[] used when kind = 'choice'
  position   int not null default 0,               -- display order, ascending
  required   boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.application_answers (
  id             uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications (id) on delete cascade,
  question_id    uuid not null references public.job_questions (id) on delete cascade,
  answer         text,
  created_at     timestamptz not null default now(),
  unique (application_id, question_id)
);

create index if not exists idx_job_questions_job        on public.job_questions (job_id);
create index if not exists idx_application_answers_app  on public.application_answers (application_id);
create index if not exists idx_application_answers_q    on public.application_answers (question_id);

-- ---------- RLS -------------------------------------------------------------
alter table public.job_questions       enable row level security;
alter table public.application_answers enable row level security;

-- job_questions: only staff who own the parent job (or admins) manage them.
-- The public apply page reads them via the service-role client, so there is no
-- anonymous select policy here. The cross-table EXISTS on jobs is safe — the
-- jobs policies never reference job_questions, so there is no policy recursion.
drop policy if exists job_questions_select on public.job_questions;
create policy job_questions_select on public.job_questions
  for select using (
    exists (
      select 1 from public.jobs j
      where j.id = job_id and (j.owner_id = auth.uid() or public.is_admin())
    )
  );

drop policy if exists job_questions_insert on public.job_questions;
create policy job_questions_insert on public.job_questions
  for insert with check (
    exists (
      select 1 from public.jobs j
      where j.id = job_id and (j.owner_id = auth.uid() or public.is_admin())
    )
  );

drop policy if exists job_questions_update on public.job_questions;
create policy job_questions_update on public.job_questions
  for update using (
    exists (
      select 1 from public.jobs j
      where j.id = job_id and (j.owner_id = auth.uid() or public.is_admin())
    )
  ) with check (
    exists (
      select 1 from public.jobs j
      where j.id = job_id and (j.owner_id = auth.uid() or public.is_admin())
    )
  );

drop policy if exists job_questions_delete on public.job_questions;
create policy job_questions_delete on public.job_questions
  for delete using (
    exists (
      select 1 from public.jobs j
      where j.id = job_id and (j.owner_id = auth.uid() or public.is_admin())
    )
  );

-- application_answers: staff who own the parent application (or admins) read
-- them; the owning candidate may read their own. Inserts happen through the
-- service-role client in applyToJobAsCandidate, so no insert policy is exposed.
drop policy if exists application_answers_select on public.application_answers;
create policy application_answers_select on public.application_answers
  for select using (
    exists (
      select 1 from public.applications a
      where a.id = application_id
        and (
          a.owner_id = auth.uid()
          or public.is_admin()
          or public.is_my_application(a.candidate_id)
        )
    )
  );

notify pgrst, 'reload schema';
