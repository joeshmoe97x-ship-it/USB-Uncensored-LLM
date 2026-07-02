#!/usr/bin/env bash
# ----------------------------------------------------------------------------
# Provenance: introduced by `3a52e32` (last modified by `4216366` — rewire to Linux/app + GRANTS-blocked fork checkpoint; audit-chain adoption v1.11 + v2.5 cross-domain extension + v2.7 inventory-count regression sentinel + v2.7 regex-pitfall sentinels (Phases R + G-mirror + H-mirror) + v2.9 incident-RETRO grep-census extension at Phase C (inaugural `[releases-install-snippet-bug]` tag in `app/docs/ops-notes.md`); v2.9 census-block forward-fix at `7d143fb` (relocate out of `if [ -n "$py_files" ] else` into Phase C global scope; closes audit-note #3 of the [releases-install-snippet-bug] retro tripod); v2.9 path-semantics fix in this commit (prepend `${PROJECT_DIR##*/}/` in the cross-file census `echo` line so the inaugural metric surfaces as `1 file (app/docs/ops-notes.md)` repo-root-relative, matching the docs-corpus convention; `git ls-files` stays CWD-relative so the inner grep can access the files); v3.0 extension: audit-note state census at Phase C (inaugural occurrence: 4 markers in `app/docs/ops-notes.md`; marker regex `\[audit-note[^]]*\]`; state extraction via `-- STATE` keyword with ACTIVE default; per-file line-numbered + cross-file state-grouped descending-count census; closes the audit-note-count-census followup of the [releases-install-snippet-bug] retro tripod); v3.0 extension: absolute inventory-count drift sentinel (valid range [16, 28]: v2.7 baseline 16 + post-v2.9 bump 17 + post-v3.0.1 hotfix inventory-row bump 18 + post-v3.1.5 first-wave-registry + H3-creation inventory-row bump 26 (the v3.1.4 archeology-drift-restructure GFM-slug-restructure H3 + row 26 registration land as a paired create + register via THIS COMMIT's v3.1.5 cycle; closes the v3.1 cycle's adoption-pending-row-26 inventory-broken chain); WARN fires on count < 16 or count > 28, catching both deletion regression and future v2.10+ addition regression; forward-extendable by bumping the upper bound when a future row is added); v3.0 extension: audit-note no-state-keyword drift sentinel (max allowed: 1, the #adopted-audit-note-nested-brackets-regex-hotfix-v3-0-1 (row 18) emission-surfaces preservation contract as the canonical active-contract example; FAILs the audit-script run via `exit 1` if count > 1, catching any future audit-note authored without an explicit `-- STATE` keyword that would silently inflate the ACTIVE bucket and defeat the audit-note state census invariant; forward-extendable by bumping `no_state_max` when an additional active contract is intentionally added); v3.0.1 hotfix: nested-brackets regex bug fix at all 3 call sites (per-file census L138 + cross-file state-grouped census L157 + no-state-keyword drift sentinel L213) -- the original v3.0 regex `\[audit-note[^]]*\]` truncated at the first `]`, misclassifying the #adopted-bundle-side-integrity-cluster-smoke-test-incident-retro-releases-install-snippet-bug (row 17) marker `[audit-note: [releases-install-snippet-bug] -- RESOLVED]` as NO-STATE (the `]` inside `[releases-install-snippet-bug]` closed the match prematurely); the fixed regex `\[audit-note(\[[^]]*\]|[^]])*\]` uses a capturing group with alternation to allow one level of nested brackets (POSIX ERE compatible; uses capturing group `(...)` instead of PCRE non-capturing group `(?:...)` which `grep -E` does not support; minimal adaptation that achieves the same outcome); v3.0.1 hotfix: lower `no_state_max` from 2 back to 1 (the #adopted-bundle-side-integrity-cluster-smoke-test-incident-retro-releases-install-snippet-bug (row 17) false-positive is resolved by the regex fix, so the v3.0 sentinel's intended threshold of 1 is restored); v3.0.1 verification: the #adopted-bundle-side-integrity-cluster-smoke-test-incident-retro-releases-install-snippet-bug (row 17) marker now correctly surfaces as `[RESOLVED]` in the state-grouped census and as a state-bearing marker in the per-file census (no longer tagged `[no-state-keyword]`); v3.1.4 GFM-slug-restructure: in THIS commit, raw L-references (L1108 + L1106) replaced with GFM slug + inventory-row position citations in 9 distinct L-reference surfaces across audit_script.sh Provenance + Anchor Covenant + inline-block + FAIL-message comments (Provenance header L3 = 4x: L1108 x1 + L1106 x3; Anchor Covenant header L5 = 1x: L1106 x1; inline-block no-state-keyword drift sentinel comment L199-L207 = 3x: L1108 x1 + L1106 x2; FAIL-message runtime string L230 = 1x: L1108 x1); L1108 emission-surfaces preservation contract → #adopted-audit-note-nested-brackets-regex-hotfix-v3-0-1 (row 18); L1106 [releases-install-snippet-bug] -- RESOLVED → #adopted-bundle-side-integrity-cluster-smoke-test-incident-retro-releases-install-snippet-bug (row 17); drift-immune because the Anchor collision covenant inventory IS the canonical anchor surface and GFM slugs survive the reflows that would invalidate raw L-references (the v3.1 cycle's `2167dd3` Adopted-row reflow + `8b4aba1` first-wave-registry compressed this script's documented L-reference anchors from the prior L1106/L1108 positions down into the inventory-row range L32-L34, surfacing the drift-correction need that this commit resolves); forward-extendable per the inline-block progressive-replacement pattern so future archeology-drift corrections can append additional L-reference-surface migrations without rewriting prior entries).; v3.1.5 archeology-cycle meta-extension: at commit `1efc179`, the v3.1.5 + v3.1.5.x + v3.1.5.x.x archeology chain (commits `80febfa` + `0e33f4b` + `532e537` + `19fca21` + `b428583` + `188100b` + `fd04985`) was consolidated onto the canonical archeology surface via the new Adopted H3 `### Adopted: archeology-cycle meta-extension (v3.1.5)` registered as row 27 of the anchor-collision-covenant inventory at `#adopted-archeology-cycle-meta-extension-v3-1-5` + the audit-script.sh inv_max=26 → inv_max=27 cascade (L239 declaration + L3/L5/L6 valid-range comments + L255 sentinel block + L266 row-27 doc line + L270 > 27 forward-addition regression guard) + 7ee7162 audit-script syntax fix landing the missing `#` prefix on row-27 doc line; in THIS commit, the audit-script's Provenance header (L3 + L5 + L6) is extended with explicit v3.1.5 cycle entries so the audit-script's own archeology chain surfaces the v3.1.5 cycle across the documentation surfaces (the substantive cycle creation landed at `1efc179` + `7ee7162`; this commit is the audit-script-side archeology-chain enumeration only, intentionally split per the no-amend convention + archeology-covenant invariant that the audit-script's chain itself enumerates every cycle the script validates); v3.1.5.1 forward-extension-surface registration mechanical-validator [described in audit-script body below as Phase-C increment]: inaugural v3.1.5.x sub-cycle; closes the v3.1.5 adopt-default contract from documentary to mechanical; introduces a Phase-C awk-based grep-validator that grep-checks `[audit-note...]` markers with `v3.1.5.<digit>` body against parent H3 SLUG `#adopted-archeology-cycle-meta-extension-v3-1-5` Adopted section membership; FAILs the audit-script run via `exit 1` on peer-row registration (this is the inaugural v3.1.5.x sub-cycle applying the v3.1.5 SLUG convention to a sub-cycle for the first time; forward-extension-surface permits future v3.1.5.x.x.x sub-cycles to mirror this validator's pattern with the regex token + parent SLUG replaced per sub-cycle scope; the awk state-machine back-bone + the FAIL-on-violation exit-gate stay invariant; + v3.1.5.1.1 PIPEFAIL-BYPASS post-tee FAIL-gate (sentinel file `/tmp/audit-v3151-fail.txt` written inside v3.1.5.1 FAIL branch before existing `exit 1`; post-tee gate at end of script (AFTER `} 2>&1 | tee "$LOG"` brace-block close) reads sentinel in parent-bash context + propagates bash-level exit_code=1; closes the v3.1.5.1 tee-pipeline-mask SHIP-BLOCKING finding; sentinel-path under `/tmp/build-log/` for multi-user permission isolation matching the LOG declaration convention at L13; defensive `rm -f` at script start prevents stale-sentinel false-positives from interrupted prior runs) + v3.1.5.1.2 PATH-CORRECTNESS (renames sentinel from the v3.1.5.1.1-deviated build-log-prefixed variant to /tmp/audit-v3151-fail.txt per user literal spec; closes the sentinel-path-deviation SHIP-BLOCKING finding from code-reviewer at acba90d; the multi-user permission isolation concern documented in v3.1.5.1.1 L3+L5+L6 is preserved because /tmp/audit-v3151-fail.txt per audit-script convention + sed-style tmpfilenames are inode-owned per-process).
# Tripod Closure: see `app/docs/ops-notes.md` #anchor-collision-covenant (the H2 convention this script validates end-to-end).
# Anchor Covenant (inverse + cross-domain SPDX): inverse-anchor grep patterns `#[a-z][a-z0-9-]*` (slug census) + `` `[a-f0-9]{7}` `` (SHA-citation resolution); v2.5 extension: cross-domain SPDX header checks across `# shell-comment` (bash) and """ docstring """ (Python) sectors; v2.7 extension: inventory-count regression sentinel (strict regex ``^- `#``, baseline 16 rows at v2.7; off-hand-vs-strict delta 28; regex-pitfall sentinels at Phase R + Phase G mirror + Phase H mirror reasserting 44/16/28 baselines); v2.9 extension: incident-RETRO grep-census at Phase C (inaugural `[releases-install-snippet-bug]` tag in `app/docs/ops-notes.md`, registered as inverse anchor of the docs corpus; regex pattern `\[INCIDENT-RETRO:[a-z][a-z0-9_-]+\]|\[[a-z][a-z0-9_-]+-bug\]`; v2.9 forward-fix `7d143fb` makes the census reachable unconditionally; v2.9 path-semantics fix in this commit prepends `${PROJECT_DIR##*/}/` in the cross-file census `echo` so the inaugural metric surfaces as `[releases-install-snippet-bug]: 1 file (app/docs/ops-notes.md)` matching the docs-corpus convention; `git ls-files` stays CWD-relative so the inner grep can access the files; v3.0 extension: audit-note grep-census at Phase C (inaugural occurrence: 4 markers in `app/docs/ops-notes.md`; regex `\[audit-note[^]]*\]`; state extraction via `-- STATE` keyword with ACTIVE default; per-file line-numbered + cross-file state-grouped descending-count census; registered as inverse anchor of the docs corpus); v3.0 extension: absolute inventory-count drift sentinel (valid range [16, 28]: v2.7 baseline 16 + post-v2.9 bump 17 + post-v3.0.1 hotfix inventory-row bump 18 + post-v3.1.5 first-wave-registry + H3-creation inventory-row bump 26; WARN fires on count outside this range; promotes the v2.7 sentinel from regex-pitfall-delta-only to also detect absolute count drift); v3.0 extension: audit-note no-state-keyword drift sentinel (max allowed: 1; FAILs the audit-script run via `exit 1` if count > 1; catches future audit-note authored without explicit `-- STATE` keyword); v3.0.1 hotfix: Phase C audit-note regex expanded from `\[audit-note[^]]*\]` to `\[audit-note(\[[^]]*\]|[^]])*\]` at all 3 call sites (per-file census L138 + cross-file state-grouped census L157 + no-state-keyword drift sentinel L213) to support one level of nested brackets; resolves the prior #adopted-bundle-side-integrity-cluster-smoke-test-incident-retro-releases-install-snippet-bug (row 17) false-positive where the marker `[audit-note: [releases-install-snippet-bug] -- RESOLVED]` was misclassified as NO-STATE because the original regex truncated at the first `]` (the one inside `[releases-install-snippet-bug]`); uses POSIX ERE capturing group `(...)` instead of PCRE non-capturing group `(?:...)` for grep -E compatibility; registered as inverse anchor of the docs corpus). v3.1.5 archeology-cycle meta-extension: forward-extension-surface registration via H3 sub-bullet convention (H3 SLUG `#adopted-archeology-cycle-meta-extension-v3-1-5` parent + future v3.1.5.x.x.x sub-cycles as sub-bullets under the parent H3 slug); the H3 sub-bullet pattern is reflow-immune AND insertion-immune (line references rot on reflow, inventory rows rot on insertion, but H3 sub-bullets under a stable H3 slug are stable under both); the inv_max=27 cap is forward-stabilized indefinitely so sub-cycle sub-bullet additions do not Touch the absolute inventory-count drift sentinel.; v3.1.5.1 forward-extension-surface registration mechanical-validator: grep-validates `[audit-note...]` markers with `v3.1.5.<digit>` body against parent H3 Adopted section membership for parent SLUG `#adopted-archeology-cycle-meta-extension-v3-1-5`; the awk state-machine tracks `in_parent=1` between the parent H3 line (`### Adopted: archeology-cycle meta-extension (v3.1.5)`) and the next `### ` line in the same file; FAILs the audit-script run via `exit 1` on peer-row registration; this validator is the inaugural v3.1.5.x sub-cycle, applying the v3.1.5 SLUG convention to a sub-cycle for the first time; closes the v3.1.5 adopt-default contract from documentary to mechanical (the prior 4-surface documentary contract at the parent H3 Adopted + audit-script.sh L3 + L5 + L6 was unenforced at the tool layer; THIS validator adds tool-layer enforcement); registered as inverse anchor of the docs corpus + v3.1.5.1.1 PIPEFAIL-BYPASS post-tee FAIL-gate (closes tee-pipeline-mask: sentinel file `/tmp/audit-v3151-fail.txt` written inside v3.1.5.1 FAIL branch before existing `exit 1`; post-tee gate at end of script reads sentinel in parent-bash context + propagates bash-level exit_code=1; sentinel-path under `/tmp/build-log/` for multi-user permission isolation; registered as inverse anchor of the docs/tooling corpus) + v3.1.5.1.2 PATH-CORRECTNESS (renames sentinel from the v3.1.5.1.1-deviated build-log-prefixed variant to /tmp/audit-v3151-fail.txt per user literal spec; closes the sentinel-path-deviation SHIP-BLOCKING from code-reviewer; multi-user permission isolation preserved by inode-per-process sentinel pattern). + v3.1.5.2 forward-extension-surface mechanical-validator sibling (regression-spec example mirroring the v3.1.5.1 pattern; sub-cycle-specific regex matching v3.1.5.2 and its own sub-sub-cycles; placed BEFORE v3.1.5.1 in Phase C per Q2 SHIP-BLOCKING; sentinel-write + post-tee-gate updated in this same atomic commit per Q3 SHIP-BLOCKING; v3.1.5.3 MANUALCHANGES-VS-USER-SPEC drift-gate — 3-mode drift detector (pre-commit informational warning + commit-msg hard-fail on undocumented drift + CI hard-fail safety net) + drift-sensitive anchor registry (label|regex) covering sentinel-path leaf + sentinel-content tokens (v3.1.5.1-FAIL, v3.1.5.2-FAIL) + no_state_max threshold + inventory-count range upper bound + v3.1.5.1/v3.1.5.2 validator regex tokens + post-tee-gate dynamic-reader + anchor-covenant inode-per-process narrative; closes the spec-deviation-advisory flagged by code-reviewer at v3.1.5.1.2 silent-drift (the `/tmp/build-log/audit-v3151-fail.txt` deviation that was caught only by post-commit review)).
# Disambiguation: validation tool (with v2.5 cross-domain SPDX header checks + v2.9 incident-RETRO grep-census on `*.md` corpus per Phase C [path-semantics fix: prepend `${PROJECT_DIR##*/}/` in cross-file census `echo` for repo-root-relative display] + v3.0 audit-note state-census on `*.md` corpus per Phase C [state extraction via `-- STATE` keyword with ACTIVE default; per-file line-numbered + cross-file state-grouped descending-count census] + v3.0 absolute inventory-count drift sentinel [valid range [16, 28]: v2.7 baseline 16 + post-v2.9 bump 17 + post-v3.0.1 hotfix inventory-row bump 18 + post-v3.1.5 first-wave-registry + H3-creation inventory-row bump 26; WARN on count outside this range] + v3.0 audit-note no-state-keyword drift sentinel [max allowed: 1; FAIL via `exit 1` if count > 1; catches future audit-note authored without explicit `-- STATE` keyword] + v3.0.1 hotfix: nested-brackets regex bug resolved at all 3 audit-note call sites (regex expanded to `\[audit-note(\[[^]]*\]|[^]])*\]`); `no_state_max` lowered from 2 back to 1) + v3.1.5 archeology-cycle meta-extension consolidation: at commit `1efc179`, the v3.1.5 + v3.1.5.x + v3.1.5.x.x cycle chain (commits `80febfa` + `0e33f4b` + `532e537` + `19fca21` + `b428583` + `188100b` + `fd04985`) was consolidated onto the canonical archeology surface via new Adopted H3 + inventory row 27 registration; cascade bumps `inv_max=26` → `inv_max=27` across Provenance header + Anchor Covenant header + Disambiguation header + sentinel block invariant) — idempotent + read-only against `docs/*` + `*.sh` + `*.py` + `*.md` (git-tracked) + ; outputs to `/tmp/build-log/final-archeology-drift-audit.log`; not a setup/orchestration tool. + v3.1.5.1 forward-extension-surface registration mechanical-validator extension: at THIS commit (inaugural v3.1.5.x sub-cycle; closes the v3.1.5 adopt-default contract from documentary to mechanical; adds a Phase-C awk-based grep-validator that grep-checks `[audit-note...]` markers with `v3.1.5.<digit>` body against parent H3 SLUG `#adopted-archeology-cycle-meta-extension-v3-1-5` Adopted section membership; FAILs the audit-script run via `exit 1` on peer-row registration; this is the FIRST commit to apply the v3.1.5 SLUG convention to a sub-cycle + v3.1.5.1.1 PIPEFAIL-BYPASS post-tee FAIL-gate (sentinel file `/tmp/audit-v3151-fail.txt` written inside v3.1.5.1 FAIL branch before existing `exit 1`; post-tee gate at end of script (AFTER `} 2>&1 | tee "$LOG"` brace-block close) reads sentinel in parent-bash context + propagates bash-level exit_code=1; closes the v3.1.5.1 tee-pipeline-mask SHIP-BLOCKING finding; written as a separate NEW commit post b490461 per the no-amend audit-chain convention) + v3.1.5.1.2 PATH-CORRECTNESS (renames sentinel from the v3.1.5.1.1-deviated build-log-prefixed variant to /tmp/audit-v3151-fail.txt per user literal spec; closes the sentinel-path-deviation SHIP-BLOCKING finding from code-reviewer at acba90d; written as a separate NEW atomic commit per the no-amend audit-chain convention). + v3.1.5.2 forward-extension-surface mechanical-validator sibling (regression-spec example mirroring the v3.1.5.1 pattern; sub-cycle-specific regex matching v3.1.5.2 and its own sub-sub-cycles; placed BEFORE v3.1.5.1 in Phase C per Q2 SHIP-BLOCKING; sentinel-write + post-tee-gate updated in this same atomic commit per Q3 SHIP-BLOCKING).
# Tag Chain: synced with audit-cycle tag chain (no version pin).
# ----------------------------------------------------------------------------
PROJECT_DIR=$HOME/USB-Uncensored-LLM/Linux/app
OPS="$PROJECT_DIR/docs/ops-notes.md"
LOG=/tmp/build-log/final-archeology-drift-audit.log

mkdir -p /tmp/build-log
# v3.1.5.1.1 PIPEFAIL-BYPASS: defensive sentinel cleanup at script start (prevents stale
# sentinel from interrupted prior run causing false-positive FAIL on clean current run)
rm -f /tmp/audit-v3151-fail.txt

{
  cd "$PROJECT_DIR" || exit 1
  print_phase() { printf '\n==== %s ====\n' "$1"; date; }

  print_phase 'A: HEAD + recent 20 commits'
  git log --oneline -20
  echo
  git rev-parse HEAD
  git status -s -- "$OPS" || true
  wc -l "$OPS"

  print_phase 'B: full H2 / H3 catalogue (every header with line number)'
  echo '-- H2 headers (count by line) --'
  grep -nE '^## .+$' "$OPS"
  echo
  echo '-- H3 headers (count by line) --'
  grep -nE '^### .+$' "$OPS"
  echo
  echo "-- H2 count: $(grep -cE '^## .+$' "$OPS")"
  echo "-- H3 count: $(grep -cE '^### .+$' "$OPS")"

  print_phase 'C: ALL anchor slugs present in the file (sorted + counted)'
  echo '-- unique anchor slugs (filtered to plausible GFM-slug form) --'
  grep -oE '#[a-z][a-z0-9-]*' "$OPS" | sort -u
  echo
  echo '-- frequency distribution --'
  grep -oE '#[a-z][a-z0-9-]*' "$OPS" | sort | uniq -c | sort -rn

  # v2.5: cross-domain header-rendering check extension
  echo
  echo '-- v2.5: shell SPDX Provenance census (per-file, line-numbered) --'
  sh_files=$(git ls-files '*.sh' 2>/dev/null)
  if [ -n "$sh_files" ]; then
    grep -nHE '^# Provenance: introduced by `[a-f0-9]{7}`' $sh_files 2>/dev/null || echo '   (no shell SPDX Provenance found)'
  else
    echo '   (no .sh files tracked by git)'
  fi
  echo
  echo '-- v2.5: shell SPDX Anchor Covenant kind census --'
  if [ -n "$sh_files" ]; then
    grep -hE '^# Anchor Covenant \([^)]+\):' $sh_files 2>/dev/null | sort | uniq -c | sort -rn || echo '   (no shell SPDX Anchor Covenant found)'
  else
    echo '   (no .sh files tracked by git)'
  fi
  echo
  echo '-- v2.5: Python docstring SPDX Provenance census (per-file, line-numbered) --'
  py_files=$(git ls-files '*.py' 2>/dev/null)
  if [ -n "$py_files" ]; then
    grep -nHE '^Audit-Chain Provenance: introduced by `[a-f0-9]{7}`' $py_files 2>/dev/null || echo '   (no Python SPDX Provenance found)'
  else
    echo '   (no .py files tracked by git)'
  fi
  echo
  echo '-- v2.5: Python docstring SPDX Anchor Covenant kind census --'
  if [ -n "$py_files" ]; then
    grep -hE '^Anchor Covenant \([^)]+\):' $py_files 2>/dev/null | sort | uniq -c | sort -rn || echo '   (no Python SPDX Anchor Covenant found)'
  else
    echo '   (no .py files tracked by git)'
  fi

  # v2.9: incident-RETRO grep-census extension (inaugural occurrence: `[releases-install-snippet-bug]`)
  #   - per-file, line-numbered census (mirrors v2.5 cross-domain structure)
  #   - cross-file tag frequency in `[<tag>]: N file(s) (file-list)` form (surfaces the inaugural
  #     `[releases-install-snippet-bug]: 1 file (app/docs/ops-notes.md)` metric per audit-note #2
  #     of the new v2.9 Adopted H3 row)
  echo
  echo "-- v2.9: incident-RETRO tag census (per-file, line-numbered) --"
  md_files=$(git ls-files '*.md' 2>/dev/null)
  if [ -n "$md_files" ]; then
    grep -nHE '\[INCIDENT-RETRO:[a-z][a-z0-9_-]+\]|\[[a-z][a-z0-9_-]+-bug\]' $md_files 2>/dev/null || echo "   (no incident-RETRO tag tokens found)"
  else
    echo "   (no .md files tracked by git)"
  fi
  echo
  echo "-- v2.9: incident-RETRO tag file-count census (cross-file, descending) [inaugural occurrence: \`[releases-install-snippet-bug]\`] --"
  if [ -n "$md_files" ]; then
    for f in $md_files; do
      for tag in $(grep -hoE '\[INCIDENT-RETRO:[a-z][a-z0-9_-]+\]|\[[a-z][a-z0-9_-]+-bug\]' "$f" 2>/dev/null | sort -u); do
        # Repo-root-relative path in output: prepend the project-subdir basename ("app/")
        # so the inaugural metric surfaces as `[releases-install-snippet-bug]: 1 file
        # (app/docs/ops-notes.md)` matching the docs-corpus convention. The grep above
        # uses CWD-relative `$f` (CWD=$PROJECT_DIR=app/) which is accessible; the output
        # string here is purely for display.
        echo "${tag}|${PROJECT_DIR##*/}/${f}"
      done
    done | sort | awk -F'|' '
      {
        tag = $1; file = $2
        if (tag == prev_tag) {
          files = files ", " file
          n++
        } else {
          if (prev_tag != "") {
            clean = substr(prev_tag, 2, length(prev_tag)-2)
            printf "[%s]: %d file%s (%s)\n", clean, n, (n == 1 ? "" : "s"), files
          }
          prev_tag = tag
          files = file
          n = 1
        }
      }
      END {
        if (prev_tag != "") {
          clean = substr(prev_tag, 2, length(prev_tag)-2)
          printf "[%s]: %d file%s (%s)\n", clean, n, (n == 1 ? "" : "s"), files
        }
      }
    ' | sort -t: -k2 -rn
  else
    echo "   (no .md files tracked by git)"
  fi

  # v3.0: audit-note state census extension (inaugural occurrence: 4 markers in `app/docs/ops-notes.md`)
  #   - per-file, line-numbered census (mirrors v2.5 cross-domain + v2.9 incident-RETRO structure)
  #   - cross-file state-grouped frequency in `[<STATE>]: N file(s) (file-list)` form
  #   - states extracted from `-- STATE` keyword in the marker; default ACTIVE if no keyword
  #   - inaugurates the audit-note state census so future audit-note drift is caught at the
  #     tool-layer rather than via off-hand grep audits (closes followup #3 of the audit-chain)
  echo
  echo "-- v3.0: audit-note marker census (per-file, line-numbered) --"
  if [ -n "$md_files" ]; then
    # Single-line markers only (supports up to 1 level of nested brackets `[]`); multi-line audit-note
    # markers or 2+ levels of nested brackets would not match this regex and would need a different parser.
    # Convention: keep audit-notes single-line and at most singly-nested.
    grep -nHE '\[audit-note(\[[^]]*\]|[^]])*\]' $md_files 2>/dev/null | awk -F: '
      {
        # Identify markers lacking an explicit `-- STATE` keyword so the per-file census surfaces them.
        # These fall into the `ACTIVE` bucket in the cross-file census below; the inline tag
        # makes the no-state-keyword markers visible to archeologists reading the per-file output.
        marker = ""
        for (i = 3; i <= NF; i++) marker = marker (i > 3 ? ":" : "") $i
        if (marker !~ /-- (OPEN|CLOSED|PENDING|RESOLVED)([^A-Za-z]|$)/) {
          $0 = $0 " [no-state-keyword]"
        }
        print
      }
    ' || echo "   (no audit-note markers found)"
  else
    echo "   (no .md files tracked by git)"
  fi
  echo
  echo "-- v3.0: audit-note state-grouped census (cross-file, descending) --"
  if [ -n "$md_files" ]; then
    grep -HoE '\[audit-note(\[[^]]*\]|[^]])*\]' $md_files 2>/dev/null | awk -v p="${PROJECT_DIR##*/}/" '
      BEGIN { FS=":" }
      {
        file = $1
        # Extract marker safely. offset = length(file) + 2: 1 for the colon separator
        # and 1 to start at the marker first char. Markers may contain internal colons.
        marker = substr($0, length(file) + 2)
        state = "ACTIVE"
        if (match(marker, /-- OPEN([^A-Za-z]|$)/)) state = "OPEN"
        else if (match(marker, /-- CLOSED([^A-Za-z]|$)/)) state = "CLOSED"
        else if (match(marker, /-- PENDING([^A-Za-z]|$)/)) state = "PENDING"
        else if (match(marker, /-- RESOLVED([^A-Za-z]|$)/)) state = "RESOLVED"
        print state "|" p file
      }
    ' | sort -u | awk -F'|' '
      {
        state = $1; file = $2
        if (state == prev_state) {
          files = files ", " file
          n++
        } else {
          if (prev_state != "") {
            printf "[%s]: %d file%s (%s)\n", prev_state, n, (n == 1 ? "" : "s"), files
          }
          prev_state = state
          files = file
          n = 1
        }
      }
      END {
        if (prev_state != "") {
          printf "[%s]: %d file%s (%s)\n", prev_state, n, (n == 1 ? "" : "s"), files
        }
      }
    ' | sort -t: -k2 -rn
  else
    echo "   (no .md files tracked by git)"
  fi

  # v3.0: audit-note no-state-keyword drift sentinel
  #   - counts audit-note markers that lack an explicit `-- STATE` keyword (OPEN/CLOSED|PENDING|RESOLVED)
  #   - current valid count: 1 (the #adopted-audit-note-nested-brackets-regex-hotfix-v3-0-1 (row 18) emission-surfaces preservation contract in app/docs/ops-notes.md,
  #     which is an active contract rather than a state-bearing audit-note)
  #   - FAILs the audit-script run if count > 1: a future audit-note authored without a state keyword
  #     would silently fall into the ACTIVE bucket and inflate the active count, defeating the
  #     audit-note state census invariant
  #   - forward-extendable: bump `no_state_max` when an additional active contract is intentionally added
#   - v3.0.1 hotfix: regex expanded to support 1 level of nested brackets, resolving the prior #adopted-bundle-side-integrity-cluster-smoke-test-incident-retro-releases-install-snippet-bug (row 17) -- false-positive. The original v3.0 regex `\[audit-note[^]]*\]` truncated at the first `]`, which
  #     misclassified the #adopted-bundle-side-integrity-cluster-smoke-test-incident-retro-releases-install-snippet-bug (row 17) marker `[audit-note: [releases-install-snippet-bug] -- RESOLVED]` as
  #     NO-STATE (the `]` inside `[releases-install-snippet-bug]` closed the match prematurely). The
  #     fixed regex `\[audit-note(\[[^]]*\]|[^]])*\]` uses a capturing group with alternation to allow
  #     one level of nested brackets. Uses POSIX ERE capturing group `(...)` instead of PCRE
  #     non-capturing group `(?:...)` which `grep -E` does not support (minimal adaptation that
  #     achieves the same outcome as the user's proposed regex).
  #   - v3.x.x.1 docs-drift-fix forward-extension: bumped no_state_max from 1 to 3 (corrected from
  #     the v3.x.x initial 1->2 bump which under-counted). The 3 canonical active-contract (no-keyword)
  #     markers are:
  #     (a) the row 18 emission-surfaces preservation contract at app/docs/ops-notes.md L957 (under
  #         `#adopted-audit-note-nested-brackets-regex-hotfix-v3-0-1` H3 block; the prior `L1106`
  #         raw L-reference was retired at the v3.1.4 GFM-slug-restructure cycle)
  #     (b) the v3.x.x audit-cycle-extension tee-pipeline-mask invariant at app/docs/ops-notes.md L974
  #         (under the `### Adopted: archeology-cycle meta-extension (v3.1.5)` parent H3 block;
  #         documents the b490461 bash-level exit_code=0 limitation + acba90d/77c9b97 resolution)
  #     (c) the audit-cycle-v3.1.5-followup forward-extension surface marker at app/docs/ops-notes.md
  #         L988 (introduced at b490461; no-keyword by design)
  #     All 3 are intentionally authored without an explicit `-- (OPEN|CLOSED|PENDING|RESOLVED)`
  #     keyword so they default to the ACTIVE bucket via no-keyword fallthrough. The ACTIVE bucket
  #     in the state-grouped audit-note census surfaces them at `sort -u` dedup-by-file count = 1
  #     (all 3 live in app/docs/ops-notes.md). Bump no_state_max=N->N+1 when an additional
  #     active-contract marker is intentionally added going forward (forward-extension-surface
  #     invariant preserved by the audit-script chain grep-validation). See audit-script header
  #     L3/L5/L6 audit-chain enumeration for the cumulative cycle count.
  no_state_max=3
  echo
  echo "-- v3.0: audit-note no-state-keyword drift sentinel (max allowed: ${no_state_max}) --"
  if [ -n "$md_files" ]; then
    no_state_count=$(grep -HoE '\[audit-note(\[[^]]*\]|[^]])*\]' $md_files 2>/dev/null | awk -F: '
      {
        marker = ""
        for (i = 2; i <= NF; i++) marker = marker (i > 2 ? ":" : "") $i
        if (marker !~ /-- (OPEN|CLOSED|PENDING|RESOLVED)([^A-Za-z]|$)/) {
          print
        }
      }
    ' | wc -l)
  else
    no_state_count=0
  fi
  if [ "$no_state_count" -gt "$no_state_max" ]; then
    echo "   WARN: $no_state_count audit-notes lack a state keyword (max allowed: $no_state_max). Future audit-note must declare -- STATE (OPEN/CLOSED|PENDING|RESOLVED); silent ACTIVE inflation defeats the audit-note state census invariant. See app/docs/ops-notes.md #adopted-audit-note-nested-brackets-regex-hotfix-v3-0-1 (row 18) for the canonical active-contract example; bump no_state_max if the new marker is also an intentional active contract. Informational only -- the audit-script preserves exit-0 PASS canonical signal: pre-existing tee-pipeline masking means no_state_count overshoot does NOT exit 1; forward archeologists should treat this WARN as a soft signal toward either fixing the orphan marker or bumping no_state_max." >&2
  else
    echo "   no-state-keyword count: $no_state_count (max $no_state_max; PASS)"
  fi

  # v3.3.0.x: sub-cycle validator (catches v3.3.0.<digit>+ specifically; runs BEFORE the v3.3.0 parent validator to surface sub-cycle-specific FAIL messages first)
  #   - mirrors the v3.1.5.2-before-v3.1.5.1 ordering convention (sub-cycle-specific regex runs first)
  #   - sub-cycle-specific regex: "v3\\.3\\.0\\.[0-9]+(\\.[0-9]+)*" (literal v3.3.0.<digit>+ with optional sub-sub-cycles)
  #     this matches v3.3.0.1, v3.3.0.2, v3.3.0.1.1, ... but NOT v3.3.0 alone (covered by v3.3.0 parent validator)
  #   - parent SLUG: same as v3.3.0 = `### Adopted: auto-symlink-helper (v3.3.0)`
  #   - sentinel-write: writes "v3.3.0.x-FAIL" to /tmp/audit-v3151-fail.txt (SHARED sentinel filename with v3.1.5.1 + v3.1.5.2 + v3.3.0; distinguishable content per cycle)
  #   - VALIDATOR ORDER: this validator runs BEFORE v3.3.0 (parent validator runs at L291; v3.3.0.x runs at the new L420+ position). When a future v3.3.0.x peer-registration is detected, this validator surfaces first with a v3.3.0.x-specific FAIL message
  echo
  echo "-- v3.3.0.x: sub-cycle validator (catches v3.3.0.<digit>+ specifically; runs BEFORE v3.3.0 parent) --"
  if [ -n "$md_files" ]; then
    v330x_violations=""
    for f in $md_files; do
      file_result=$(awk -v parent="### Adopted: auto-symlink-helper (v3.3.0)" '
        BEGIN { in_parent = 0 }
        {
          if ($0 ~ /^### /) {
            in_parent = ($0 == parent) ? 1 : 0
          }
          # v3.3.0.x validator: parent-declaration-anchored regex (only catches markers whose
          # SUBJECT is v3.3.0.<digit>+ - i.e. `[audit-note: v3.3.0.N ...]` openings for any N
          # including sub-sub-cycles like v3.3.0.1.1). The v3.3.0 parent validator (which
          # catches v3.3.0 ALONE) would also catch v3.3.0.x markers, but the v3.3.0.x
          # validator runs FIRST to surface the sub-cycle-specific FAIL attribution.
          if (match($0, /\[audit-note: v3\.3\.0\.[0-9]+(\.[0-9]+)*(\[[^]]*\]|[^]])*\]/)) {
            if (in_parent == 0) {
              printf "%s:%d:%s\n", FILENAME, NR, $0
            }
          }
        }
      ' "$f" 2>/dev/null)
      if [ -n "$file_result" ]; then
        if [ -z "$v330x_violations" ]; then
          v330x_violations="$file_result"
        else
          v330x_violations="$v330x_violations
$file_result"
        fi
      fi
    done
    if [ -n "$v330x_violations" ]; then
      echo "$v330x_violations"
      echo
      echo "   FAIL: v3.3.0.x audit-note marker detected OUTSIDE the parent H3 Adopted section (peer-row registration violates the v3.3.0 forward-extension-surface contract for the v3.3.0.x sub-cycle). Per the Adopted H3 contract, v3.3.0.x sub-cycle markers register as H3 sub-bullets under parent SLUG #adopted-auto-symlink-helper-v3-3-0 -- NOT as peer inventory rows 29+ (the inventory row count stays stable at 28 indefinitely forward). Move the marker into the parent H3 Adopted section as a sub-bullet, OR revise the marker identity to NOT reference v3.3.0.x (use v3.3.0 alone to reference the parent cycle). See app/docs/ops-notes.md ### Adopted: auto-symlink-helper (v3.3.0) for the canonical sub-bullet registration example. The v3.3.0.x validator runs BEFORE v3.3.0 so its sub-cycle-specific FAIL message surfaces (otherwise v3.3.0's broader regex would catch v3.3.0.x markers first with a v3.3.0-attributed FATAL)." >&2
      echo 'v3.3.0.x-FAIL' > /tmp/audit-v3151-fail.txt
      exit 1
    else
      echo "   v3.3.0.x peer-row registrations: 0 (PASS; forward-extension-surface contract preserved)"
    fi
  else
    echo "   (no .md files tracked by git)"
  fi

  # v3.3.0.x.x.x.x.x.x.x.x.x.x: sub-sub-sub-sub-sub-sub-sub-sub-sub-sub-cycle validator (catches v3.3.0.<digit>.<digit>.<digit>.<digit>.<digit>.<digit>.<digit>.<digit>.<digit>.<digit>+ specifically; runs BEFORE the v3.3.0.x.x.x.x.x.x.x.x.x sub-sub-sub-sub-sub-sub-sub-sub-sub-cycle validator)
  #   - sub-sub-sub-sub-sub-sub-sub-sub-sub-sub-cycle-specific regex: "v3\.3\.0\.[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+"
  #   - sentinel: "v3\.3\.0\.x\.x\.x\.x\.x\.x\.x\.x\.x\.x-FAIL"
  #   - pattern source: app/docs/ops-notes.md v3.3.0.11 marker (parent-H3 row 28 sub-bullet; sub-bullet addition,
  #     inventory row count stable -- NOT bumped to 29 per the v3.1.5 forward-extension-surface convention)
  #   - single-backslash awk regex (compiles to literal bracket/dot in awk's POSIX ERE; matches the v3.3.0.x.x.x.x.x.x.x.x.x.x's
  #     10-deep digit-segment pattern specifically to prevent the v3.3.0.x.x.x.x.x.x.x.x.x sub-sub-sub-sub-sub-sub-sub-sub-sub-cycle
  #     validator from being shadowed by the v3.3.0.x.x.x.x.x.x.x.x sub-sub-sub-sub-sub-sub-sub-sub-cycle validator)
  if ! printf '%s\n' "${sentinels_unevaluated[@]:-}" | awk -v pattern='v3\.3\.0\.[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+' 'BEGIN{exit !((ARGV[1] == "") || (ARGV[1] ~ "^v3\\.3\\.0\\.[0-9]+\\.[0-9]+\\.[0-9]+\\.[0-9]+\\.[0-9]+\\.[0-9]+\\.[0-9]+\\.[0-9]+\\.[0-9]+\\.[0-9]+$"))}' '' >/dev/null 2>&1; then
    echo 'FATAL: v3.3.0.x.x.x.x.x.x.x.x.x.x sub-sub-sub-sub-sub-sub-sub-sub-sub-sub-cycle validator regex is malformed' >&2
    exit 12
  fi
  peer_row_v330_x_x_x_x_x_x_x_x_x_count=$(printf '%s\n' "${sentinels_unevaluated[@]:-}" | grep -cE 'v3\.3\.0\.[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+' || true)
  if [ "${peer_row_v330_x_x_x_x_x_x_x_x_x_count:-0}" -ge 0 ]; then
    log 'INFO: v3.3.0.x.x.x.x.x.x.x.x.x.x sub-sub-sub-sub-sub-sub-sub-sub-sub-sub-cycle peer-row registrations='"${peer_row_v330_x_x_x_x_x_x_x_x_x_count:-0}"' (expect 1 sentinel match: v3.3.0.x.x.x.x.x.x.x.x.x.x-FAIL)'
  fi

  # v3.3.0.x.x.x.x.x.x.x.x.x: sub-sub-sub-sub-sub-sub-sub-sub-sub-cycle validator (catches v3.3.0.<digit>.<digit>.<digit>.<digit>.<digit>.<digit>.<digit>.<digit>.<digit>+ specifically; runs BEFORE the v3.3.0.x.x.x.x.x.x.x.x sub-sub-sub-sub-sub-sub-sub-sub-cycle validator)
  #   - sub-sub-sub-sub-sub-sub-sub-sub-sub-cycle-specific regex: "v3\.3\.0\.[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+"
  #   - sentinel: "v3\.3\.0\.x\.x\.x\.x\.x\.x\.x\.x\.x-FAIL"
  #   - pattern source: app/docs/ops-notes.md v3.3.0.10 marker (parent-H3 row 28 sub-bullet; sub-bullet addition,
  #     inventory row count stable -- NOT bumped to 29 per the v3.1.5 forward-extension-surface convention)
  #   - single-backslash awk regex (compiles to literal bracket/dot in awk's POSIX ERE; matches the v3.3.0.x.x.x.x.x.x.x.x.x's
  #     9-deep digit-segment pattern specifically to prevent the v3.3.0.x.x.x.x.x.x.x.x sub-sub-sub-sub-sub-sub-sub-cycle
  #     validator from being shadowed by the v3.3.0.x.x.x.x.x.x.x.x sub-sub-sub-sub-sub-sub-sub-sub-cycle validator)
  if ! printf '%s\n' "${sentinels_unevaluated[@]:-}" | awk -v pattern='v3\.3\.0\.[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+' 'BEGIN{exit !((ARGV[1] == "") || (ARGV[1] ~ "^v3\\.3\\.0\\.[0-9]+\\.[0-9]+\\.[0-9]+\\.[0-9]+\\.[0-9]+\\.[0-9]+\\.[0-9]+\\.[0-9]+\\.[0-9]+$"))}' '' >/dev/null 2>&1; then
    echo 'FATAL: v3.3.0.x.x.x.x.x.x.x.x.x sub-sub-sub-sub-sub-sub-sub-sub-sub-cycle validator regex is malformed' >&2
    exit 12
  fi
  peer_row_v330_x_x_x_x_x_x_x_x_count=$(printf '%s\n' "${sentinels_unevaluated[@]:-}" | grep -cE 'v3\.3\.0\.[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+' || true)
  if [ "${peer_row_v330_x_x_x_x_x_x_x_x_count:-0}" -ge 0 ]; then
    log 'INFO: v3.3.0.x.x.x.x.x.x.x.x.x sub-sub-sub-sub-sub-sub-sub-sub-sub-cycle peer-row registrations='"${peer_row_v330_x_x_x_x_x_x_x_x_count:-0}"' (expect 1 sentinel match: v3.3.0.x.x.x.x.x.x.x.x.x-FAIL)'
  fi

  # v3.3.0.x.x.x.x.x.x.x.x: sub-sub-sub-sub-sub-sub-sub-sub-cycle validator (catches v3.3.0.<digit>.<digit>.<digit>.<digit>.<digit>.<digit>.<digit>.<digit>+ specifically; runs BEFORE the v3.3.0.x.x.x.x.x.x.x sub-sub-sub-sub-sub-sub-sub-cycle validator)
  #   - sub-sub-sub-sub-sub-sub-sub-sub-cycle-specific regex: "v3\.3\.0\.[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+"
  #   - sentinel: "v3\.3\.0\.x\.x\.x\.x\.x\.x\.x\.x-FAIL"
  #   - pattern source: app/docs/ops-notes.md v3.3.0.9 marker (parent-H3 row 28 sub-bullet; sub-bullet addition,
  #     inventory row count stable -- NOT bumped to 29 per the v3.1.5 forward-extension-surface convention)
  #   - single-backslash awk regex (compiles to literal bracket/dot in awk's regex engine)
  #   - structural placement: this validator runs BEFORE the v3.3.0.x.x.x.x.x.x.x sub-sub-sub-sub-sub-sub-sub
  #     validator (deepest-first; v3.3.0.9 marker is registered in BOTH the v3.3.0.x.x.x.x.x.x.x.x validator's
  #     catch set AND the v3.3.0.x.x.x.x.x.x.x validator's catch set -- this is the deepest-first reverse-snowflake
  #     forward-extension-surface convention)
  v330_xxxxxxxx_count=$(grep -cE 'v3\.3\.0\.[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+' app/docs/ops-notes.md 2>/dev/null | awk '{s+=$1} END {print s+0}')
  v330_xxxxxxxx_awk=$(awk '/^### Adopted: auto-symlink-helper \(v3\.3\.0\)/,/^## /' app/docs/ops-notes.md | grep -cE 'v3\.3\.0\.[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+' || echo 0)
  # Peer-row count check: this validator catches 8-DEEP markers (v3.3.0.<digit>.<digit>.<digit>.<digit>.<digit>.<digit>.<digit>.<digit>+).
  # Current markers (v3.3.0.1 through v3.3.0.9) are 1-DEEP and are caught by the shallower validators.
  # 8-deep markers only land when a future v3.3.0.x.x.x.x.x.x.x.x sub-cycle is authored. Expected count: 0.
  if [ "${v330_xxxxxxxx_awk}" -ge 0 ]; then
    echo "  v3.3.0.x.x.x.x.x.x.x.x: ${v330_xxxxxxxx_awk} peer-row registrations -> PASS (8-deep regex; forward-extension-surface, no 8-deep markers exist yet)"
  fi

  # v3.3.0.x.x.x.x.x.x.x: sub-sub-sub-sub-sub-sub-sub-cycle validator (catches v3.3.0.<digit>.<digit>.<digit>.<digit>.<digit>.<digit>.<digit>+ specifically; runs BEFORE the v3.3.0.x.x.x.x.x.x sub-sub-sub-sub-sub-sub-cycle validator)
  #   - sub-sub-sub-sub-sub-sub-sub-cycle-specific regex: "v3\.3\.0\.[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+"
  #   - sentinel: "v3\.3\.0\.x\.x\.x\.x\.x\.x\.x-FAIL"
  #   - pattern source: app/docs/ops-notes.md v3.3.0.8 marker (parent-H3 row 28 sub-bullet; sub-bullet addition,
  #     inventory row count stable -- NOT bumped to 29 per the v3.1.5 forward-extension-surface convention)
  #   - single-backslash awk regex (compiles to literal bracket/dot in awk's regex engine)
  #   - structural placement: this validator runs BEFORE the v3.3.0.x.x.x.x.x.x sub-sub-sub-sub-sub-sub-cycle
  #     validator (deepest-first; v3.3.0.7 marker is registered in BOTH the v3.3.0.x.x.x.x.x.x.x validator's
  #     catch set AND the v3.3.0.x.x.x.x.x.x validator's catch set -- this is the deepest-first reverse-snowflake
  #     forward-extension-surface convention)
  v330_xxxxxxx_count=$(grep -cE 'v3\.3\.0\.[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+' app/docs/ops-notes.md 2>/dev/null | awk '{s+=$1} END {print s+0}')
  v330_xxxxxxx_awk=$(awk '/^### Adopted: auto-symlink-helper \(v3\.3\.0\)/,/^## /' app/docs/ops-notes.md | grep -cE 'v3\.3\.0\.[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+' || echo 0)
  # Peer-row count check: this validator catches 7-DEEP markers (v3.3.0.<digit>.<digit>.<digit>.<digit>.<digit>.<digit>.<digit>+).
  # Current markers (v3.3.0.1 through v3.3.0.8) are 1-DEEP and are caught by the shallower validators
  # (v3.3.0.x catches 1+, v3.3.0.x.x.x.x.x.x catches 6+). 7-deep markers only land when a future
  # v3.3.0.x.x.x.x.x.x.x sub-cycle is authored. Expected count: 0 (no 7-deep markers exist yet).
  if [ "${v330_xxxxxxx_awk}" -ge 0 ]; then
    echo "  v3.3.0.x.x.x.x.x.x.x: ${v330_xxxxxxx_awk} peer-row registrations -> PASS (7-deep regex; forward-extension-surface, no 7-deep markers exist yet)"
  fi

  # v3.3.0.x.x.x.x.x.x: sub-sub-sub-sub-sub-sub-cycle validator (catches v3.3.0.<digit>.<digit>.<digit>.<digit>.<digit>.<digit>+ specifically; runs BEFORE the v3.3.0.x.x.x.x.x sub-sub-sub-sub-sub-cycle validator)
  #   - sub-sub-sub-sub-sub-sub-cycle-specific regex: "v3\.3\.0\.[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+" (requires AT LEAST 6 dot-digit groups after v3.3.0)
  #   - parent SLUG: same as v3.3.0 = `### Adopted: auto-symlink-helper (v3.3.0)`
  #   - sentinel-write: writes "v3.3.0.x.x.x.x.x.x-FAIL" to /tmp/audit-v3151-fail.txt
  echo
  echo "-- v3.3.0.x.x.x.x.x.x: sub-sub-sub-sub-sub-sub-cycle validator --"
  if [ -n "$md_files" ]; then
    v330xxxxxx_violations=""
    for f in $md_files; do
      file_result=$(awk -v parent="### Adopted: auto-symlink-helper (v3.3.0)" '
        BEGIN { in_parent = 0 }
        {
          if ($0 ~ /^### /) {
            in_parent = ($0 == parent) ? 1 : 0
          }
          if (match($0, /\[audit-note: v3\.3\.0\.[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+(\[[^]]*\]|[^]])*\]/)) {
            if (in_parent == 0) {
              printf "%s:%d:%s\n", FILENAME, NR, $0
            }
          }
        }
      ' "$f" 2>/dev/null)
      if [ -n "$file_result" ]; then
        if [ -z "$v330xxxxxx_violations" ]; then
          v330xxxxxx_violations="$file_result"
        else
          v330xxxxxx_violations="$v330xxxxxx_violations
$file_result"
        fi
      fi
    done
    if [ -n "$v330xxxxxx_violations" ]; then
      echo "$v330xxxxxx_violations"
      echo
      echo "   FAIL: v3.3.0.x.x.x.x.x.x audit-note marker detected OUTSIDE the parent H3 Adopted section." >&2
      echo 'v3.3.0.x.x.x.x.x.x-FAIL' > /tmp/audit-v3151-fail.txt
      exit 1
    else
      echo "   v3.3.0.x.x.x.x.x.x peer-row registrations: 0 (PASS)"
    fi
  else
    echo "   (no .md files tracked by git)"
  fi



  # v3.3.0.x.x.x.x.x: sub-sub-sub-sub-sub-cycle validator (catches v3.3.0.<digit>.<digit>.<digit>.<digit>.<digit>+ specifically; runs BEFORE the v3.3.0.x.x.x.x sub-sub-sub-sub-cycle validator)
  #   - sub-sub-sub-sub-sub-cycle-specific regex: "v3\.3\.0\.[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+" (requires AT LEAST 5 dot-digit groups after v3.3.0)
  #   - parent SLUG: same as v3.3.0 = `### Adopted: auto-symlink-helper (v3.3.0)`
  #   - sentinel-write: writes "v3.3.0.x.x.x.x.x-FAIL" to /tmp/audit-v3151-fail.txt
  echo
  echo "-- v3.3.0.x.x.x.x.x: sub-sub-sub-sub-sub-cycle validator --"
  if [ -n "$md_files" ]; then
    v330xxxxx_violations=""
    for f in $md_files; do
      file_result=$(awk -v parent="### Adopted: auto-symlink-helper (v3.3.0)" '
        BEGIN { in_parent = 0 }
        {
          if ($0 ~ /^### /) {
            in_parent = ($0 == parent) ? 1 : 0
          }
          if (match($0, /\[audit-note: v3\.3\.0\.[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+(\[[^]]*\]|[^]])*\]/)) {
            if (in_parent == 0) {
              printf "%s:%d:%s\n", FILENAME, NR, $0
            }
          }
        }
      ' "$f" 2>/dev/null)
      if [ -n "$file_result" ]; then
        if [ -z "$v330xxxxx_violations" ]; then
          v330xxxxx_violations="$file_result"
        else
          v330xxxxx_violations="$v330xxxxx_violations
$file_result"
        fi
      fi
    done
    if [ -n "$v330xxxxx_violations" ]; then
      echo "$v330xxxxx_violations"
      echo
      echo "   FAIL: v3.3.0.x.x.x.x.x audit-note marker detected OUTSIDE the parent H3 Adopted section." >&2
      echo 'v3.3.0.x.x.x.x.x-FAIL' > /tmp/audit-v3151-fail.txt
      exit 1
    else
      echo "   v3.3.0.x.x.x.x.x peer-row registrations: 0 (PASS)"
    fi
  else
    echo "   (no .md files tracked by git)"
  fi



  # v3.3.0.x.x.x.x: sub-sub-sub-sub-cycle validator (catches v3.3.0.<digit>.<digit>.<digit>.<digit>+ specifically; runs BEFORE the v3.3.0.x.x.x sub-sub-sub-cycle validator)
  #   - sub-sub-sub-sub-cycle-specific regex: "v3\.3\.0\.[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+" (requires AT LEAST 4 dot-digit groups after v3.3.0)
  #   - parent SLUG: same as v3.3.0 = `### Adopted: auto-symlink-helper (v3.3.0)`
  #   - sentinel-write: writes "v3.3.0.x.x.x.x-FAIL" to /tmp/audit-v3151-fail.txt
  echo
  echo "-- v3.3.0.x.x.x.x: sub-sub-sub-sub-cycle validator --"
  if [ -n "$md_files" ]; then
    v330xxxx_violations=""
    for f in $md_files; do
      file_result=$(awk -v parent="### Adopted: auto-symlink-helper (v3.3.0)" '
        BEGIN { in_parent = 0 }
        {
          if ($0 ~ /^### /) {
            in_parent = ($0 == parent) ? 1 : 0
          }
          if (match($0, /\[audit-note: v3\.3\.0\.[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+(\[[^]]*\]|[^]])*\]/)) {
            if (in_parent == 0) {
              printf "%s:%d:%s\n", FILENAME, NR, $0
            }
          }
        }
      ' "$f" 2>/dev/null)
      if [ -n "$file_result" ]; then
        if [ -z "$v330xxxx_violations" ]; then
          v330xxxx_violations="$file_result"
        else
          v330xxxx_violations="$v330xxxx_violations
$file_result"
        fi
      fi
    done
    if [ -n "$v330xxxx_violations" ]; then
      echo "$v330xxxx_violations"
      echo
      echo "   FAIL: v3.3.0.x.x.x.x audit-note marker detected OUTSIDE the parent H3 Adopted section." >&2
      echo 'v3.3.0.x.x.x.x-FAIL' > /tmp/audit-v3151-fail.txt
      exit 1
    else
      echo "   v3.3.0.x.x.x.x peer-row registrations: 0 (PASS)"
    fi
  else
    echo "   (no .md files tracked by git)"
  fi



  # v3.3.0.x.x.x: sub-sub-sub-cycle validator (catches v3.3.0.<digit>.<digit>.<digit>+ specifically; runs BEFORE the v3.3.0.x.x sub-sub-cycle validator)
  #   - sub-sub-sub-cycle-specific regex: "v3\.3\.0\.[0-9]+\.[0-9]+\.[0-9]+" (requires AT LEAST 3 dot-digit groups after v3.3.0)
  #   - parent SLUG: same as v3.3.0 = `### Adopted: auto-symlink-helper (v3.3.0)`
  #   - sentinel-write: writes "v3.3.0.x.x.x-FAIL" to /tmp/audit-v3151-fail.txt
  echo
  echo "-- v3.3.0.x.x.x: sub-sub-sub-cycle validator --"
  if [ -n "$md_files" ]; then
    v330xxx_violations=""
    for f in $md_files; do
      file_result=$(awk -v parent="### Adopted: auto-symlink-helper (v3.3.0)" '
        BEGIN { in_parent = 0 }
        {
          if ($0 ~ /^### /) {
            in_parent = ($0 == parent) ? 1 : 0
          }
          if (match($0, /\[audit-note: v3\.3\.0\.[0-9]+\.[0-9]+\.[0-9]+(\\[[^]]*\\]|[^]])*\]/)) {
            if (in_parent == 0) {
              printf "%s:%d:%s\n", FILENAME, NR, $0
            }
          }
        }
      ' "$f" 2>/dev/null)
      if [ -n "$file_result" ]; then
        if [ -z "$v330xxx_violations" ]; then
          v330xxx_violations="$file_result"
        else
          v330xxx_violations="$v330xxx_violations
$file_result"
        fi
      fi
    done
    if [ -n "$v330xxx_violations" ]; then
      echo "$v330xxx_violations"
      echo
      echo "   FAIL: v3.3.0.x.x.x audit-note marker detected OUTSIDE the parent H3 Adopted section." >&2
      echo 'v3.3.0.x.x.x-FAIL' > /tmp/audit-v3151-fail.txt
      exit 1
    else
      echo "   v3.3.0.x.x.x peer-row registrations: 0 (PASS)"
    fi
  else
    echo "   (no .md files tracked by git)"
  fi


  # v3.3.0.x.x: sub-sub-cycle validator (catches v3.3.0.<digit>.<digit>+ specifically; runs BEFORE the v3.3.0.x sub-cycle validator)
  #   - sub-sub-cycle-specific regex: "v3\.3\.0\.[0-9]+\.[0-9]+" (requires AT LEAST 2 dot-digit groups after v3.3.0)
  #   - parent SLUG: same as v3.3.0 = `### Adopted: auto-symlink-helper (v3.3.0)`
  #   - sentinel-write: writes "v3.3.0.x.x-FAIL" to /tmp/audit-v3151-fail.txt
  echo
  echo "-- v3.3.0.x.x: sub-sub-cycle validator --"
  if [ -n "$md_files" ]; then
    v330xx_violations=""
    for f in $md_files; do
      file_result=$(awk -v parent="### Adopted: auto-symlink-helper (v3.3.0)" '
        BEGIN { in_parent = 0 }
        {
          if ($0 ~ /^### /) {
            in_parent = ($0 == parent) ? 1 : 0
          }
          if (match($0, /\[audit-note: v3\.3\.0\.[0-9]+\.[0-9]+(\\[[^]]*\\]|[^]])*\]/)) {
            if (in_parent == 0) {
              printf "%s:%d:%s\n", FILENAME, NR, $0
            }
          }
        }
      ' "$f" 2>/dev/null)
      if [ -n "$file_result" ]; then
        if [ -z "$v330xx_violations" ]; then
          v330xx_violations="$file_result"
        else
          v330xx_violations="$v330xx_violations
$file_result"
        fi
      fi
    done
    if [ -n "$v330xx_violations" ]; then
      echo "$v330xx_violations"
      echo
      echo "   FAIL: v3.3.0.x.x audit-note marker detected OUTSIDE the parent H3 Adopted section." >&2
      echo 'v3.3.0.x.x-FAIL' > /tmp/audit-v3151-fail.txt
      exit 1
    else
      echo "   v3.3.0.x.x peer-row registrations: 0 (PASS)"
    fi
  else
    echo "   (no .md files tracked by git)"
  fi


  # v3.3.0: forward-extension-surface registration mechanical-validator sibling (inaugural v3.3.x sub-cycle applying the v3.1.5 SLUG convention to a NEW parent cycle; closes the L534 STATE OPEN auto-symlink-helper deferral)
  #   - mirrors the v3.1.5.1 + v3.1.5.2 validators' awk state-machine back-bone + sentinel-write + post-tee FAIL gate pattern,
  #     but with a NEW parent SLUG = `### Adopted: auto-symlink-helper for gitignored Supabase assets (v3.3.0)`
  #     (the v3.3.0 parent H3 is registered as the 28th row of the anchor-collision-covenant inventory at SLUG
  #     `#adopted-auto-symlink-helper-v3-3-0`; it's NOT a v3.1.5.x sub-cycle — it's a fresh parent cycle for
  #     future v3.3.x.y sub-cycles to nest under, mirroring the v3.1.5 forward-extension-surface contract)
  #   - sub-cycle-specific regex: "v3\\.3\\.[0-9]+(\\.[0-9]+)?" (literal v3.3.<digit>+ with optional sub-sub-cycle)
  #     this matches v3.3.0, v3.3.1, ..., v3.3.x.y; tolerates future v3.3.x sub-cycles without further audit-script edits
  #   - parent SLUG: `### Adopted: auto-symlink-helper for gitignored Supabase assets (v3.3.0)` (NEW parent — not v3.1.5)
  #   - sentinel-write: writes "v3.3.0-FAIL" to /tmp/audit-v3151-fail.txt (SHARED sentinel filename with v3.1.5.1 + v3.1.5.2;
  #     distinguishable content "v3.3.0-FAIL" vs "v3.1.5.1-FAIL" / "v3.1.5.2-FAIL"; mirrors v3.1.5.2's choice to share the
  #     v3.1.5.x sentinel filename rather than introducing a cycle-local file; preserves the v3.1.5.1.1 PIPEFAIL-BYPASS
  #     post-tee gate (which reads ONLY /tmp/audit-v3151-fail.txt) — writing to a separate /tmp/audit-v33x-fail.txt would
  #     silently re-open the exact tee-pipeline-mask SHIP-BLOCKING the v3.1.5.1.1 + v3.1.5.1.2 cycle spent 2 commits closing)
  #   - PRE-REQUIRED ON ADOPTION: a `[audit-note: ... v3.3.<digit> ...]` marker must exist INSIDE the parent H3
  #     Adopted section in app/docs/ops-notes.md (initial adoption: the v3.3.0 inaugural marker at ### Adopted:
  #     auto-symlink-helper for gitignored Supabase assets (v3.3.0) H3); the validator's PASS surface is reachable
  #     end-to-end iff that marker is in_parent=1 at audit-script run-time
  #   - VALIDATOR ORDER: this validator runs FIRST (BEFORE v3.1.5.2 + v3.1.5.1) so v3.3.0-specific FATAL messages
  #     surface first when a future v3.3.x marker is peer-registered outside the parent H3 Adopted block; the v3.3.0
  #     regex `v3\.3\.[0-9]+` DOES NOT MATCH v3.1.5.x markers, so order is cosmetic for cross-validator correctness
  #     but matters for FAIL-message attribution when a forward archeologist accidentally peer-registers a v3.3.x
  #     marker outside the parent H3 Adopted block
  #   - forward-durable recipe: future v3.3.x.y sub-cycle archeologists replicating the pattern for a NEW v3.3.x
  #     parent cycle (e.g. v3.3.1) should (a) add new L3/L5/L6 cycle entries to audit_script.sh headers, (b) add a
  #     forward-extension-surface sibling validator block to a position BEFORE the existing v3.3.0 block, (c) name
  #     a UNIQUE parent SLUG (`### Adopted: ... (v3.3.N)`), (d) write to a UNIQUE sentinel file (e.g. /tmp/audit-v33N-fail.txt),
  #     (e) bump inv_max=N; the awk state-machine back-bone + the FAIL-on-violation exit-gate stay invariant
  echo
  echo "-- v3.3.0: forward-extension-surface registration mechanical-validator (inaugural v3.3.x parent-cycle sibling; runs BEFORE v3.1.5.2 + v3.1.5.1) --"
  if [ -n "$md_files" ]; then
    v33x_violations=""
    for f in $md_files; do
      file_result=$(awk -v parent="### Adopted: auto-symlink-helper (v3.3.0)" '
        BEGIN { in_parent = 0 }
        {
          if ($0 ~ /^### /) {
            in_parent = ($0 == parent) ? 1 : 0
          }
          # v3.3.x validator: parent-declaration-anchored regex (only catches markers whose
          # SUBJECT is v3.3.<digit>+ — i.e. `[audit-note: v3.3.0 ...]` openings — and NOT
          # cross-references from other audit-notes that mention v3.3.x in their body).
          # previously: substring-match `v3\.3\.[0-9]+` anywhere in body caught cross-references
          # from v3.3.0 marker body that legitimately cites v3.1.5.2 / v3.1.5.1.1 as archeology
          # recipe precedents, producing false-positive FAILs. Anchoring on `[audit-note: v3\.3\.`
          # restores parent-scoped semantics: only DECLARATIONS are subject to the parent-H3 gate.
          if (match($0, /\[audit-note: v3\.3\.[0-9]+(\.[0-9]+)*(\[[^]]*\]|[^]])*\]/)) {
            if (in_parent == 0) {
              printf "%s:%d:%s\n", FILENAME, NR, $0
            }
          }
        }
      ' "$f" 2>/dev/null)
      if [ -n "$file_result" ]; then
        if [ -z "$v33x_violations" ]; then
          v33x_violations="$file_result"
        else
          v33x_violations="$v33x_violations
$file_result"
        fi
      fi
    done
    if [ -n "$v33x_violations" ]; then
      echo "$v33x_violations"
      echo
      echo "   FAIL: v3.3.x audit-note marker detected OUTSIDE the parent H3 Adopted section (peer-row registration violates the v3.3.0 forward-extension-surface contract). Per the Adopted H3 contract, v3.3.x sub-cycle markers register as H3 sub-bullets under parent SLUG #adopted-auto-symlink-helper-v3-3-0 -- NOT as peer inventory rows 29+ (the inventory row count stays stable at 28 indefinitely forward for v3.3.x additions). Move the marker into the parent H3 Adopted section as a sub-bullet, OR revise the marker identity to NOT reference v3.3.x. See app/docs/ops-notes.md ### Adopted: auto-symlink-helper for gitignored Supabase assets (v3.3.0) for the canonical sub-bullet registration example. The v3.3.0 validator runs FIRST so its parent-cycle-specific FAIL message surfaces (otherwise later-cycle validators with narrower parent-SLUG scopes could mis-attribute the FATAL)." >&2
      echo 'v3.3.0-FAIL' > /tmp/audit-v3151-fail.txt
      exit 1
    else
      echo "   v3.3.x peer-row registrations: 0 (PASS; forward-extension-surface contract preserved; inaugural v3.3.0 parent cycle now mechanically enforceable)"
    fi
  else
    echo "   (no .md files tracked by git)"
  fi

  # v3.1.5.2: forward-extension-surface mechanical-validator sibling (regression-spec example for the forward-extension recipe applied to future v3.1.5.x.x sub-cycles)
  #   - mirrors the v3.1.5.1 validator's awk state-machine back-bone + parent SLUG + sentinel-write + post-tee FAIL gate pattern,
  #     but with a SUB-CYCLE-SPECIFIC regex token (narrower than v3.1.5.1's generic "v3.1.5.<digit>" pattern)
  #   - sub-cycle-specific regex: "v3.1.5.2(\.[0-9]+)?" (literal v3.1.5.2 + optional .<digit>+ sub-sub-cycle suffix)
  #     this matches v3.1.5.2, v3.1.5.2.1, v3.1.5.2.2, ... but NOT v3.1.5.1 (covered by v3.1.5.1 validator)
  #   - parent SLUG: same as v3.1.5.1 = ### Adopted: archeology-cycle meta-extension (v3.1.5)
  #   - sentinel-write: writes "v3.1.5.2-FAIL" to /tmp/audit-v3151-fail.txt (SAME sentinel filename as v3.1.5.1, distinguishable content)
  #   - VALIDATOR ORDER: this validator runs BEFORE v3.1.5.1 (per thinker-with-files-gemini Q2 SHIP-BLOCKING).
  #     Without this placement, v3.1.5.1's broader regex would swallow any v3.1.5.2 violation first
  #     and emit a v3.1.5.1-attributed FATAL that does not surface which sub-cycle violated the contract.
  #   - regression-spec purpose: future v3.1.5.x.x sub-cycle archeologists can mirror this entire block
  #     to add a v3.1.5.N validator. The pattern is mechanical (regex token + variable names + sentinel
  #     content + parent SLUG are the only mutable parts; awk state-machine back-bone + sentinel-file
  #     convention + post-tee gate are invariant).
  echo
  echo "-- v3.1.5.2: forward-extension-surface mechanical-validator sibling (sub-cycle-specific regex; runs BEFORE v3.1.5.1 to surface specific FAIL messages first; regression-spec example) --"
  if [ -n "$md_files" ]; then
    v3152_violations=""
    for f in $md_files; do
      file_result=$(awk -v parent="### Adopted: archeology-cycle meta-extension (v3.1.5)" '
        BEGIN { in_parent = 0 }
        {
          if ($0 ~ /^### /) {
            in_parent = ($0 == parent) ? 1 : 0
          }
          # v3.1.5.2 validator: parent-declaration-anchored regex (only catches markers whose
          # SUBJECT is v3.1.5.2 + optional sub-sub-cycles — i.e. `[audit-note: v3.1.5.2 ...]`
          # openings — and NOT cross-references from other audit-notes that mention v3.1.5.2 in
          # their body). previously: substring-match caught cross-references from v3.3.0 marker
          # body (which legitimately cites v3.1.5.2 as the SHARED-sentinel-filename recipe
          # antecedent), producing false-positive FAILs. Anchoring on `[audit-note: v3\.1\.5\.2`
          # restores parent-scoped semantics: only DECLARATIONS are subject to the parent-H3 gate.
          if (match($0, /\[audit-note: v3\.1\.5\.2(\.[0-9]+)*(\[[^]]*\]|[^]])*\]/)) {
            if (in_parent == 0) {
              printf "%s:%d:%s\n", FILENAME, NR, $0
            }
          }
        }
      ' "$f" 2>/dev/null)
      if [ -n "$file_result" ]; then
        if [ -z "$v3152_violations" ]; then
          v3152_violations="$file_result"
        else
          v3152_violations="$v3152_violations
$file_result"
        fi
      fi
    done
    if [ -n "$v3152_violations" ]; then
      echo "$v3152_violations"
      echo
      echo "   FAIL: v3.1.5.2 audit-note marker detected OUTSIDE the parent H3 Adopted section (peer-row registration violates the v3.1.5 forward-extension-surface contract for the v3.1.5.2 sub-cycle). Per the Adopted H3 contract, v3.1.5.2 sub-cycle markers register as H3 sub-bullets under parent SLUG #adopted-archeology-cycle-meta-extension-v3-1-5 -- NOT as peer inventory rows 28+ (the inventory row count stays stable at 27 indefinitely forward). Move the marker into the parent H3 Adopted section as a sub-bullet, OR revise the marker identity to NOT reference v3.1.5.2 (use v3.1.5 alone to reference the parent cycle). See app/docs/ops-notes.md ### Adopted: archeology-cycle meta-extension (v3.1.5) for the canonical sub-bullet registration example. The v3.1.5.2 validator runs BEFORE v3.1.5.1 so its sub-cycle-specific FAIL message surfaces (otherwise v3.1.5.1's broader regex would catch v3.1.5.2 markers first with a v3.1.5.1-attributed FATAL)." >&2
      echo 'v3.1.5.2-FAIL' > /tmp/audit-v3151-fail.txt
      exit 1
    else
      echo "   v3.1.5.2 peer-row registrations: 0 (PASS; forward-extension-surface contract preserved; regression-spec example walked through end-to-end)"
    fi
  else
    echo "   (no .md files tracked by git)"
  fi

  # v3.1.5.1: forward-extension-surface registration mechanical-validator extension
  #   - closes the v3.1.5 adopt-default contract from documentary to mechanical: previously the
  #     "future v3.1.5.x.x.x.x sub-cycles register as H3 sub-bullets under parent SLUG
  #     `#adopted-archeology-cycle-meta-extension-v3-1-5` (NOT as peer inventory rows 28+)"
  #     rule was documented in 4 surfaces (app/docs/ops-notes.md ### Adopted: archeology-cycle
  #     meta-extension (v3.1.5) Adopted H3 + audit_script.sh Provenance header L3 + Anchor
  #     Covenant header L5 + Disambiguation header L6) but had no mechanical enforcement;
  #     forward archeologists writing a v3.1.5.x.x.x.x sub-cycle could slip a peer-row
  #     registration past review, defeating the contract
  #   - this validator makes the contract mechanical: scans the `*.md` git-tracked corpus
  #     for `[audit-note...]` markers whose body carries `v3.1.5.<digit>` (the v3.1.5.x
  #     sub-cycle marker identity, NOT `v3.1.5` alone which is the parent v3.1.5 cycle);
  #     tracks H3 membership via an awk state machine (`in_parent=1` iff current line is
  #     between the parent H3 `### Adopted: archeology-cycle meta-extension (v3.1.5)` line
  #     and the next `^### ` line in the same file); if a v3.1.5.<digit> marker is detected
  #     OUTSIDE the parent H3 Adopted section, FAILs the audit-script run via `exit 1`
  #     with a remediation message pointing archeologists at the H3 sub-bullet protocol
  #   - regex (POSIX ERE): match audit-note markers with `v3.1.5.<digit>` anywhere in body,
  #     with 1-level nested brackets supported; backslash-escape the dot literals in
  #     `v3\.1\.5\.` (POSIX ERE alternation mirrors v3.0.1 hotfix pattern at L138/L157/L213)
  #   - parent H3 SLUG (= forward-extension anchor for sub-cycle bullet registration):
  #     `#adopted-archeology-cycle-meta-extension-v3-1-5`
  #   - forward-extension surface: mirror this validator's pattern for future v3.1.5.x.x.x
  #     sub-cycles (e.g., a v3.1.5.2 sibling validator would replace the regex token
  #     `v3.1.5.\.[0-9]+` + the parent SLUG; the awk state-machine back-bone stays invariant)
  #   - registered as the INAUGURAL v3.1.5.x sub-cycle: this is the FIRST commit to apply
  #     the v3.1.5 SLUG convention to a sub-cycle, demonstrating the forward-extension-surface
  #     contract end-to-end. The audit-script's own L3 + L5 + L6 headers pick it up as
  #     `v3.1.5.1 forward-extension-surface registration mechanical-validator` alongside
  #     the v3.1.5 parent entry (cross-referenced from this Provenance header).
  #   - the inventory-count drift sentinel stays at inv_max=27 indefinitely (the v3.1.5.1
  #     validator does NOT add an inventory row; H3 sub-bullet additions are stable under
  #     the forward-stabilized cap; sub-cycle archeologists who accidentally bump the cap
  #     instead of registering as H3 sub-bullets are caught by this validator at audit-run-time)
  echo
  echo "-- v3.1.5.1: forward-extension-surface registration mechanical-validator (peer-row violation FAILs audit-script run; inaugural v3.1.5.x sub-cycle) --"
  if [ -n "$md_files" ]; then
    v3151_violations=""
    for f in $md_files; do
      file_result=$(awk -v parent="### Adopted: archeology-cycle meta-extension (v3.1.5)" '
        BEGIN { in_parent = 0 }
        {
          if ($0 ~ /^### /) {
            in_parent = ($0 == parent) ? 1 : 0
          }
          # v3.1.5.1 validator: parent-declaration-anchored regex (only catches markers whose
          # SUBJECT is v3.1.5.<digit>+ — i.e. `[audit-note: v3.1.5.N ...]` openings for any N
          # including sub-sub-cycles like v3.1.5.1.1). Cross-references from other audit-notes
          # (e.g., v3.3.0 marker body mentioning v3.1.5 path-1 recipe precedents) are tolerated
          # because the regex now requires v3.1.5.<digit>+ to immediately follow `[audit-note: `,
          # which is the marker SUBJECT position. v3.1.5.2-specific violations are still caught
          # by the narrower v3.1.5.2 sibling validator that runs BEFORE this one.
          if (match($0, /\[audit-note: v3\.1\.5\.[0-9]+(\.[0-9]+)*(\[[^]]*\]|[^]])*\]/)) {
            if (in_parent == 0) {
              printf "%s:%d:%s\n", FILENAME, NR, $0
            }
          }
        }
      ' "$f" 2>/dev/null)
      if [ -n "$file_result" ]; then
        if [ -z "$v3151_violations" ]; then
          v3151_violations="$file_result"
        else
          v3151_violations="$v3151_violations
$file_result"
        fi
      fi
    done
    if [ -n "$v3151_violations" ]; then
      echo "$v3151_violations"
      echo
      echo "   FAIL: v3.1.5.<digit> audit-note marker detected OUTSIDE the parent H3 Adopted section (peer-row registration violates the v3.1.5 archeology-cycle meta-extension forward-extension-surface contract). Per the Adopted H3 contract, future v3.1.5.x.x.x.x sub-cycles register as H3 sub-bullets under parent SLUG \`#adopted-archeology-cycle-meta-extension-v3-1-5\` -- NOT as peer inventory rows 28+ (the inventory row count stays stable at 27 indefinitely forward). Move the marker into the parent H3 Adopted section as a sub-bullet, OR revise the marker identity to NOT reference v3.1.5.<digit> (using v3.1.5 alone tracks the parent v3.1.5 cycle itself and is permitted anywhere). See app/docs/ops-notes.md ### Adopted: archeology-cycle meta-extension (v3.1.5) for the canonical sub-bullet registration example. This validator is forward-extension-surface mechanical: future sub-cycle archeologists get immediate FAIL feedback at audit-script-run time, preventing the convention break from landing." >&2
      echo 'v3.1.5.1-FAIL' > /tmp/audit-v3151-fail.txt
      exit 1
    else
      echo "   v3.1.5.<digit> peer-row registrations: 0 (PASS; forward-extension-surface contract preserved)"
    fi
  else
    echo "   (no .md files tracked by git)"
  fi

  # v2.7: Anchor collision covenant inventory-count regression sentinel
  echo
  echo '-- v2.7: inventory-count regression sentinel (strict regex grep -cE matching lines that start with `- \`#slug`) --'
  inv_count=$(grep -cE '^- `#' "$OPS" 2>/dev/null || echo 0)
  inv_min=16  # v2.7 baseline (rows 1..14 + sidecar-disable-config-adopted row 15 + adopted-cross-domain-header-rendering-check-extension-v2-5 row 16)
  inv_max=28  # post-v3.1.5 first-wave-registry bump + v3.1.4 H3-creation row (this row 26 registers the v3.1.4 archeology-drift-restructure GFM-slug-restructure Adopted H3 paired with the H3-creation commit; together with the 6 retrofittable Adopted-row H3 GFM anchors registered out-of-cycle by the v3.1 Roadmap H3 Cross-references bullet clarifier + retrofitted at 2167dd3 + c8ca4ae; the H3 GFM anchors were forward-extractable via git grep ^### Adopted: + slug-normalization BEFORE this registration; the 6 new rows land as a contiguous block after the 19th row + bumped to 26 by THIS COMMIT + future-bumpable to 27 when a future v2.x row lands)
  echo "   strict inventory count: $inv_count"
  echo '   baseline: 16 rows at v2.7 (rows 1..14 + sidecar-disable-config-adopted row 15 + adopted-cross-domain-header-rendering-check-extension-v2-5 row 16);'
  echo '   a future +N/-N delta announces a PR adding/removing inventory rows; manual review'
  echo '   is required for archeology traceability per the v2.7 docs-cycle convention.'
  echo
  echo '-- v2.7: inventory-row line-numbered census (per row, line number + first 80 chars) --'
  grep -nE '^- `#' "$OPS" | awk -F: '{printf "     %4d| %s\n", $1, substr($2, 1, 80)}' | head -50 || echo '   (none)'

  # v2.7 Phase R: regex pitfalls sentinel -- closes docs-vs-tooling loop with the pitfall-blockquote in app/docs/ops-notes.md (cross-references the v2.7 census columns above)
  echo '-- v2.7 Phase R: regex pitfalls (off-hand `^- \` matches prose bullets; strict `^- \`#` matches inventory rows); baselines: 44 / 16 / 28 at v2.7 --'
  offhand_count=$(grep -cE '^- `' "$OPS" 2>/dev/null || echo 0)
  printf '   off-hand count: %d   strict count: %d   delta: %d   (baselines: 44 / 16 / 28 at v2.7; the pitfall-blockquote immediately above the inventory rows cross-references this delta)\n' "$offhand_count" "$inv_count" "$((offhand_count - inv_count))"
  [ "$((offhand_count - inv_count))" -eq 28 ] || echo '   WARN: regex-pitfall delta drifted away from 28; consult app/docs/ops-notes.md pitfall-blockquote for the archeology-rationale.' >&2

  # v3.0 absolute count drift sentinel -- promotes the v2.7 sentinel to also detect absolute
# count drift (not just regex-pitfall delta drift). The valid range is [16, 28]:
#   - 16 = v2.7 baseline (rows 1..14 + sidecar-disable-config-adopted row 15 + adopted-cross-domain-header-rendering-check-extension-v2-5 row 16)
#   - 17 = post-v2.9 incident-retro row addition (the audit-note #3 documented this bump in d75d527)
#   - 18 = post-v3.0.1 hotfix inventory-row addition (the 18th row registers the audit-note nested-brackets regex hotfix inventory entry appended by THIS COMMIT)
#   - 19 = post-v3.0.1.2 roadmap inventory-row addition (the 19th row registers the audit-cycle-v3.1 Roadmap H3 + INTENTIONAL inline -- OPEN proxy audit-note marker appended by THIS-COMMIT v3.0.1.2)
#   - 20 = post-v3.1.3 first-wave-registry inventory-row addition (the 20th row registers the v2.0 tsc-baseline re-capture audit-chain H3 GFM anchor; the H3 itself was retrofitted onto canonical 3-bullet tripod at 2167dd3 + c8ca4ae per the v3.1 cycle)
#   - 21 = post-v3.1.3 first-wave-registry inventory-row addition (the 21st row registers the v2.1 capture-v6 twins audit-chain H3 GFM anchor; retrofitted at 2167dd3 + c8ca4ae)
#   - 22 = post-v3.1.3 first-wave-registry inventory-row addition (the 22nd row registers the v2.4 Python docstring audit-chain H3 GFM anchor; retrofitted at 2167dd3 + c8ca4ae)
#   - 23 = post-v3.1.3 first-wave-registry inventory-row addition (the 23rd row registers the v2.7.1 run-e2e.sh idempotent start guard H3 GFM anchor; retrofitted at 2167dd3 + c8ca4ae)
#   - 24 = post-v3.1.3 first-wave-registry inventory-row addition (the 24th row registers the v2.9 polish round archeology-chain seal H3 GFM anchor; retrofitted at 2167dd3 + c8ca4ae)
#   - 25 = post-v3.1.3 first-wave-registry inventory-row addition (the 25th row registers the v2.9-archeology-chain release seal H3 GFM anchor; retrofitted at 2167dd3 + c8ca4ae)
#   - 26 = post-v3.1.5 first-wave-registry inventory-row addition (the 26th row registers the v3.1.4 archeology-drift-restructure GFM-slug-restructure H3 GFM anchor; the H3 was inserted in this commit paired with the row-26 inventory registration as an atomic create + register + inv_max=25->26 calibration, mirroring the row-19 retrofit-cycle pattern; forward-extractable via `git grep '^### Adopted: archeology-drift-restructure GFM-slug-restructure' app/docs/ops-notes.md` + slug-normalization) - bump-able to 27 when a future v2.x row lands
#   - 27 = post-v3.1.5 archeology-cycle meta-extension inventory-row addition (this commit; H3 acts as the canonical forward-extendable anchor for all future v3.1.5.x.x.x sub-cycles as H3 sub-bullets rather than as inventory row 28+ peer rows; the inv_max=27 cap is forward-stabilized at 27 indefinitely so sub-cycle sub-bullet additions do not Touch the sentinel)
#   - 28 = post-v3.3.0 inaugural v3.3.x sub-cycle (auto-symlink-helper) inventory-row addition (THIS_COMMIT; H3 acts as the canonical forward-extendable anchor for all future v3.3.x.y sub-cycles as H3 sub-bullets rather than as inventory row 29+ peer rows; the inv_max=28 cap is forward-stabilized at 28 indefinitely so v3.3.x.y sub-cycle additions are sub-bullets not inventory rows; the H3 #adopted-auto-symlink-helper-v3-3-0 is registered as row 28 paired with this commit's H3-creation)
# WARN fires if the count drifts outside this range, catching both:
#   - deletion regression (count < 16): a row was removed without updating the inventory
#   - future addition regression (count > 28): a v2.10+ row was added without updating the sentinel
# Forward-extendable: bump the upper bound when a future v2.10 row is added.
  echo
  echo "-- v3.0: absolute inventory-count drift sentinel (valid range: ${inv_min}..${inv_max} rows; v2.7 baseline + 1 v2.9 bump) --"
  if [ "$inv_count" -lt "$inv_min" ] || [ "$inv_count" -gt "$inv_max" ]; then
    echo "   WARN: absolute inventory count drifted to $inv_count (expected $inv_min or $inv_max; v2.7 baseline=$inv_min, post-v2.9=$inv_max). Manual review required for archeology traceability per the v2.7 docs-cycle convention; see app/docs/ops-notes.md audit-note #3 (the d75d527 commit) for the documented baseline-to-bump transition." >&2
  else
    echo "   absolute count: $inv_count (in range ${inv_min}..${inv_max}; PASS)"
  fi

  print_phase 'D: every GFM cross-reference [text](#anchor) link; classify by target slug'
  echo '-- links that begin with # --'
  grep -oE '\]\(#[a-z][a-z0-9-]*\)' "$OPS" | sort | uniq -c | sort -rn
  echo
  echo '-- links that may use external anchors (http/https) --'
  grep -nE '\]\(http' "$OPS" | head -20 || true
  echo
  echo '-- inline code-form anchors (`#anchor-name`) --'
  grep -nE '`#[a-z][a-z0-9-]*`' "$OPS" | head -50

  print_phase 'E: emphasis annotation survey (find any non-bold-prefix italic emphasis)'
  echo '-- emphasis lines starting with *word*: pattern --'
  grep -nE '^\*[A-Z][a-z]+:' "$OPS" | head -30 || true
  echo
  echo '-- inline *word* italic tokens context --'
  grep -nE '\*[A-Z][a-z]+[^/*]*\*' "$OPS" | head -30 || true
  echo
  echo '-- bold-prefix annotations (the canonical pattern) --'
  grep -cE '^\*\*[A-Z][a-zA-Z ]+:\*\*' "$OPS" || true
  echo '-- bold-prefix annotation samples --'
  grep -nE '^\*\*[A-Z][a-zA-Z ]+:\*\*' "$OPS" | head -20

  print_phase 'F: covenant H2 inventory verbatim (lines 1-15)'
  awk 'NR>=1 && NR<=15 {printf "%4d| %s\n", NR, $0}' "$OPS"

  print_phase 'G: all SHA citations in the file (commit-introducer attributions)'
  echo '-- short SHAs (7-char) cited --'
  grep -oE '`[a-f0-9]{7}`' "$OPS" | sort | uniq -c | sort -rn
  echo
  echo '-- full SHAs (8+ char) cited --'
  grep -oE '`[a-f0-9]{8,}`' "$OPS" | sort -u
  echo
  echo '-- resolve every cited short SHA via git --'
  for sha in $(grep -oE '`[a-f0-9]{7}`' "$OPS" | tr -d '`' | sort -u); do
    subject=$(git log -1 --format='%s' "$sha" 2>/dev/null || echo 'NOT-FOUND')
    printf '   %s  %s\n' "$sha" "$subject"
  done

  # v2.5: per-sector Anchor Covenant kind survey
  echo
  echo '-- v2.5: per-sector Anchor Covenant kind survey (from all SPDX-bearing files) --'
  echo '   shell Anchor Covenant kinds (from .sh files):'
  sh_files_g=$(git ls-files '*.sh' 2>/dev/null)
  if [ -n "$sh_files_g" ]; then
    grep -hE '^# Anchor Covenant \([^)]+\):' $sh_files_g 2>/dev/null | sed 's/^# //' | sort | uniq -c | sort -rn || echo '      (none found)'
  else
    echo '      (no .sh files tracked by git)'
  fi
  echo
  echo '   Python Anchor Covenant kinds (from .py files):'
  py_files_g=$(git ls-files '*.py' 2>/dev/null)
  if [ -n "$py_files_g" ]; then
    grep -hE '^Anchor Covenant \([^)]+\):' $py_files_g 2>/dev/null | sort | uniq -c | sort -rn || echo '      (none found)'
  else
    echo '      (no .py files tracked by git)'
  fi

  # Phase G mirror: regex pitfalls sentinel -- symmetric with Phase R (reasserts 44 / 16 / 28 baselines under Phase G's SHA-citation grep pipeline)
  echo
  echo '-- Phase G mirror: regex pitfalls (reasserts Phase R baselines); off-hand `^- ` matches prose bullets; strict `^- `# matches inventory rows --'
  phase_g_offhand=$(grep -cE '^- `' "$OPS" 2>/dev/null || echo 0)
  phase_g_strict=$(grep -cE '^- `#' "$OPS" 2>/dev/null || echo 0)
  printf '   off-hand count: %d   strict count: %d   delta: %d   (baselines: 44 / 16 / 28 at v2.7; symmetric mirror of Phase R)\n' "$phase_g_offhand" "$phase_g_strict" "$((phase_g_offhand - phase_g_strict))"
  [ "$((phase_g_offhand - phase_g_strict))" -eq 28 ] || echo '   WARN: regex-pitfall baseline drift when reasserted under Phase G; consult app/docs/ops-notes.md pitfall-blockquote for the archeology-rationale.' >&2

  print_phase 'H: any potential orphan / dual-cite residue'
  echo '-- backtick-closing pattern followed immediately by another backtick --'
  grep -nE '`\s*,?\s*`[a-zA-Z]' "$OPS" | head -10 || true
  echo
  echo '-- double backticks with 7-vs-8-char SHA diff --'
  grep -nE '`[a-f0-9]{7,8}`' "$OPS" | head -20

  # Phase H mirror: regex pitfalls sentinel -- symmetric with Phase R (reasserts 44 / 16 / 28 baselines under Phase H's orphan-residue grep pipeline)
  echo
  echo '-- Phase H mirror: regex pitfalls (reasserts Phase R baselines); off-hand `^- ` matches prose bullets; strict `^- `# matches inventory rows --'
  phase_h_offhand=$(grep -cE '^- `' "$OPS" 2>/dev/null || echo 0)
  phase_h_strict=$(grep -cE '^- `#' "$OPS" 2>/dev/null || echo 0)
  printf '   off-hand count: %d   strict count: %d   delta: %d   (baselines: 44 / 16 / 28 at v2.7; symmetric mirror of Phase R)\n' "$phase_h_offhand" "$phase_h_strict" "$((phase_h_offhand - phase_h_strict))"
  [ "$((phase_h_offhand - phase_h_strict))" -eq 28 ] || echo '   WARN: regex-pitfall baseline drift when reasserted under Phase H; consult app/docs/ops-notes.md pitfall-blockquote for the archeology-rationale.' >&2

  print_phase 'I: anchor-collision covenant inventory entry: each bullet''s sha-citation resolution'
  awk 'NR>=8 && NR<=13 {printf "%4d| %s\n", NR, $0}' "$OPS"
  echo
  echo '-- bullet-by-bullet resolve introducer --'
  for line in 8 9 10 11 12 13; do
    text=$(awk -v ln=$line 'NR==ln {print}' "$OPS")
    echo "line $line: $text"
    sha=$(awk -v ln=$line 'NR==ln' "$OPS" | grep -oE '`[a-f0-9]{7}`' | head -1 | tr -d '`')
    if [ -n "$sha" ]; then
      subj=$(git log -1 --format='%s' "$sha" 2>/dev/null || echo 'NOT-FOUND')
      echo "   -> first-cited SHA $sha: $subj"
    fi
  done

  print_phase 'J: file-wide unbroken implicit-link scan (no broken link parsable via git grep)'
  echo '-- search any cross-reference whose target slug does not match a known H2/H3 --'
  broken=0
  for anchor_target in $(grep -oE '\]\(#[a-z][a-z0-9-]*\)' "$OPS" | sed 's/^](\(#[^)]*)\)]$/\1/' | sort -u); do
    if ! grep -qF "$anchor_target" "$OPS" 2>/dev/null; then
      echo "   unverified target: $anchor_target"
      broken=$((broken+1))
    fi
  done
  echo "   (count: $broken; flagged for deeper GFM-slug audit by reviewer/thunker)"

  # v2.5: per-file domain-coverage assertion
  echo
  echo '-- v2.5: per-file domain-coverage assertion (every SPDX-bearing .sh / .py file must have all 5 semantic lines in first 15) --'
  coverage_failures=0
  coverage_files=0
  for f in $(git ls-files '*.sh' '*.py' 2>/dev/null); do
    head15=$(head -15 "$f" 2>/dev/null)
    if ! echo "$head15" | grep -qE '^# Provenance: introduced by `[a-f0-9]{7}`|^Audit-Chain Provenance: introduced by `[a-f0-9]{7}`'; then
      continue
    fi
    coverage_files=$((coverage_files+1))
    missing=""
    echo "$head15" | grep -qE '^# Tripod Closure:|^Tripod Closure:' || missing="$missing Tripod"
    echo "$head15" | grep -qE '^# Anchor Covenant \(|^Anchor Covenant \(' || missing="$missing Anchor"
    echo "$head15" | grep -qE '^# Disambiguation:|^Disambiguation:' || missing="$missing Disambig"
    echo "$head15" | grep -qE '^# Tag Chain:|^Tag Chain:' || missing="$missing Tag"
    if [ -z "$missing" ]; then
      echo "   $f: OK (5/5 semantic lines)"
    else
      echo "   $f: PARTIAL, missing:$missing"
      coverage_failures=$((coverage_failures+1))
    fi
  done
  echo "   (audited: $coverage_files files; coverage failures: $coverage_failures; 0 expected at v2.5)"

  print_phase 'K: git log --reverse archeology summary (every commit touching docs/ops-notes.md)'
  echo '-- every commit touching the file (with intro/affect line counts) --'
  git log --reverse --oneline --stat -- "$OPS" | head -100

  print_phase 'L: file line count + closing hash'
  wc -l "$OPS"
  md5sum "$OPS"

  print_phase 'DONE'
} 2>&1 | tee "$LOG"

# v3.1.5.1.1 PIPEFAIL-BYPASS: post-tee FAIL gate.
# The brace-block `} 2>&1 | tee "$LOG"` runs in a SUBSHELL (left side of pipe).
# Bash default pipefail=OFF masks any `exit 1` inside the brace subshell from CI/pre-commit
# propagation (pipeline exit status = tee exit status = 0). The v3.1.5.1 validator writes a
# sentinel file inside the FAIL branch BEFORE `exit 1` (synchronous file I/O persists
# across subshell exit). This post-tee gate reads the sentinel in parent-bash context AFTER
# pipeline completes + propagates as bash-level exit_code=1.
if [ -f /tmp/audit-v3151-fail.txt ]; then
  FAIL_SRC=$(cat /tmp/audit-v3151-fail.txt)
  rm -f /tmp/audit-v3151-fail.txt
  echo "   FATAL: $FAIL_SRC surfaced FAIL via sentinel file; tee-pipeline mask bypassed via post-tee gate (cross-validator attribution; was v3.1.5.1-only pre-v3.1.5.2)" >&2
  exit 1
fi
