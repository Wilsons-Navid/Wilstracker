-- ============================================================================
-- RLS verification matrix — candidate portal
--
-- Run AFTER applying 0001 + 0002 to a Supabase BRANCH (never production first).
-- Each block impersonates a role with set_config and asserts what that role can
-- and cannot read. Any line that raises "ASSERTION FAILED" is a security defect.
--
-- Usage: paste into the Supabase SQL editor on the branch, or psql. Replace the
-- :ids at the top with real rows from that branch.
-- ============================================================================

-- --- Fixtures: set these to real ids on the branch -------------------------
\set candidate_auth_uid  '00000000-0000-0000-0000-000000000000'  -- a candidate account's auth.users id
\set other_candidate_id  '00000000-0000-0000-0000-000000000000'  -- a candidate row the above user did NOT create
\set recruiter_uid       '00000000-0000-0000-0000-000000000000'  -- a customer/recruiter profile id
\set other_owner_app_id  '00000000-0000-0000-0000-000000000000'  -- an application owned by a DIFFERENT recruiter

-- Helper to fail loudly.
create or replace function pg_temp.expect(cond boolean, label text)
returns void language plpgsql as $$
begin
  if not cond then raise exception 'ASSERTION FAILED: %', label;
  else raise notice 'ok: %', label; end if;
end $$;

-- ===========================================================================
-- 1. Candidate role: can read OWN candidate + applications, cannot read others'
--    and can NEVER read cv_assessments, notes, or stage_history.
-- ===========================================================================
select set_config('role', 'authenticated', true);
select set_config('request.jwt.claims',
  json_build_object('sub', :'candidate_auth_uid', 'role', 'authenticated')::text, true);

-- Sees own candidate row.
select pg_temp.expect(
  exists(select 1 from public.candidates where auth_user_id = :'candidate_auth_uid'),
  'candidate can read own person row');

-- Cannot see a candidate row they have no relationship to.
select pg_temp.expect(
  not exists(select 1 from public.candidates where id = :'other_candidate_id'),
  'candidate cannot read an unrelated candidate');

-- Cannot read ANY cv_assessments (recruiter-only data).
select pg_temp.expect(
  (select count(*) from public.cv_assessments) = 0,
  'candidate sees zero cv_assessments');

-- Cannot read ANY stage_history (recruiter-only data).
select pg_temp.expect(
  (select count(*) from public.stage_history) = 0,
  'candidate sees zero stage_history');

-- Only sees their own applications (count equals their own).
select pg_temp.expect(
  (select count(*) from public.applications) =
  (select count(*) from public.applications a
     join public.candidates c on c.id = a.candidate_id
    where c.auth_user_id = :'candidate_auth_uid'),
  'candidate sees only their own applications');

-- ===========================================================================
-- 2. Recruiter role: sees own applications, NOT another recruiter's.
-- ===========================================================================
select set_config('request.jwt.claims',
  json_build_object('sub', :'recruiter_uid', 'role', 'authenticated')::text, true);

select pg_temp.expect(
  not exists(select 1 from public.applications where id = :'other_owner_app_id'),
  'recruiter cannot read another recruiter''s application');

-- Recruiter can read cv_assessments only for applications they own.
select pg_temp.expect(
  not exists(
    select 1 from public.cv_assessments cv
    join public.applications a on a.id = cv.application_id
    where a.owner_id <> :'recruiter_uid'),
  'recruiter sees no assessments for applications they do not own');

raise notice 'RLS verification complete — no assertions failed.';
