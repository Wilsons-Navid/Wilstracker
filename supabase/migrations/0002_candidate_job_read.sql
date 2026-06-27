-- ============================================================================
-- Migration 0002 — let candidates read jobs they applied to
--
-- The candidate portal lists each application with its job title. Candidates are
-- neither the job owner nor an admin, so the base jobs policy hides the row.
-- This adds a read path scoped to jobs the candidate has actually applied to.
-- Apply after 0001 (and in lockstep with the candidate-portal deploy).
-- ============================================================================

drop policy if exists jobs_select_applicant on public.jobs;
create policy jobs_select_applicant on public.jobs
  for select using (
    exists (
      select 1 from public.applications a
      join public.candidates c on c.id = a.candidate_id
      where a.job_id = jobs.id and c.auth_user_id = auth.uid()
    )
  );
