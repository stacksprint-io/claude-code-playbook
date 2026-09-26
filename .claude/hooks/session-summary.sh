#!/bin/bash
# Stop — one line per turn into .claude/session.log: when, and what Claude said last.
INPUT=$(cat)
MSG=$(echo "$INPUT" | jq -r '.last_assistant_message // ""' | head -1 | cut -c1-160)
mkdir -p "${CLAUDE_PROJECT_DIR:-.}/.claude"
echo "$(date '+%Y-%m-%d %H:%M')  $MSG" >> "${CLAUDE_PROJECT_DIR:-.}/.claude/session.log"
exit 0
