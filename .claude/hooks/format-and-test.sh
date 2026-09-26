#!/bin/bash
# PostToolUse · Write|Edit — format the Python file Claude just touched and run
# the tests that cover it. The result goes back to Claude as additionalContext.
INPUT=$(cat)
FILE=$(echo "$INPUT" | jq -r '.tool_input.file_path // ""')
case "$FILE" in *.py) ;; *) exit 0 ;; esac
cd "${CLAUDE_PROJECT_DIR:-.}" || exit 0
PY=".venv/bin/python"; [ -x "$PY" ] || PY="python3"

FMT=$("$PY" -m ruff format "$FILE" 2>&1 | tail -1)
"$PY" -m ruff check --fix -q "$FILE" >/dev/null 2>&1

NAME=$(basename "$FILE" .py)
TARGET="tests/test_${NAME}.py"
case "$FILE" in tests/*) TARGET="$FILE" ;; esac
[ -f "$TARGET" ] || TARGET="tests"
OUT=$("$PY" -m pytest "$TARGET" -q -p no:cacheprovider 2>&1 | tail -3 | tr '\n' ' ')

jq -n --arg c "hook format-and-test: ${FMT}. pytest ${TARGET}: ${OUT}" \
  '{hookSpecificOutput:{hookEventName:"PostToolUse",additionalContext:$c}}'
exit 0
