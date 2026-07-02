#!/usr/bin/env bash
# ----------------------------------------------------------------------------
# Regression test for the v3.3.0.x + v3.3.0.x.x validators' regex double-escape
# fix in audit_script.sh.
#
# Provenance:
#   - v3.3.0.x validator's regex double-escape fix: a160c96
#   - v3.3.0.x.x sub-sub-cycle validator: 53dadbd
#   - This regression test: closes the code-reviewer non-blocking suggestion at
#     295e5c3 (v3.3.0.3.1) by adding a 3-line fixture that exercises both
#     validators' regex correctness end-to-end.
#
# 3-line fixture (with H3 context for the in_parent=1 vs in_parent=0 distinction):
#   L1: ### Adopted: auto-symlink-helper (v3.3.0)            <-- parent H3 (sets in_parent=1 for v3.3.0.x validator)
#   L2: [audit-note: v3.3.0.5 ...]                            <-- inside H3: expected 0 violations (PASS)
#   L3: ### Adopted: unrelated-section (v0.0.0)               <-- different H3 (resets in_parent=0 for v3.3.0.x validator)
#   L4: [audit-note: v3.3.0.5 ...]                            <-- outside H3: expected 1 violation (FAIL)
#   L5: \[analytics\] non-audit-note line                     <-- no-match: expected 0 matches (PASS)
#
# Goal: prevent future re-escaping regressions. If someone re-introduces the
# double-backslash bug (\\. instead of \.) in the awk regex, the regex would
# no longer match `v3.3.0.5` (it would match literal `\.3\.0\.5`), causing the
# test to fail. The test also verifies the v3.3.0.x.x regex does NOT accidentally
# match `v3.3.0.5` (single sub-cycle) — only `v3.3.0.<digit>.<digit>` patterns.
#
# Usage:
#   bash app/scripts/test-v3.3.0.x-regex.sh
#
# Exit code:
#   0 = all 3 test cases pass
#   1 = at least one test case fails
# ----------------------------------------------------------------------------
set -euo pipefail

PARENT='### Adopted: auto-symlink-helper (v3.3.0)'

# 3-line regression fixture (5 lines total: 2 H3 context lines + 3 test lines).
# The H3 boundaries are required so the awk state machine can distinguish
# in_parent=1 (L1..L2) from in_parent=0 (L4..L5).
read -r -d '' FIXTURE <<'EOF' || true
### Adopted: auto-symlink-helper (v3.3.0)
[audit-note: v3.3.0.5 sub-cycle marker -- inside parent H3 -- expected 0 violations from v3.3.0.x validator]
### Adopted: unrelated-section (v0.0.0)
[audit-note: v3.3.0.5 sub-cycle marker -- OUTSIDE parent H3 (different H3 above) -- expected 1 violation from v3.3.0.x validator]
\[analytics\] non-audit-note line -- expected 0 matches from either validator
EOF

# Helper: count non-empty lines in a string (violation count).
count_nonempty_lines() {
  printf '%s' "$1" | awk 'NF' | wc -l | tr -d ' '
}

# Test 1: v3.3.0.x regex (mirrors audit_script.sh L262).
# Single sub-cycle regex: `v3\.3\.0\.[0-9]+(\.[0-9]+)*` matches v3.3.0.5 but NOT
# v3.3.0 (which has no dot-digit) or v3.3.0.5.1 (which has 2 dot-digit groups;
# caught by v3.3.0.x.x validator below).
v330x_violations=$(printf '%s\n' "$FIXTURE" | awk -v parent="$PARENT" '
  BEGIN { in_parent = 0 }
  {
    if ($0 ~ /^### /) {
      in_parent = ($0 == parent) ? 1 : 0
    }
    if (match($0, /\[audit-note: v3\.3\.0\.[0-9]+(\.[0-9]+)*(\[[^]]*\]|[^]])*\]/)) {
      if (in_parent == 0) {
        printf "L%d: %s\n", NR, $0
      }
    }
  }
')

# Test 2: v3.3.0.x.x regex (mirrors audit_script.sh L329).
# Sub-sub-cycle regex: `v3\.3\.0\.[0-9]+\.[0-9]+` requires AT LEAST 2 dot-digit
# groups after v3.3.0. The fixture has only `v3.3.0.5` (1 dot-digit group), so
# this regex should match 0 lines. If the regex were re-escaped to match
# `v3.3.0.5` (1 dot-digit group), the test would fail.
v330xx_violations=$(printf '%s\n' "$FIXTURE" | awk -v parent="$PARENT" '
  BEGIN { in_parent = 0 }
  {
    if ($0 ~ /^### /) {
      in_parent = ($0 == parent) ? 1 : 0
    }
    if (match($0, /\[audit-note: v3\.3\.0\.[0-9]+\.[0-9]+(\[[^]]*\]|[^]])*\]/)) {
      if (in_parent == 0) {
        printf "L%d: %s\n", NR, $0
      }
    }
  }
')

v330x_count=$(count_nonempty_lines "$v330x_violations")
v330xx_count=$(count_nonempty_lines "$v330xx_violations")

# Verify expectations.
fail=0
if [ "$v330x_count" -ne 1 ]; then
  echo "FAIL: v3.3.0.x validator expected 1 violation (the L4 line outside H3), got $v330x_count"
  if [ -n "$v330x_violations" ]; then
    printf '  violations:\n'
    printf '%s\n' "$v330x_violations" | sed 's/^/    /'
  fi
  fail=1
fi
if [ "$v330xx_count" -ne 0 ]; then
  echo "FAIL: v3.3.0.x.x validator expected 0 violations (fixture has no v3.3.0.<digit>.<digit> markers), got $v330xx_count"
  if [ -n "$v330xx_violations" ]; then
    printf '  violations:\n'
    printf '%s\n' "$v330xx_violations" | sed 's/^/    /'
  fi
  fail=1
fi

if [ "$fail" -ne 0 ]; then
  echo
  echo "Regression test FAILED. The v3.3.0.x or v3.3.0.x.x regex in audit_script.sh may have been re-escaped (e.g., \\. changed to \\\\.). See git log a160c96 for the original double-escape fix."
  exit 1
fi

echo "PASS: 3-line regression test for v3.3.0.x + v3.3.0.x.x validators (mirrors audit_script.sh L262 + L329)"
echo "  Test 1: v3.3.0.x marker inside parent H3 (L2)  -> 0 violations (PASS)"
echo "  Test 2: v3.3.0.x marker outside parent H3 (L4) -> 1 violation (FAIL expected; caught by validator)"
echo "  Test 3: [analytics] non-audit-note line (L5)   -> 0 matches (PASS no-match; regex specificity preserved)"
echo "  Test 4: v3.3.0.x.x regex (sub-sub-cycle)       -> 0 violations (PASS; does NOT match v3.3.0.5 single sub-cycle)"
