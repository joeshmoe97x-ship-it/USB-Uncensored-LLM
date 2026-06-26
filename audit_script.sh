PROJECT_DIR=$HOME/USB-Uncensored-LLM/Linux/app
OPS="$PROJECT_DIR/docs/ops-notes.md"
LOG=/tmp/build-log/final-archeology-drift-audit.log

mkdir -p /tmp/build-log

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

  print_phase 'H: any potential orphan / dual-cite residue'
  echo '-- backtick-closing pattern followed immediately by another backtick --'
  grep -nE '`\s*,?\s*`[a-zA-Z]' "$OPS" | head -10 || true
  echo
  echo '-- double backticks with 7-vs-8-char SHA diff --'
  grep -nE '`[a-f0-9]{7,8}`' "$OPS" | head -20

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
  for anchor_target in $(grep -oE '\]\(#[a-z][a-z0-9-]*\)' "$OPS" | sed 's/^](\(#[^)]*\))$/\1/' | sort -u); do
    if ! grep -qF "$anchor_target" "$OPS" 2>/dev/null; then
      echo "   unverified target: $anchor_target"
      broken=$((broken+1))
    fi
  done
  echo "   (count: $broken; flagged for deeper GFM-slug audit by reviewer/thunker)"

  print_phase 'K: git log --reverse archeology summary (every commit touching docs/ops-notes.md)'
  echo '-- every commit touching the file (with intro/affect line counts) --'
  git log --reverse --oneline --stat -- "$OPS" | head -100

  print_phase 'L: file line count + closing hash'
  wc -l "$OPS"
  md5sum "$OPS"

  print_phase 'DONE'
} 2>&1 | tee "$LOG"
