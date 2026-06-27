-- ============================================================================
-- Migration 0003 — fix mutual RLS recursion between candidates and applications
--
-- candidates_select referenced applications, and applications_select referenced
-- candidates. A query joining the two (the board) made Postgres evaluate each
-- table's policy from inside the other's, raising 42P17 "infinite recursion
-- detected in policy". The cross-table checks are moved into SECURITY DEFINER
-- helpers, which bypass RLS and break the cycle.
-- ============================================================================

-- Does the current user own an application for this candidate? (staff path)
create or replace function public.user_owns_candidate(cand uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.applications a
    where a.candidate_id = cand and a.owner_id = auth.uid()
  );
$$;

-- Is this application's candidate the current signed-in candidate? (portal path)
create or replace function public.is_my_application(cand uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.candidates c
    where c.id = cand and c.auth_user_id = auth.uid()
  );
$$;

-- ---- candidates: replace recursive EXISTS with the definer helper ----------
drop policy if exists candidates_select on public.candidates;
create policy candidates_select on public.candidates
  for select using (
    auth_user_id = auth.uid() or public.is_admin() or public.user_owns_candidate(id)
  );

drop policy if exists candidates_update on public.candidates;
create policy candidates_update on public.candidates
  for update using (
    auth_user_id = auth.uid() or public.is_admin() or public.user_owns_candidate(id)
  ) with check (
    auth_user_id = auth.uid() or public.is_admin() or public.user_owns_candidate(id)
  );

drop policy if exists candidates_delete on public.candidates;
create policy candidates_delete on public.candidates
  for delete using (
    public.is_admin() or public.user_owns_candidate(id)
  );

-- ---- applications: replace recursive EXISTS with the definer helper ---------
drop policy if exists applications_select on public.applications;
create policy applications_select on public.applications
  for select using (
    owner_id = auth.uid() or public.is_admin() or public.is_my_application(candidate_id)
  );

notify pgrst, 'reload schema';
