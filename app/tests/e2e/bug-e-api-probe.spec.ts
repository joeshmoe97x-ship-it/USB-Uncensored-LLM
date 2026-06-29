/**
 * Bug E — strict-first API-payload probe (hypothesis 1 of 3 in Bug E diagnostic).
 *
 * Architecture rationale + capture-cycle non-inclusion + two-layer defense
 * (testIgnore + capture-v6 hardcoded spec list) + on-demand invocation:
 *   app/docs/ops-notes.md § Capture-v6 vs Playwright discovery scope gap
 *   (anchor #capture-v6-vs-playwright-discovery-scope-gap).
 *
 * Canonical diagnosis doc (bidirectional tripod — JSDoc ↔ bug-diagnoses.md ↔ ops-notes.md):
 *   ../../docs/bug-diagnoses.md ## Bug E — `T-RLS-11` 'Shared Cam' UI locator timeout
 *   (anchor #bug-e--t-rls-11-shared-cam-ui-locator-timeout).
 *   This spec is the architectural Artifact-4 sibling of bug-diagnoses Bug E 4-artifact
 *   design (hypothesis-1 API-payload probe); bug-diagnoses Bug E reciprocally cites this
 *   spec at `../app/tests/e2e/bug-e-api-probe.spec.ts`.
 *
 * Verdict classification (logged via [bug-e-api-probe.*] worker-stderr prefix):
 *   API_FULL    — SHARED_UUID + ADMIN_UUID both present, status='online':
 *                 hypothesis 1 (API-side RLS) RULED OUT; pivot to UI render path.
 *   API_PARTIAL — at least one UUID missing or wrong-status: hypothesis 1
 *                 CONFIRMED, narrow target.
 *   API_EMPTY   — row_count == 0: hypothesis 1 CONFIRMED; full admin-side failure.
 * User sees `[bug-e-api-probe.*verdict=...]` in `/tmp/build-log/run{1,2}.stderr`.
 *
 * Auth/PostgREST invariant (NOT in ops-notes; load-bearing):
 *   createAnonClient uses persistSession: false, so admin sign-in on the anon
 *   client would re-fire as anon, not admin. We hit PostgREST directly via
 *   fetch with the dual-header convention (apikey + `Authorization: Bearer
 *   <admin jwt>`) — mirrors the adminInvoke pattern in helpers.ts.
 *
 * UUID-stable verdict matching: SHARED_UUID / ADMIN_UUID are public.cameras
 * PKs (stable across seed renames); name strings are human-readable cross-checks.
 *
 * On-demand invocation (testIgnore bypassed by explicit positional CLI):
 *   npx playwright test tests/e2e/bug-e-api-probe.spec.ts --reporter=line
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
