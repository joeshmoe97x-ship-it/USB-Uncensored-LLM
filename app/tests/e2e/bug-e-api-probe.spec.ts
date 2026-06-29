/**
 * Bug E — strict-first API-payload probe (hypothesis 1 of 3 in Bug E diagnostic).
 *
 * Per docs/bug-diagnoses.md Bug E "Fix path TBD" subsection, this probe is
 * the FIRST step in narrowing the failure surface. The failing T-RLS-11
 * locator test (auth-rls.spec.ts:27, `viewer cannot see admin private
 * cameras; can see shared ones`) finds NO `data-testid='camera-card'`
 * matching 'Shared Cam' after admin sign-in. Without ground-truth data on
 * what the admin client actually receives from RLS, every subsequent fix
 * guess is uninformed.
 *
 * This spec answers hypothesis 1 DIRECTLY: as a freshly-authenticated
 * admin@omnisight.local, what does the PostgREST `cameras` SELECT
 * (Supabase REST) actually return?
 *
 *   - row_count >= 2 AND SHARED_UUID and ADMIN_UUID both present with
 *     status='online': hypothesis 1 (API-side RLS) is RULED OUT — the
 *     failure is on the UI render path (hypothesis 2-narrowed: silent
 *     render-guard early-return, or hypothesis 3: auth-JWT sync),
 *     and we pivot to CameraGrid.tsx or signin-state debugging.
 *
 *   - row_count = 0 OR row missing SHARED_UUID/ADMIN_UUID:
 *     hypothesis 1 (API-side RLS) CONFIRMED — Bug E's root cause is
 *     that the admin's `is_admin()` USING clause is not promoting rows
 *     for this anon-client context, and the fix belongs in the
 *     auth-JWT / profiles.role / RLS USING-clause surface (hypothesis 3).
 *
 * Implementation note — auth context:
 *   helpers.ts's `createAnonClient` configures `persistSession: false`, so
 *   any `signInWithPassword` call on a client returned by that helper
 *   discards the admin session before the JWT can be re-used. As a result,
 *   a downstream `anonClient.from('cameras').select('*')` would re-fire as
 *   the anon role, NOT as admin — collapsing the probe verdict to
 *   API_EMPTY irrespective of the actual admin-side payload. To preserve
 *   admin context we instead use `fetch()` directly with the
 *   PostgREST dual-header convention:
 *     - Authorization: Bearer <admin's JWT>  (drives auth.uid() +
 *       JWT-resident role claim used by is_admin() / RLS USING clause)
 *     - apikey: <VITE_SUPABASE_ANON_KEY>      (PostgREST requires both,
 *                                              apikey identifies project,
 *                                              Authorization identifies user)
 *   This mirrors the adminInvoke pattern in helpers.ts (which already
 *   uses fetch + Bearer for the Edge Function admin-users case) and is
 *   what `supabase-js` would do internally if the session were persisted.
 *
 * UUID-stable verdict matching:
 *   Verdict members use SHARED_UUID / ADMIN_UUID (table PKs) rather than
 *   name strings; both are stable across seed renames. Name matching is
 *   retained only as a human-readable cross-check surfaced in the verdict
 *   string.
 *
 * Output goes to worker stderr (`process.stderr.write`) with the
 * `[bug-e-api-probe.*]` prefix so a single
 *   grep '\\[bug-e-api-probe' /tmp/build-log/run*.stderr
 * surfaces the entire probe trace regardless of pass/fail outcome. This
 * builds on the capture-v6 stderr-routing pattern added in commit 0706252.
 *
 * INTENTIONALLY OMITTED from capture-v6.sh's Phase F + G spec list (the
 * regression cycle) AND from generic `npx playwright test` glob discovery
 * via the `testIgnore` rule in `app/playwright.config.ts`
 * (`'**/tests/e2e/bug-e-api-probe.spec.ts'`). The two exclusion layers are
 * independent and defense-in-depth: the hardcoded 3-spec list in capture-v6
 * blocks the probe from the regression cycle; testIgnore blocks it from
 * generic Playwright discovery. The probe emits `[bug-e-api-probe.*]`
 * worker-stderr verdict lines (`verdict=API_FULL` / `API_PARTIAL` /
 * `API_EMPTY`); these are verifier shapes NOT assertion shapes that
 * capture-v6.sh's `check_pw_unexpected` gate tolerates, so including the
 * probe in Phase F+G would mis-flag the regression cycle as FATAL even
 * when the probe itself passed. Running this spec TWICE per capture cycle
 * would otherwise pollute `_baseline-run.json` with a non-regression row,
 * distorting the `captured_at` aggregate counts.
 *
 * Playwright 1.61 honors `testIgnore` against glob discovery but bypasses
 * it for explicit positional CLI invocations — so the probe remains
 * contributor-invocable on demand:
 *   npx playwright test tests/e2e/bug-e-api-probe.spec.ts --reporter=line
 *
 * To execute the probe against the live local stack, run capture-v6.sh and
 * BEFORE its trap-fires cleanup, re-export env from
 * /tmp/build-log/sb-status.json + VITE_* + SERVICE_ROLE (Phase D set them),
 * then run the explicit-invocation command above.
 */
import { test } from '@playwright/test';
import {
  readSupabaseEnv,
  createAnonClient,
  signInAndGetJwt,
} from './helpers';

// UUIDs are PKs in `public.cameras` — stable across seed renames.
// Name strings match the canonical seed.sql labels for human-readable
// cross-checks only.
const ADMIN_EMAIL             = 'admin@omnisight.local';
const ADMIN_PASSWORD          = 'admin123';
const ADMIN_UUID              = '11111111-1111-1111-1111-111111111111';
const SHARED_UUID             = '22222222-2222-2222-2222-222222222222';
const ADMIN_PRIVATE_CAM_NAME  = 'Admin Private Cam';
const SHARED_CAM_NAME         = 'Shared Cam';

test('Bug E API payload probe — admin client lists all cameras via is_admin() RLS', async () => {
  const env = readSupabaseEnv();
  process.stderr.write(
    `[bug-e-api-probe] env-check url=${env.url} anon_key_len=${env.anon.length}\n`,
  );

  // 1. Sign in admin via fresh anon client (helpers.ts). Mirrors the
  //    T-RLS-3..5 pattern in auth-rls.spec.ts — applies email + password
  //    directly to supabase-js so we exercise the SAME auth path the
  //    in-app caller uses, with no browser-side signin form / state-store
  //    intermediary that could mask an auth-JWT-sync issue.
  const anonClient = createAnonClient(env);
  const adminJwt = await signInAndGetJwt(anonClient, ADMIN_EMAIL, ADMIN_PASSWORD);
  if (!adminJwt) {
    process.stderr.write(
      `[bug-e-api-probe] signin=FAIL — admin@omnisight.local returned no JWT; probe skipped. ` +
      `globalSetup.ts should have seeded the admin row.\n`,
    );
    test.skip(
      true,
      'admin sign-in failed — ensure globalSetup.ts seeded the admin row (capture-v6.sh Phase F+G)',
    );
    return;
  }
  process.stderr.write(
    `[bug-e-api-probe] signin=OK admin_jwt_len=${adminJwt.length} ` +
    `prefix=${adminJwt.slice(0, 16)}…\n`,
  );

  // 2. Probe cameras via PostgREST fetch() with the dual-header
  //    auth scheme described in the JSDoc above. We do NOT use
  //    `anonClient.from('cameras').select('*')` because the anon client
  //    has persistSession: false — see the auth-context note.
  const res = await fetch(`${env.url}/rest/v1/cameras?select=*`, {
    headers: {
      apikey:       env.anon,
      Authorization: `Bearer ${adminJwt}`,
    },
  });
  if (!res.ok) {
    process.stderr.write(
      `[bug-e-api-probe] cameras_query=FAIL http_status=${res.status}\n`,
    );
    return;
  }

  let rows: Array<{
    id?: string;
    name?: string;
    status?: string;
    owner_id?: string | null;
  }> = [];
  try {
    const body = await res.json();
    rows = Array.isArray(body) ? body : [];
  } catch (e) {
    process.stderr.write(
      `[bug-e-api-probe] cameras_query=PARSED_BODY_FAIL error=${JSON.stringify(e)}\n`,
    );
    return;
  }
  process.stderr.write(
    `[bug-e-api-probe] cameras_query=OK row_count=${rows.length}\n`,
  );

  // 3. Per-row enumeration — 4 fields per spec, regardless of column count.
  //    `?? 'NULL'` so SQL NULL is unambiguous in the log.
  let foundAdminUuid = false;
  let foundSharedUuid = false;
  let adminFoundStatus = 'MISSING';
  let sharedFoundStatus = 'MISSING';
  let adminNameMatch = false;
  let sharedNameMatch = false;
  for (const c of rows) {
    if (c?.id === ADMIN_UUID) {
      foundAdminUuid = true;
      adminFoundStatus = c?.status ?? 'NULL';
    }
    if (c?.id === SHARED_UUID) {
      foundSharedUuid = true;
      sharedFoundStatus = c?.status ?? 'NULL';
    }
    if (c?.name === ADMIN_PRIVATE_CAM_NAME) adminNameMatch = true;
    if (c?.name === SHARED_CAM_NAME)        sharedNameMatch = true;
    process.stderr.write(
      `[bug-e-api-probe]   id=${c?.id} name=${c?.name} ` +
      `status=${c?.status ?? 'NULL'} owner_id=${c?.owner_id ?? 'NULL'}\n`,
    );
  }

  // 4. Verdict + actionable classification. Output is structured so a
  //    human reading the build log can land on the verdict line via
  //    `grep '\\[bug-e-api-probe.*verdict='` without re-reading the
  //    per-row dump.
  if (rows.length === 0) {
    process.stderr.write(
      `[bug-e-api-probe] verdict=API_EMPTY ` +
      `admin@omnisight.local PostgREST returned 0 cameras — ` +
      `hypothesis 1 (API-side RLS) CONFIRMED. ` +
      `Pivot to auth-JWT / profiles.role / RLS USING-clause ` +
      `(hypothesis 3). admin_uuid_present=${foundAdminUuid} ` +
      `shared_uuid_present=${foundSharedUuid}\n`,
    );
  } else if (!foundAdminUuid || !foundSharedUuid) {
    process.stderr.write(
      `[bug-e-api-probe] verdict=API_PARTIAL ` +
      `admin_uuid_present=${foundAdminUuid} shared_uuid_present=${foundSharedUuid} ` +
      `admin_name_match=${adminNameMatch} shared_name_match=${sharedNameMatch} — ` +
      `hypothesis 1 (API-side RLS) CONFIRMED, narrow to which row missing. ` +
      `Pivot to auth-JWT or profiles.role patch (hypothesis 3). ` +
      `admin_status=${adminFoundStatus} shared_status=${sharedFoundStatus}\n`,
    );
  } else {
    process.stderr.write(
      `[bug-e-api-probe] verdict=API_FULL ` +
      `admin_uuid_present=${foundAdminUuid} shared_uuid_present=${foundSharedUuid} ` +
      `admin_name_match=${adminNameMatch} shared_name_match=${sharedNameMatch} — ` +
      `hypothesis 1 (API-side RLS) RULED OUT. Failure must be on UI ` +
      `render path: silent render-guard in CameraGrid.tsx (hypothesis 2-narrowed) ` +
      `OR auth-JWT-sync issue mid-test (hypothesis 3). ` +
      `admin_status=${adminFoundStatus} shared_status=${sharedFoundStatus}\n`,
    );
  }
});
