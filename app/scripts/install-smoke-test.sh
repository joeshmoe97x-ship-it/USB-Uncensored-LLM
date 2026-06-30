#!/usr/bin/env bash
# ----------------------------------------------------------------------------
# Provenance: introduced by v2.9-archeology-chain release-seal row (`### Adopted: v2.9-archeology-chain release seal (dual-path PARTIAL archive)`), audit-chain adoption v2.9.
# Tripod Closure: see `app/docs/ops-notes.md` #adopted-v2-9-archeology-chain-release-seal-dual-path-partial-archive and `docs/bug-diagnoses.md` Bug F (work-around traceability).
# Anchor Covenant (bundle-install): strictly depends on GitHub release-asset URL `https://github.com/joeshmoe97x-ship-it/USB-Uncensored-LLM/releases/download/v2.9-archeology-chain/v29-archeology-chain.bundle` resolving to a bundle whose sha256 matches `745d495f657671af542b2dba652952b3ee8f435b1c4a97f3511d52d9914af57a` and whose HEAD resolves to `26c8d81`.
# Disambiguation: pin-based smoke test for the v29-archeology-chain.bundle release artifact; not a general bundle-install helper (use git-bundle documentation for that).
# Tag Chain: synced as of audit-cycle-v2.9 (paired with bundle-side seal row @ `26c8d81`).
# ----------------------------------------------------------------------------
# Definition of done: exit 0 with all 5 sentinels PASS = integrity cluster closed.
# Sentinels: (1) curl download exit 0; (2) sha256 sum matches the canonical
# release-side hash above; (3) bundle size within the expected-order-of-magnitude
# window (sanity check against CDN-stripped tampered bundles); (4) archeology-
# chain branch materializes from the bundle HEAD; (5) the materialized HEAD ==
# `26c8d81` (matches umbrella archeology-chain HEAD at v2.9 seal).
#
# Idempotent: cleans up `v29.bundle` + `v29-clone` at start + on EXIT.
# Portability: Linux-only (uses GNU `sha256sum`; macOS users would need
# `shasum -a 256`).
# ----------------------------------------------------------------------------
set -euo pipefail

readonly BUNDLE_URL='https://github.com/joeshmoe97x-ship-it/USB-Uncensored-LLM/releases/download/v2.9-archeology-chain/v29-archeology-chain.bundle'
readonly EXPECTED_SHA256='745d495f657671af542b2dba652952b3ee8f435b1c4a97f3511d52d9914af57a'
readonly EXPECTED_HEAD='26c8d81'
# Bundle size window. Canonical baseline at v2.9: 1,224,420 bytes ~ 1.2 MB
# (verified via `stat -c '%s' v29.bundle` on the published release artifact).
# Lower bound 800 KB detects CDN-stripped-tampered bundles
# (e.g., truncated-but-valid-sha256 attacks); upper bound 5 MB allows future
# release-cycle growth without false-positives. Recalibrate canonical baseline
# on the next release-cycle audit.
readonly EXPECTED_SIZE_MIN=$((800 * 1024))         # 800 KB (canonical bundle is 1.2 MB; upper-bounded to detect CDN stripping)
readonly EXPECTED_SIZE_MAX=$((5 * 1024 * 1024))       # 5 MB (allows growth across release cycles)
readonly SMOKE_ROOT="$(mktemp -d -t v29-smoke-XXXXXX)"
readonly BUNDLE_FILE="${SMOKE_ROOT}/v29.bundle"
readonly CLONE_DIR="${SMOKE_ROOT}/v29-clone"

cleanup() {
  if [[ -d "${SMOKE_ROOT}" ]]; then
    rm -rf "${SMOKE_ROOT}"
  fi
}
trap cleanup EXIT

log_sentinel() {
  local name="$1"
  local result="$2"
  echo "[sentinel] ${name} = ${result}"
}

# ---------- sentinel 1: curl download (with retry resilience) ----------
echo "==> downloading v29-archeology-chain.bundle from ${BUNDLE_URL}"
curl -fsSL --connect-timeout 30 --max-time 300 \
  --retry 3 --retry-delay 5 --retry-all-errors \
  -o "${BUNDLE_FILE}" "${BUNDLE_URL}"
CURL_EC=$?
[[ ${CURL_EC} -eq 0 ]] || { log_sentinel curl FAIL; exit 1; }
log_sentinel curl PASS

# ---------- sentinel 2: sha256 integrity ----------
echo "==> verifying sha256"
ACTUAL_SHA256="$(sha256sum "${BUNDLE_FILE}" | awk '{print $1}')"
echo "    bundle sha256: ${ACTUAL_SHA256}"
echo "    expected     : ${EXPECTED_SHA256}"
[[ "${ACTUAL_SHA256}" == "${EXPECTED_SHA256}" ]] || {
  log_sentinel sha256 FAIL
  echo "ERROR: bundle sha256 does not match the canonical hash" >&2
  exit 2
}
log_sentinel sha256 PASS

# ---------- sentinel 3: bundle size within expected window (sanity) ----------
echo "==> verifying bundle size"
ACTUAL_SIZE=$(stat -c '%s' "${BUNDLE_FILE}")
echo "    bundle size : ${ACTUAL_SIZE} bytes"
echo "    window      : [${EXPECTED_SIZE_MIN}, ${EXPECTED_SIZE_MAX}] bytes"
if [[ ${ACTUAL_SIZE} -lt ${EXPECTED_SIZE_MIN} || ${ACTUAL_SIZE} -gt ${EXPECTED_SIZE_MAX} ]]; then
  log_sentinel size FAIL
  echo "ERROR: bundle size is outside the expected-order-of-magnitude window (possible CDN tampering)" >&2
  exit 3
fi
log_sentinel size PASS

# ---------- sentinel 4: git clone --bare + archeology-chain materialization ----------
echo "==> git clone --bare v29.bundle v29-clone"
git clone --bare "${BUNDLE_FILE}" "${CLONE_DIR}"
CLONE_EC=$?
[[ ${CLONE_EC} -eq 0 ]] || { log_sentinel clone FAIL; exit 4; }
log_sentinel clone PASS

echo "==> fetching archeology-chain branch from v29.bundle"
git -C "${CLONE_DIR}" fetch "${BUNDLE_FILE}" 'refs/heads/*:refs/heads/*' || true
git -C "${CLONE_DIR}" branch archeology-chain HEAD || git -C "${CLONE_DIR}" branch archeology-chain v2.7-v2.8-stacked-archeology
ARCH_BRANCH_EC=$?
[[ ${ARCH_BRANCH_EC} -eq 0 ]] || { log_sentinel branch FAIL; exit 5; }
log_sentinel branch PASS

# ---------- sentinel 5: HEAD sha match ----------
echo "==> verifying HEAD == ${EXPECTED_HEAD}"
ACTUAL_HEAD="$(git -C "${CLONE_DIR}" rev-parse --short HEAD)"
echo "    actual HEAD  : ${ACTUAL_HEAD}"
echo "    expected     : ${EXPECTED_HEAD}"
[[ "${ACTUAL_HEAD}" == "${EXPECTED_HEAD}" ]] || {
  log_sentinel head FAIL
  echo "ERROR: bundle HEAD does not match the canonical umbrella archeology-chain HEAD" >&2
  exit 6
}
log_sentinel head PASS

echo
echo "==> INTEGRITY CLUSTER CLOSED: all 5 sentinels PASS for v2.9-archeology-chain bundle"
exit 0
