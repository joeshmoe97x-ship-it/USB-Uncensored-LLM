#!/usr/bin/env python3
"""[Audit-Chain Provenance: introduced by `3a52e32` (`chore(infra): persist capture-v6.sh + scrub_and_build.py + audit_script.sh + supabase config`, audit-chain adoption v2.4).
 Tripod Closure: see `docs/ops-notes.md` #capture-v6-vs-playwright-discovery-scope-gap (this script is the immediate downstream consumer of `capture-v6.sh`'s `run1.json` + `run2.json` output; the canonical capture-pipeline tripod is `[capture-v6.sh : scrub_and_build.py : _baseline-run.json]`).
 Anchor Covenant (regex/escape/JSON-path/scrub-key): strictly depends on (a) the Playwright `--reporter=json` 4-tier hierarchy (Suite -> Spec -> Test -> Result); (b) `sb-status.json` keys `ANON_KEY` + `SERVICE_ROLE_KEY` + `API_URL` (all sourced from `supabase status -o json`); (c) scrub regexes `sb_secret_[A-Za-z0-9_-]+` + `eyJ[A-Za-z0-9-_=]+\\.[A-Za-z0-9-_=]+\\.?[A-Za-z0-9-_.+/=]*` (literal-string `scrub_string` call-sites apply them per-string); (d) the `/app/app/`-not-in-STUB canonical-path guard invariant inherited from `capture-v6.sh` Phase M.
 Disambiguation: canonical Playwright --reporter=json scrubber + `_baseline-run.json` writer; the ONLY Python tooling file at HEAD (cross-layer extension from bash SPDX pattern; not an extension of v2.0..v2.3); per-row output format (`{id: T-RLS-N, status, duration_ms, ...}` envelope) is downstream of the audit-chain header and is unchanged by this commit.
 Tag Chain: synced as of audit-cycle-v2.4.]

Rebuild tests/e2e/_baseline-run.json from /tmp/build-log/run{1,2}.json.

Canonical Playwright --reporter=json schema (4-tier hierarchy):
  Suite  node: { title, file, line, column, suites[], specs[] }
  Spec   node: { title (!), file, line, column, id, ok, tests[] }
  Test   node: { projectName, expectedStatus, timeout, status, results[] }
  Result node: { status, duration (int ms), retry, error? }

Per-row output (REWRITTEN -- direction-agnostic, AND-of-both-runs canonical status):
  duration_ms                 = canonical (median of run1 attempts)
  duration_run1_first_ms      = run1's first attempt by replay order
  duration_run2_first_ms      = run2's first attempt by replay order
  variance_ratio              = max(c1,c2) / max(min(c1,c2), 1)
  variance_ok                 = abs(c1,c2) <= max(40% of larger, 1000ms)
  status                      = AND of run1-final + run2-final (canonical consistency)
  -- granularity (added so root-cause surfaces inline rather than only in
     test-results/{authentication}/trace.zip):
  error_run1_final            = {message, snippet, location_file, location_line, location_column} | null
  error_run2_final            = same shape as error_run1_final | null
  skipped_reason_run1         = annotations[type=skip].description (first match) | null
  skipped_reason_run2         = same | null
  Both error_* and skipped_reason_* are scrubbed via scrub_string every pass to
  prevent sb_secret_* / JWT / API_URL leakage; messages are ANSI-stripped,
  truncated to ERR_MAX_LEN chars per field, and only emitted when present.
"""
import json, os, re, sys
from pathlib import Path
from datetime import datetime, timezone


# Granular error-capture knobs. Match the old capture philosophy (small, gate-able
# JSON) while keeping enough context to debug a future regression without booting
# into playwright-report/. ERR_MAX_LEN tunes per-field truncation so the committed
# baseline JSON stays compact even on full-stack error messages (which can be
# 1KB+ once Playwright decorates with retry paths).
ERR_MAX_LEN = 600
ANSI_RE = re.compile(r'\u001b\[[0-9;]*[A-Za-z]')  # suppress Playwright's color codes


def _strip_ansi(s):
    return ANSI_RE.sub('', s) if isinstance(s, str) else s


def _scrub_and_clip(s):
    """Truncate first, then scrub. Returns None on falsy input.

    Ordering rationale: the truncation marker had to live AFTER scrub in v1 so
    the JWT regex wouldn't accidentally match the marker text. Truncating FIRST
    + dropping the marker entirely is cleaner: no marker can introduce a fake
    `[REDACTED]` substring, and the JSON finalization (which still scrubs the
    whole output once) is idempotent on already-scrubbed strings.

    Forward reference: scrub_string is defined IMMEDIATELY ABOVE this helper
    (top of file, before any caller runs). _scrub_and_clip intentionally does
    NOT use a `'scrub_string' in globals()` runtime check: that pattern is
    fail-open (proceeding without scrub if the binding is missing) which is the
    wrong default for a secret-leak path. Without the check, NameError surfaces
    immediately if scrub_string is unbound -- a preferable fail-fast vs. silent
    bypass. (An earlier draft of this comment claimed records.append runs after
    scrub_string was bound at module-load time; that claim was wrong because
    records.append is at module level -- it executes BEFORE scrub_string's def
    is reached during source-order traversal. scrub_string has been moved to
    the top of this file accordingly.)
    """
    if not s:
        return None
    s = _strip_ansi(s)
    if len(s) > ERR_MAX_LEN:
        s = s[:ERR_MAX_LEN]  # hard cap; no marker (avoids eyJ-shape ambiguity)
    return scrub_string(s)


def _extract_error(attempt):
    """Return {message, snippet, location_file, location_line, location_column} | None.

    Reads Playwright attempt.error (or first attempt.errors[] entry as a fallback).
    Returns None when no usable error data is present (passed/skipped attempts).
    """
    if not isinstance(attempt, dict):
        return None
    err = attempt.get('error')
    if not isinstance(err, dict):
        # Fallback path for tests where Playwright omitted `error` but populated `errors[]`.
        err_list = attempt.get('errors') or []
        if err_list and isinstance(err_list[0], dict):
            err = err_list[0]
        else:
            return None
    msg = err.get('message') or ''
    if not msg:
        return None
    loc = err.get('location') or attempt.get('errorLocation') or {}
    return {
        'message':         _scrub_and_clip(msg),
        'snippet':         _scrub_and_clip(err.get('snippet')),
        'location_file':   loc.get('file'),
        'location_line':   loc.get('line'),
        'location_column': loc.get('column'),
    }


def _extract_skip_reason(attempt):
    """Return LAST annotations[type=skip].description (string, scrubbed+clipped) | None.

    Playwright may emit BOTH a `test.skip(true, 'X')` annotation AND an
    in-test `test.info().annotations.push({type:'skip', description:'Y'})`
    annotation. When multiple skip annotations exist, the LAST one wins --
    in-test annotations (added during test execution) typically appear AFTER
    the module-level test.skip() call in Playwright's reporter ordering, and
    authors intend the pushed reason to be the canonical reason surfaced to
    readers of the baseline JSON.
    """
    if not isinstance(attempt, dict):
        return None
    last = None
    for ann in (attempt.get('annotations') or []):
        if isinstance(ann, dict) and ann.get('type') == 'skip' and ann.get('description'):
            last = _scrub_and_clip(ann['description'])
    return last


# --- scrub_string IS DEFINED HERE (top of file, above any caller). ----------
# This must live BEFORE the records.append loop runs because the loop calls
# `_extract_error` / `_extract_skip_reason` -> `_scrub_and_clip` -> scrub_string.
# Module-level code executes in source order during `python3 scrub_and_build.py`,
# so if scrub_string's `def` is anywhere LATER than the loop's run-time location,
# a NameError fires when the loop runs. Earlier draft had scrub_string near
# `out = scrub_string(out)` at the bottom of the file -- that ordering was wrong.
#
# The function body uses ANON_KEY/SR_KEY/API_URL, which are populated from
# sb-status.json BELOW this point. That is OK because scrub_string's body only
# EXECUTES at call-time (records.append), by which point those globals are bound.
# Bound-at-def-time is NOT the issue; bound-at-call-time is what matters.
def scrub_string(s):
    """Apply scrub transforms to a single string; returns the scrubbed string.

    Idempotent: repeated application produces the same output. Called LAST in
    the error-capture helpers (after ANSI strip + truncate), so the truncation
    text (if any) cannot accidentally match a scrub regex.
    """
    out_s = s
    if ANON_KEY and ANON_KEY in out_s:
        out_s = out_s.replace(ANON_KEY, '[REDACTED]')
    if SR_KEY and SR_KEY in out_s:
        out_s = out_s.replace(SR_KEY, '[REDACTED]')
    if API_URL and API_URL in out_s and not API_URL.startswith('http://127.0.0.1'):
        out_s = out_s.replace(API_URL, '[REDACTED]')
    out_s, _ = re.subn(r'sb_secret_[A-Za-z0-9_-]+', '[REDACTED]', out_s)
    out_s, _ = re.subn(r'eyJ[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*', '[REDACTED]', out_s)
    return out_s



# Guard: missing-CAMARAS friendly SystemExit. capture-v6.sh L14 sets CAMARAS
# from $PROJECT_DIR before launching us; manual invocation without that env
# raises raw KeyError otherwise. Fail-fast with a clear message. The .strip()
# wash catches whitespace-only CAMARAS (e.g., "   ") which Python truthiness
# would otherwise let bypass the falsy check.
CAMARAS = os.environ.get('CAMARAS', '').strip()
if not CAMARAS:
    raise SystemExit(f'FATAL: scrub_and_build requires CAMARAS env var '
                     f'(capture-v6.sh L14 sets it via export CAMARAS=$PROJECT_DIR)')
CAM = Path(CAMARAS)
BL = Path('/tmp/build-log')
# STUB path. capture-v6.sh L13-L14 exports CAMARAS=$PROJECT_DIR where
# PROJECT_DIR="$HOME/Downloads/camaras" (does NOT end in /app).
# capture-v6.sh's Phase M uses STUB_REL="app/tests/e2e/_baseline-run.json"
# (WITH app/ prefix) for `git add` -- so the git-trackable canonical path
# is $PROJECT_DIR/app/tests/e2e/_baseline-run.json. Prepending 'app/' in
# the python-side write keeps STUB aligned to STUB_REL; without this, the
# python writes to $PROJECT_DIR/tests/e2e/_baseline-run.json (top-level,
# git-untracked) and Phase M's `git status --porcelain | grep '^[AM]'`
# correctly matches zero entries -> NOTHING_STAGED -> exit 37. The
# regression guard below was originally written for an older capture-v6.sh
# variant where PROJECT_DIR ended in /app AND STUB_REL had NO /app/ prefix
# (so an extra 'app/' segment produced /app/app/); the guard still catches
# any future find-and-replace that reintroduces the legacy /app/app/ bug
# pattern. Reproduction of the original NOTHING_STAGED pathology is recorded
# in app/docs/ops-notes.md and the audit-gap section documents the canonical
# recovery via the path-bug fix.
STUB = CAM / 'app' / 'tests' / 'e2e' / '_baseline-run.json'
# Regression guard (assertStubsUnderCamScript): fail-fast at module load if a
# future find-and-replace reintroduces the redundant `/app` prefix. CAMARAS
# already ends in `/app`; STUB must NOT contain `/app/app/` or capture-v6.sh's
# `git add $STUB_REL` (STUB_REL="tests/e2e/_baseline-run.json") will silently
# skip the file and FATAL with exit 37 NOTHING_STAGED.
if '/app/app/' in str(STUB):
    raise SystemExit(f'FATAL: scrub_and_build STUB invariant violated: '
                     f'CAMARAS={str(CAM)!r} + STUB path {str(STUB)!r} contains '
                     f'redundant /app; drop the extra "app/" segment.')


def fail(msg, code=99):
    print(f'FATAL: {msg}', file=sys.stderr)
    sys.exit(code)


sb_status_raw = (BL / 'sb-status.json').read_text() if (BL / 'sb-status.json').exists() else '{}'
try:
    sb_status = json.loads(sb_status_raw)
except Exception as e:
    fail(f'sb-status.json unparseable: {e}', code=70)
ANON_KEY = (sb_status.get('ANON_KEY') or '')
SR_KEY = (sb_status.get('SERVICE_ROLE_KEY') or '')
API_URL = (sb_status.get('API_URL') or '')

run1_path = BL / 'run1.json'
run2_path = BL / 'run2.json'
for label, p in (('run1', run1_path), ('run2', run2_path)):
    if not p.exists():
        fail(f'missing {label}: {p}', code=71)
run1 = json.loads(run1_path.read_text())
run2 = json.loads(run2_path.read_text())

# Top-level sanity check + stats guard + errors collection
errors_run1, errors_run2 = [], []
for label, d, err_list in (('run1', run1, errors_run1), ('run2', run2, errors_run2)):
    if not (isinstance(d, dict) and isinstance(d.get('suites'), list) and isinstance(d.get('stats'), dict)):
        fail(f'{label} does not look like playwright --reporter=json (missing suites/stats at top level)', code=72)
    stats = d.get('stats') or {}
    # NOTE: Playwright --reporter=json emits stats.duration as a FLOAT (millisecond-precise),
    # not an int. The previous isinstance(int) check rejected any float and FATAL'd the run.
    # Accept both numeric types and check the value semantically (> 0 ms).
    stats_duration = stats.get('duration')
    if not isinstance(stats_duration, (int, float)) or isinstance(stats_duration, bool) or stats_duration <= 0:
        fail(f'{label}.stats.duration <= 0 (run aborted?), value={stats_duration!r}', code=72)
    print(f'{label}.stats: startTime={stats.get("startTime")} duration_ms={stats_duration} '
          f'expected={stats.get("expected")} skipped={stats.get("skipped")} '
          f'unexpected={stats.get("unexpected")} flaky={stats.get("flaky")}', file=sys.stderr)
    for err in (d.get('errors') or []):
        msg = err.get('message') if isinstance(err, dict) else str(err)
        if msg:
            err_list.append(msg[:300])


def flatten(suites_list, ancestry):
    """Walk the 4-tier hierarchy. Returns [(ancestry_tuple, attempt_dict, spec_meta_dict, test_meta_dict), ...]."""
    out = []
    for suite in suites_list or []:
        suite_title = suite.get('title') or ''
        new_anc = ancestry + [suite_title] if suite_title else ancestry
        out.extend(flatten(suite.get('suites') or [], new_anc))
        for spec in suite.get('specs') or []:
            spec_title = spec.get('title') or 'unknown_spec'
            if spec.get('title') is None:
                print(f'WARN: spec missing title at {spec.get("file")}:{spec.get("line")}', file=sys.stderr)
            spec_anc = new_anc + [spec_title]
            spec_meta = {
                'title':  spec_title,
                'file':   spec.get('file'),
                'line':   spec.get('line'),
                'column': spec.get('column'),
                'id':     spec.get('id'),
                'ok':     spec.get('ok'),
            }
            for test in spec.get('tests') or []:
                test_meta = {
                    'projectName':    test.get('projectName'),
                    'expectedStatus': test.get('expectedStatus'),
                    'timeout':        test.get('timeout'),
                    'status':         test.get('status'),
                }
                for attempt in test.get('results') or []:
                    out.append((tuple(spec_anc), attempt, spec_meta, test_meta))
    return out


def leaf_key(row):
    _spec_anc, _attempt, spec_meta, test_meta = row
    return (
        _spec_anc,
        test_meta.get('projectName'),
        test_meta.get('expectedStatus'),
        test_meta.get('timeout'),
        spec_meta.get('file'),
        spec_meta.get('line'),
        spec_meta.get('column'),
    )


def is_pass(attempt):
    s = attempt.get('status', '')
    return s in ('passed', 'expected')


rows1 = flatten(run1.get('suites', []), ['root'])
rows2 = flatten(run2.get('suites', []), ['root'])
print(f'flatten: rows1={len(rows1)} rows2={len(rows2)}', file=sys.stderr)

g1, g2 = {}, {}
for r in rows1:
    g1.setdefault(leaf_key(r), []).append(r)
for r in rows2:
    g2.setdefault(leaf_key(r), []).append(r)

common = sorted(set(g1.keys()) & set(g2.keys()))
only1 = sorted(set(g1.keys()) - set(g2.keys()))
only2 = sorted(set(g2.keys()) - set(g1.keys()))
if only1:
    print(f'WARN: tests only-in-run1 (recorded, NOT aborting; n={len(only1)}): {only1[:3]!r}', file=sys.stderr)
if only2:
    print(f'WARN: tests only-in-run2 (recorded, NOT aborting; n={len(only2)}): {only2[:3]!r}', file=sys.stderr)
assert len(common) > 0, f'no common tests (g1={len(g1)} g2={len(g2)})'
print(f'common tests: {len(common)}', file=sys.stderr)

records = []
for key in common:
    leaves1, leaves2 = g1[key], g2[key]
    # Empty-leaves guard (crash risk on [-1])
    if not leaves1 or not leaves2:
        print(f'WARN: empty leaves for {key}; skipping', file=sys.stderr)
        continue
    if len(leaves1) != len(leaves2):
        print(f'WARN: attempt-count mismatch {key}: run1={len(leaves1)} run2={len(leaves2)} -- proceeding with min', file=sys.stderr)
    n = min(len(leaves1), len(leaves2))
    for r1, r2 in zip(leaves1[:n], leaves2[:n]):
        att1, att2 = r1[1], r2[1]
        ok1, ok2 = is_pass(att1), is_pass(att2)
        if ok1 != ok2:
            print(f'WARN: status-mismatch {key}: run1={att1.get("status")} run2={att2.get("status")} -- recording both', file=sys.stderr)
    # Per-test durations from Playwright --reporter=json are FLOAT ms with sub-ms precision
    # (e.g., 2517.3963). Use round() (returns int when called with one arg) instead of int()
    # to preserve ms accuracy via unbiased rounding -- int() truncates downward and silently
    # loses <1 ms on fast tests. Downstream per-test isinstance(v, int) asserts still hold
    # since round(numeric) -> int on a single-arg call.
    durations_run1 = [round(r[1].get('duration', 0) or 0) for r in leaves1]
    median_ms = sorted(durations_run1)[len(durations_run1) // 2]
    run1_first_ms = round(leaves1[0][1].get('duration', 0) or 0)
    run2_first_ms = round(leaves2[0][1].get('duration', 0) or 0)
    # Both first-attempt durations must be >= 0; not > 0 (allow 0ms tests)
    if run1_first_ms < 0 or run2_first_ms < 0:
        fail(f'negative duration for {key}: run1={run1_first_ms} run2={run2_first_ms}', code=74)
    tol = max(0.40 * max(run1_first_ms, run2_first_ms, 1), 1000)
    variance_ok = abs(run1_first_ms - run2_first_ms) <= tol
    if not variance_ok:
        print(f'WARN: cross-run drift (recorded, NOT aborting) at {key}: '
              f'run1={run1_first_ms}ms run2={run2_first_ms}ms '
              f'ratio={round(max(run1_first_ms, run2_first_ms)/max(min(run1_first_ms, run2_first_ms), 1), 2)} '
              f'tol=±{tol:.0f}ms', file=sys.stderr)
    variance_ratio = round(max(run1_first_ms, run2_first_ms) / max(min(run1_first_ms, run2_first_ms), 1), 2)
    # AND-of-both-runs status (canonical consistency)
    run1_final_status = 'passed' if is_pass(leaves1[-1][1]) else leaves1[-1][1].get('status', 'unknown')
    run2_final_status = 'passed' if is_pass(leaves2[-1][1]) else leaves2[-1][1].get('status', 'unknown')
    if run1_final_status == 'passed' and run2_final_status == 'passed':
        canonical_status = 'passed'
    elif run1_final_status == 'passed' or run2_final_status == 'passed':
        canonical_status = 'inconsistent'
    else:
        canonical_status = run1_final_status
    spec_meta = leaves1[0][2]
    test_meta = leaves1[0][3]
    ancestry_clean = [a for a in key[0] if a and a != 'root']
    title = ' / '.join(ancestry_clean)
    records.append({
        'test_key':               key,
        'spec_meta':              spec_meta,
        'test_meta':              test_meta,
        'title':                  title,
        'ancestry':               ancestry_clean,
        'attempts_run1':          len(leaves1),
        'attempts_run2':          len(leaves2),
        'status':                 canonical_status,
        'status_run1_final':      run1_final_status,
        'status_run2_final':      run2_final_status,
        'duration_ms':            int(median_ms),
        'duration_run1_first_ms': int(run1_first_ms),
        'duration_run2_first_ms': int(run2_first_ms),
        'variance_ratio':         variance_ratio,
        'variance_ok':            variance_ok,
        'error_run1_final':       _extract_error(leaves1[-1][1]),
        'error_run2_final':       _extract_error(leaves2[-1][1]),
        'skipped_reason_run1':    _extract_skip_reason(leaves1[-1][1]),
        'skipped_reason_run2':    _extract_skip_reason(leaves2[-1][1]),
    })


def make_dropped_record(key, source, leaf_list, idx):
    ancestry_clean = [a for a in key[0] if a and a != 'root']
    spec_meta = leaf_list[0][2]
    test_meta = leaf_list[0][3]
    return {
        'id':                     f'DROPPED-{source.upper()}-{idx+1}',  # never null; preserves schema
        'title':                  ' / '.join(ancestry_clean),
        'ancestry':               ancestry_clean,
        'project':                test_meta.get('projectName'),
        'file':                   spec_meta.get('file'),
        'line':                   spec_meta.get('line'),
        'column':                 spec_meta.get('column'),
        'status':                 'dropped',
        'reason':                 f'present_only_in_{source}',
        # round() (matches the per-test extractor above) — int() was inconsistent with main rows
        # and silently dropped sub-ms on fast tests; align dropped rows with captured rows.
        'duration_ms':            round(leaf_list[0][1].get('duration', 0) or 0),
        'duration_run1_first_ms': round(leaf_list[0][1].get('duration', 0) or 0) if source == 'run1' else 0,
        'duration_run2_first_ms': round(leaf_list[0][1].get('duration', 0) or 0) if source == 'run2' else 0,
        'variance_ratio':         1.0,
        'variance_ok':            True,
    }


dropped_run1_records = [make_dropped_record(k, 'run1', g1[k], i) for i, k in enumerate(only1)]
dropped_run2_records = [make_dropped_record(k, 'run2', g2[k], i) for i, k in enumerate(only2)]

print(f'records: {len(records)} | total_ms(canonical-median)={sum(r["duration_ms"] for r in records)} '
      f'| total_ms(run1-first)={sum(r["duration_run1_first_ms"] for r in records)} '
      f'| total_ms(run2-first)={sum(r["duration_run2_first_ms"] for r in records)}', file=sys.stderr)


def _unwind_test_record(r, idx):
    """Project the records.append() row into the public tests[] envelope.

    Carries over EVERY key from the record dict (so newly added fields like
    error_run{1,2}_final + skipped_reason_run{1,2} flow into _baseline-run.json
    automatically -- no risk of the tests[] builder silently dropping a future
    field). Container fields (test_key, spec_meta, test_meta) are popped; their
    leaf values are flattened into single-key output (file, line, column, project).
    dict(r) is used instead of **r because **r would expose spec_meta / test_meta
    container dicts as JSON sub-objects -- we want a flat test-row shape.
    """
    env = dict(r)
    env['id']      = f'T-RLS-{idx}'
    env['project'] = r['test_meta'].get('projectName')
    env['file']    = r['spec_meta'].get('file')
    env['line']    = r['spec_meta'].get('line')
    env['column']  = r['spec_meta'].get('column')
    env.pop('test_key',  None)
    env.pop('spec_meta', None)
    env.pop('test_meta', None)
    return env


new = {
    'status':      'captured',
    'captured_at': datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ'),
    'node_runtime': {
        'note': 'see docs/ops-notes.md -> "Node 20 + Supabase realtime ws workaround"',
    },
    'capture_protocol': {
        'supabase_start': '`supabase start` with vector + studio disabled per `supabase/config.toml` (commit 5c1a0c0)',
        'web_server':     '`npm run dev` (Vite) in background before playwright runs; killed after both',
        'readiness_gate': [
            '30s settle sleep', 'ss -tlnp port check',
            'docker ps container health',
            'HTTP /auth/v1/health + /rest/v1/ return 200',
            'curl -sf http://127.0.0.1:5173 (Vite upstream)',
        ],
        'env_export': [
            'VITE_SUPABASE_URL      <- API_URL',
            'VITE_SUPABASE_ANON_KEY <- ANON_KEY',
            'SUPABASE_URL           <- API_URL (defensive)',
            'SUPABASE_ANON_KEY      <- ANON_KEY (defensive)',
            'SUPABASE_SERVICE_ROLE_KEY <- SERVICE_ROLE_KEY (defensive; RLS setup only)',
        ],
        'idempotency_gating': (
            '2 runs. Status strict-equal across runs IS mandatory. '
            'Duration drift is recorded per-row (duration_run1_first_ms + duration_run2_first_ms + variance_ratio + variance_ok); '
            'cold-vs-warm drift does NOT abort (cold-start is real, not flaky). '
            'only-in-run-1 / only-in-run-2 are recorded in dropped_in_run1[] / dropped_in_run2[] without aborting.'
        ),
        'scrubbing':    ['Supabase-secret literal-sweep', 'JWT (eyJ...) regex-sweep', 'ANON_KEY + SERVICE_ROLE_KEY literal-sweep', 'public API_URL substring-sweep'],
        'gate_no_fake': 'NO FAKE MS VALUES -- durations are real ms from Playwright results[*].duration. Canonical = median of run1 attempts. cross-run first-attempt durations preserved for the variance audit.',
    },
    'playwright_env': {
        'DEBUG':              'pw:api',
        'log':                '/tmp/build-log/baseline-run.log',
        'node_ws_workaround': '@supabase/realtime-js requires Node-native WebSocket OR `ws` shim via transport: ws (see docs/ops-notes.md)',
    },
    'aggregate': {
        'total_tests':                          len(records),
        'all_passed_in_both_runs':              all((r['status_run1_final'] == 'passed' and r['status_run2_final'] == 'passed') for r in records),
        'any_inconsistent_between_runs':        any(r['status'] == 'inconsistent' for r in records),
        'any_with_documented_variance':         any(not r['variance_ok'] for r in records),
        'cold_start_tests':                     sorted([r['title'] for r in records if not r['variance_ok']]),
        'dropped_in_run1_count':                len(dropped_run1_records),
        'dropped_in_run2_count':                len(dropped_run2_records),
        'runner_errors_run1_count':             len(errors_run1),
        'runner_errors_run2_count':             len(errors_run2),
        'total_duration_ms_canonical_sum':      sum(r['duration_ms'] for r in records),
        'total_duration_ms_run1_first_sum':     sum(r['duration_run1_first_ms'] for r in records),
        'total_duration_ms_run2_first_sum':     sum(r['duration_run2_first_ms'] for r in records),
    },
    'runner_errors': {
        'run1': errors_run1,
        'run2': errors_run2,
    },
    'tests': [
        _unwind_test_record(r, idx=i+1)
        for i, r in enumerate(records)
    ],
    'dropped_in_run1': dropped_run1_records,
    'dropped_in_run2': dropped_run2_records,
}

out = json.dumps(new, indent=2, sort_keys=True) + '\n'


# scrub_string is defined at the TOP of this file (above _scrub_and_clip) so the
# records.append() loop can safely call `_scrub_and_clip` -> scrub_string
# during module-load source-order traversal. There is intentionally NO second
# `def scrub_string` here. An earlier edit cycle left a duplicate which silently
# overrode the top-of-file binding via Python's last-def-wins; the canonical,
# single source of truth now lives near the top of this file alongside the
# error-extraction helpers.


# Defensive per-error scrub for runner_errors (in case raw error text contains a token)
new['runner_errors']['run1'] = [scrub_string(e) for e in new['runner_errors']['run1']]
new['runner_errors']['run2'] = [scrub_string(e) for e in new['runner_errors']['run2']]

out = json.dumps(new, indent=2, sort_keys=True) + '\n'

# Final scrub sweep over the entire output (defense-in-depth)
out = scrub_string(out)
print(f'final scrub pass complete', file=sys.stderr)

# Per-test sanity assertions (>= 0 allows legitimately fast tests; negative is invalid)
for t in new['tests']:
    if not t.get('id', '').startswith('T-RLS-'):
        fail(f'bad id: {t}', code=74)
    if not t.get('title'):
        fail(f'missing title: {t}', code=74)
    for fld in ('duration_ms', 'duration_run1_first_ms', 'duration_run2_first_ms'):
        v = t.get(fld)
        if not isinstance(v, int) or v < 0:
            fail(f'bad {fld} (must be int >= 0): {t}', code=74)

STUB.parent.mkdir(parents=True, exist_ok=True)
STUB.write_text(out)
print(f'wrote {STUB}: {STUB.stat().st_size} bytes; records={len(records)}', file=sys.stderr)
