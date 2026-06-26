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

-- All 4 GRANTs + the alter-role statement consolidated into a single
-- per-role DO block so partial-success semantics hold on alt-CLI / CI
-- paths where some of `anon`, `authenticated`, or `service_role` may not
-- yet exist (SQLSTATE 42704 undefined_object) OR where the migration
-- runner is not superuser (SQLSTATE 42501 insufficient_privilege for
-- alter role). On standard Supabase CLI local dev all 3 roles are
-- pre-provisioned and the runner is the `postgres` superuser so every
-- loop iteration succeeds; alt-CLI / CI paths receive per-role NOTICEs
-- but the migration does NOT abort. The earlier `0c9b5fa` commit's
-- bare GRANT statements would HARD-FAIL on alt-CLI / CI paths per the
-- code-reviewer note (concern #1 followup).
--
-- The 3 tables (profiles, cameras, camera_access) are batched into a
-- single per-role grant because they were unconditionally created by
-- init_schema.sql -- the missing-role failure mode is caught by the
-- per-role EXCEPTION block, so we don't need a per-table loop.
do $$
declare
  r text;
begin
  foreach r in array array['anon', 'authenticated', 'service_role'] loop
    begin
      -- Schema-level USAGE (required for any postgrest query).
      execute format('grant usage on schema public to %I', r);
      -- Table-level CRUD on the 3 init_schema-defined tables.
      execute format(
        'grant select, insert, update, delete on public.profiles, public.cameras, public.camera_access to %I',
        r
      );
    exception
      when undefined_object or insufficient_privilege then
        raise notice 'Grants skipped for %: %', r, sqlerrm;
    end;
  end loop;

  -- Defense-in-depth: explicit BYPASSRLS on service_role so the
  -- patchAdminProfile closure in global-setup.ts survives any future
  -- CLI version where the implicit BYPASSRLS attribute is removed
  -- (Mode B in docs/bug-diagnoses.md Bug C).
  begin
    alter role service_role bypassrls;
  exception
    when undefined_object or insufficient_privilege then
      raise notice 'service_role BYPASSRLS unchanged: %', sqlerrm;
  end;
end
$$;

-- Future-proofing: if a later migration adds a `serial`/`bigserial`
-- column, ALSO add this grant for sequences to avoid the same
-- permission-denied cliff hitting a different code path:
--   grant usage, select on all sequences in schema public to anon, authenticated, service_role;
-- (Not needed today: gen_random_uuid() primary keys = no sequences.)
