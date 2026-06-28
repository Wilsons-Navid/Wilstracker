-- ============================================================================
-- Migration 0006 — account active flag for admin deactivation
--
-- Admins can deactivate an account. The account is also banned at the auth layer
-- (ban_duration) so it can't log in, but this flag lets the app reject any still-
-- live session (getProfile returns null when inactive) and lets the admin list
-- show status. Defaults true so every existing account stays active.
-- ============================================================================

alter table public.profiles
  add column if not exists active boolean not null default true;

notify pgrst, 'reload schema';
