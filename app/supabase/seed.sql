-- Demo cameras seeded after `supabase db reset`.
-- owner_id is NULL so admin sees both via is_admin() RLS and viewer sees
-- only those explicitly granted via camera_access.
INSERT INTO public.cameras (id, name, ip, model, status, owner_id, location)
VALUES
  ('11111111-1111-1111-1111-111111111111',
   'Admin Private Cam', '10.0.0.10', 'Hikvision DS-2CD', 'online',
   NULL, 'West Wing'),
  ('22222222-2222-2222-2222-222222222222',
   'Shared Cam',        '10.0.0.11', 'Hikvision DS-2CD', 'online',
   NULL, 'East Wing'),
  -- 9 additional demo cameras covering assorted SMB/SOHO brands — all
  -- owner_id=NULL so admin sees them via is_admin(); viewer-only access
  -- would require an explicit public.camera_access grant below.
  ('44444444-4444-4444-4444-444444444444',
   'O-Kam Pro Cam',     '10.0.0.12', 'O-Kam Pro',                    'online',
   NULL, 'North Wing'),
  ('55555555-5555-5555-5555-555555555555',
   'iCam365 Indoor',    '10.0.0.13', 'iCam365',                      'online',
   NULL, 'South Wing'),
  ('66666666-6666-6666-6666-666666666666',
   'V380 Pro Cam',      '10.0.0.14', 'V380 Pro',                     'online',
   NULL, 'Lobby'),
  ('77777777-7777-7777-7777-777777777777',
   'Ring Video Doorbell','10.0.0.15', 'Ring Video Doorbell Pro',      'online',
   NULL, 'Front Entrance'),
  ('88888888-8888-8888-8888-888888888888',
   'Blink Mini',        '10.0.0.16', 'Blink Mini',                   'online',
   NULL, 'Garage'),
  ('99999999-9999-9999-9999-999999999999',
   'DMSS DVR Station',  '10.0.0.17', 'Dahua DMSS DVR',               'online',
   NULL, 'Server Room'),
  ('AAAAAAAA-AAAA-AAAA-AAAA-AAAAAAAAAAAA',
   'Cobra DVR',         '10.0.0.18', 'Cobra Surveillance DVR',       'online',
   NULL, 'Back Office'),
  ('BBBBBBBB-BBBB-BBBB-BBBB-BBBBBBBBBBBB',
   'Onwote Cam',        '10.0.0.19', 'Onwote 4MP PoE',               'online',
   NULL, 'Warehouse'),
  ('CCCCCCCC-CCCC-CCCC-CCCC-CCCCCCCCCCCC',
   'Generic CCTV Cam',  '10.0.0.20', 'Generic CCTV Camera',          'online',
   NULL, 'Storage Room')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- Seed the demo viewer + grant access to "Shared Cam".
--
-- Why: T-RLS-5 (the only "passed" check in the auth-rls.spec.ts suite that
-- actually exercises the camera grid) signs in as viewer@omnisight.local and
-- expects getByTestId('camera-card').filter({ hasText: 'Shared Cam' }).
-- The cameras SELECT RLS only admits rows where
--   owner_id = auth.uid() OR has_camera_access(id) OR is_admin().
-- Without a camera_access grant, the viewer's RLS-filtered SELECT returns 0
-- rows and the locator times out.
--
-- Before this seed step, the test created the viewer inline via UsersTab and
-- then called admin.from('camera_access').insert({...}) inside the test body
-- (auth-rls.spec.ts lines 53-66 of the current HEAD). The inline grant was
-- running AFTER the locator assertion fired; on cold runs the locator was
-- already asserting against a cameras state without the grant.
--
-- This seed.sql block makes the camera_access grant independent of test ordering:
-- the viewer is provisioned before tests run, with a fixed UUID, and the grant
-- is inserted during `supabase db reset`. The test UI's user creation will hit
-- "User already registered" which auth-rls.spec.ts tolerates (see commit message).
-- ============================================================================

INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at,
  confirmation_token, email_change, email_change_token_new, recovery_token
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  '33333333-3333-3333-3333-333333333333',
  'authenticated', 'authenticated',
  'viewer@omnisight.local',
  crypt('viewer1234!', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"role":"viewer","display_name":"viewer"}'::jsonb,
  now(), now(),
  '', '', '', ''
)
ON CONFLICT (id) DO NOTHING;

-- handle_new_auth_user() trigger creates the public.profiles row; the explicit
-- upsert below covers the re-run path (if user already exists, the trigger does
-- not re-fire, but the grant below still needs a role='viewer' profile record).
INSERT INTO public.profiles (id, display_name, role, status)
VALUES ('33333333-3333-3333-3333-333333333333', 'viewer', 'viewer', 'active')
ON CONFLICT (id) DO UPDATE SET role = 'viewer', status = 'active';

-- Grant viewer access to "Shared Cam" (= 22222222-... from line 9 of seed.sql).
-- granted_by left NULL because the seed itself isn't running under any user
-- session (BYPASSRLS, so RLS WITH CHECK does not block this insert).
INSERT INTO public.camera_access (camera_id, user_id)
VALUES (
  '22222222-2222-2222-2222-222222222222',
  '33333333-3333-3333-3333-333333333333'
)
ON CONFLICT (camera_id, user_id) DO NOTHING;
