#!/bin/zsh
# Hidden-test judge: run the visible suite PLUS scripts/judge/hidden_tests.py in every
# race lane. The lanes never see the hidden file; it is copied in, run, and removed.
set -e
HERE="$(cd "$(dirname "$0")" && pwd)"; REPO="$(git -C "$HERE" rev-parse --show-toplevel)"
HIDDEN="${1:-$HERE/judge/hidden_tests.py}"   # pass a job-specific hidden suite as the first arg
NAME="$(basename "$REPO")"; PARENT="$(dirname "$REPO")"
for i in 1 2 3; do
  d="$PARENT/$NAME-lane$i"; [ -d "$d" ] || continue
  echo "===== lane $i · $(git -C "$d" log --oneline -1) ====="
  cp "$HIDDEN" "$d/tests/test_hidden_judge.py"
  (cd "$d" && "$REPO/.venv/bin/python" -m pytest tests -p no:cacheprovider 2>&1 | tail -2) || true
  rm -f "$d/tests/test_hidden_judge.py"
done
