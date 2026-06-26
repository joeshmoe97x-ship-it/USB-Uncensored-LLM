-- OmniSight: grant API roles (anon, authenticated, service_role) the CRUD
-- access on public-schema tables that 20250101000000_init_schema.sql
-- created via `create table if not exists`. In Supabase CLI's local
-- dev environment, CREATE TABLE issued by the migration runner (postgres
-- superuser) does not auto-grant CRUD to the API roles -- prior to the
-- Supabase hosted auto-expose-by-default toggle, the CLI also did not
-- wire `alter default privileges for role supabase_admin` into local
-- dev. The net result: our `service_role` JWT's PostgREST connection
-- cannot UPDATE public.profiles, even with BYPASSRLS implicit on the
-- role, because GRANT comes BEFORE RLS evaluation. Diagnosed by capture
-- of /tmp/build-log/{run1,run2}.stderr which surfaced verbatim:
--
--   [globalSetup] admin profile patch (create path) error:
--     permission denied for table profiles
--   [globalSetup] admin profile patch (recovery path) error:
--     permission denied for table profiles
--
-- Fix: add explicit GRANT statements. RLS still gates anon/authenticated
-- to row-level visibility (USING clauses), so this is NOT a security
-- relaxation -- it's restoring the implicit-but-missing ledger of
-- grants that Supabase Cloud's auto-expose feature would normally
-- synthesize. See docs/bug-diagnoses.md Bug C for the full diagnosis
-- trail and the 3-way failure-mode log reading.

-- Schema-level: any postgrest query requires schema USAGE first.
grant usage on schema public to anon, authenticated, service_role;

-- Table-level. service_role gets full CRUD (used by global-setup.ts's
-- patchAdminProfile closure and by supabase-js admin writes). anon and
-- authenticated get the same surface area but are still constrained by
-- the RLS USING / WITH CHECK clauses declared in init_schema.sql, so
-- the effective privilege set is unchanged for them.
grant select, insert, update, delete on public.profiles       to anon, authenticated, service_role;
grant select, insert, update, delete on public.cameras       to anon, authenticated, service_role;
grant select, insert, update, delete on public.camera_access to anon, authenticated, service_role;

-- Defense-in-depth: service_role BYPASSRLS is currently implicit in
-- Supabase Cloud + CLI local dev defaults, but is not part of any SQL
-- contract -- a CLI downgrade or platform reset would silently revert
-- patchAdminProfile to row-level-security 0-row warnings (Mode B in
-- docs/bug-diagnoses.md Bug C). Making the attribute explicit here
-- guarantees RLS is still bypassed for service_role even if the
-- implicit grant disappears.
alter role service_role bypassrls;

-- Future-proofing: if a later migration adds a `serial`/`bigserial`
-- column, ALSO add this grant for sequences to avoid the same
-- permission-denied cliff hitting a different code path:
--   grant usage, select on all sequences in schema public to anon, authenticated, service_role;
-- (Not needed today: gen_random_uuid() primary keys = no sequences.)
