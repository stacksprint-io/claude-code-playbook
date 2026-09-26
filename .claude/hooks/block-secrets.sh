#!/bin/bash
# PreToolUse · Write|Edit — refuse to write a secret or touch a protected file.
# Exit 2 blocks the tool call; the JSON gives Claude the reason.
INPUT=$(cat)
FILE=$(echo "$INPUT" | jq -r '.tool_input.file_path // ""')
BODY=$(echo "$INPUT" | jq -r '.tool_input.content // .tool_input.new_string // ""')

deny() {
  jq -n --arg r "$1" '{hookSpecificOutput:{hookEventName:"PreToolUse",permissionDecision:"deny",permissionDecisionReason:$r}}'
  exit 2
}

case "$FILE" in
  */.env|*/.env.*|.env|.env.*) deny "Hook: .env files are edited by humans only ($FILE)." ;;
  */migrations/*)              deny "Hook: migrations are generated, not hand-edited ($FILE)." ;;
esac

if echo "$BODY" | grep -Eq 'sk-ant-[A-Za-z0-9_-]{8,}|AKIA[0-9A-Z]{16}|-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----|ghp_[A-Za-z0-9]{20,}'; then
  deny "Hook: that content looks like a live credential. Read it from the environment instead."
fi
exit 0
