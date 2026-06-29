-- ============================================================================
-- Migration 0007 — customer profile description + location
--
-- A customer account (e.g. a client company the admin provisions) can now carry
-- a free-text description and a location. These live on profiles so the admin
-- can record context for each account and filter the accounts list by location.
-- Both are nullable so every existing account stays valid.
-- ============================================================================

alter table public.profiles
  add column if not exists description text,
  add column if not exists location    text;

-- Indexed for the admin accounts location filter.
create index if not exists idx_profiles_location on public.profiles (location);

notify pgrst, 'reload schema';
