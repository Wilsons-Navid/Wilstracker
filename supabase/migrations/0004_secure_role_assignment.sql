-- ============================================================================
-- Migration 0004 — stop trusting client metadata for role assignment
--
-- handle_new_user() read the new account's role from raw_user_meta_data, which
-- is fully client-controlled on public signup (GoTrue /signup accepts arbitrary
-- options.data, and the anon key is public). A self-registering user could pass
-- { role: "admin" } and the trigger would write profiles.role = 'admin',
-- bypassing every RLS policy via is_admin(). Critical privilege escalation.
--
-- Fix: read the role from raw_app_meta_data instead. app_metadata can ONLY be
-- set through the service-role admin API (admin.auth.admin.createUser), never by
-- a self-signup client. Public signups therefore always default to 'candidate',
-- the only role a stranger is allowed to hold. Staff/admin accounts keep their
-- role because createAccount now provisions it via app_metadata.
--
-- LOCKSTEP: deploy this together with the admin.ts change that moves `role` from
-- user_metadata into app_metadata. If the trigger reads app_metadata but
-- createAccount still writes user_metadata, new staff accounts default to
-- 'candidate'.
-- ============================================================================

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_role public.user_role;
begin
  -- Trusted channel: app_metadata is settable only by the service-role admin
  -- API, never by a public self-signup. Default to 'candidate' — the only role
  -- a stranger may self-assign. A 'role' in user_metadata is intentionally
  -- ignored now; it can no longer escalate privilege.
  v_role := coalesce(
    (new.raw_app_meta_data ->> 'role')::public.user_role,
    'candidate'
  );

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

-- The trigger binding is unchanged; create-or-replace above swaps the body in
-- place. Re-assert it only if a prior run dropped it.
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Optional one-time audit (run by hand; not destructive). Any account whose
-- elevated role did NOT come from an admin-provisioned app_metadata role is
-- suspect. Review before demoting — legitimate pre-migration staff were created
-- through the old user_metadata path and are fine; their profiles.role persists.
--
--   select p.id, p.role, p.created_by, u.email,
--          u.raw_app_meta_data ->> 'role'  as app_role,
--          u.raw_user_meta_data ->> 'role' as user_role
--   from public.profiles p
--   join auth.users u on u.id = p.id
--   where p.role in ('admin', 'customer')
--   order by p.role;
-- ---------------------------------------------------------------------------

notify pgrst, 'reload schema';
