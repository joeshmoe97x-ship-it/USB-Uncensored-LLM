-- OmniSight: initial schema + RLS for multi-user camera isolation.
-- Hybrid ownership + sharing model:
--   * cameras.owner_id  = owner (auth.users.id)
--   * camera_access     = additional users explicitly granted
--   * profile.role      = 'admin' bypasses camera-level checks
-- Bootstrap admin is handled by scripts/bootstrap-admin.mjs, which uses
-- the service-role key to call auth.admin.createUser.

create extension if not exists "pgcrypto";

-- =========================================================================
-- TABLES
-- =========================================================================

create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  display_name  text,
  role          text not null check (role in ('admin', 'viewer')) default 'viewer',
  status        text not null check (status in ('active', 'disabled')) default 'active',
  created_at    timestamptz not null default now(),
  last_login_at timestamptz
);

create table if not exists public.cameras (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid references auth.users(id) on delete set null,
  name        text not null,
  brand       text,
  model       text,
  ip          text,
  location    text,
  status      text not null default 'offline' check (status in ('online','offline','degraded','maintenance')),
  stream_url  text,
  codec       text,
  resolution  text,
  fps         integer,
  created_at  timestamptz default now()
);
create index if not exists cameras_owner_id_idx on public.cameras(owner_id);

create table if not exists public.camera_access (
  id          uuid primary key default gen_random_uuid(),
  camera_id   uuid not null references public.cameras(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  granted_by  uuid references auth.users(id),
  granted_at  timestamptz not null default now(),
  unique (camera_id, user_id)
);
create index if not exists camera_access_user_id_idx on public.camera_access(user_id);
create index if not exists camera_access_camera_id_idx on public.camera_access(camera_id);

-- =========================================================================
-- HELPER FUNCTIONS (SECURITY DEFINER to bypass recursive RLS)
-- =========================================================================

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public, auth
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin' and status = 'active'
  );
$$;

create or replace function public.has_camera_access(target_camera_id uuid)
returns boolean
language sql
security definer
set search_path = public, auth
stable
as $$
  select exists (
    select 1 from public.camera_access
    where camera_id = target_camera_id and user_id = auth.uid()
  );
$$;

create or replace function public.is_camera_owner(target_camera_id uuid)
returns boolean
language sql
security definer
set search_path = public, auth
stable
as $$
  select exists (
    select 1 from public.cameras
    where id = target_camera_id and owner_id = auth.uid()
  );
$$;

-- =========================================================================
-- AUTH-USERS TRIGGER (auto-create profile on signup)
-- =========================================================================

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_role text;
  v_display_name text;
begin
  -- Serialize the bootstrap window so two concurrent sign-ups can't both
  -- see profiles-empty and both become admin.
  perform pg_advisory_xact_lock(hashtext('bootstrap_admin'));
  v_role := coalesce(new.raw_user_meta_data->>'role', 'viewer');
  v_display_name := coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1));

  if v_role not in ('admin', 'viewer') then
    v_role := 'viewer';
  end if;

  -- First-user-becomes-admin bootstrap: if no profiles exist yet, this signup is admin.
  if not exists (select 1 from public.profiles) then
    v_role := 'admin';
  end if;

  insert into public.profiles (id, display_name, role, status)
  values (new.id, v_display_name, v_role, 'active');
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_auth_user();

-- =========================================================================
-- RLS - PROFILES
-- =========================================================================
alter table public.profiles enable row level security;

drop policy if exists profiles_select_own   on public.profiles;
drop policy if exists profiles_select_admin on public.profiles;
drop policy if exists profiles_update_own   on public.profiles;
drop policy if exists profiles_update_admin on public.profiles;

create policy profiles_select_own   on public.profiles for select using (auth.uid() = id);
create policy profiles_select_admin on public.profiles for select using (public.is_admin());
create policy profiles_update_own   on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);
create policy profiles_update_admin on public.profiles for update using (public.is_admin());
-- No INSERT/DELETE policy on profiles; only the auth trigger inserts, only service-role deletes.

-- =========================================================================
-- RLS - CAMERAS (hybrid ownership + sharing + admin override)
-- =========================================================================
alter table public.cameras enable row level security;

drop policy if exists cameras_select on public.cameras;
drop policy if exists cameras_insert on public.cameras;
drop policy if exists cameras_update on public.cameras;
drop policy if exists cameras_delete on public.cameras;

create policy cameras_select on public.cameras for select using (
  owner_id = auth.uid() or public.has_camera_access(id) or public.is_admin()
);
create policy cameras_insert on public.cameras for insert with check (owner_id = auth.uid());
create policy cameras_update on public.cameras for update using (owner_id = auth.uid() or public.is_admin());
create policy cameras_delete on public.cameras for delete using (owner_id = auth.uid() or public.is_admin());

-- =========================================================================
-- RLS - CAMERA_ACCESS (only owners + admin can grant)
-- =========================================================================
alter table public.camera_access enable row level security;

drop policy if exists camera_access_select on public.camera_access;
drop policy if exists camera_access_insert on public.camera_access;
drop policy if exists camera_access_delete on public.camera_access;

create policy camera_access_select on public.camera_access for select using (
  user_id = auth.uid()
  or public.is_admin()
  or public.is_camera_owner(camera_id)
);
create policy camera_access_insert on public.camera_access for insert with check (
  public.is_admin() or public.is_camera_owner(camera_id)
);
create policy camera_access_delete on public.camera_access for delete using (
  public.is_admin() or public.is_camera_owner(camera_id)
);
