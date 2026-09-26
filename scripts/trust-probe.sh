#!/bin/zsh
# Pre-trust the race worktrees OFF camera: a fresh directory shows Claude Code's
# "Is this a project you trust?" dialog once; answer it here so a recorded run never
# types its prompt into the dialog. Trust is tracked per path in ~/.claude.json.
REPO="$(git rev-parse --show-toplevel)"; NAME="$(basename "$REPO")"; PARENT="$(dirname "$REPO")"
tmux kill-server 2>/dev/null; tmux start-server
for i in 1 2 3; do
  d="$PARENT/$NAME-lane$i"; [ -d "$d" ] || continue
  tmux new-session -d -s "t$i" -x 160 -y 40 -c "$d" "PROMPT='> ' zsh -df"
  tmux send-keys -t "t$i" 'claude --permission-mode acceptEdits' Enter
done
sleep 8
for i in 1 2 3; do tmux send-keys -t "t$i" Down; sleep 0.5; tmux send-keys -t "t$i" Enter; done
sleep 5
for i in 1 2 3; do tmux send-keys -t "t$i" '/exit' Enter; done
sleep 3; tmux kill-server 2>/dev/null
echo "trusted:"; python3 -c "import json,os;d=json.load(open(os.path.expanduser('~/.claude.json')));print([k for k in d.get('projects',{}) if '$NAME-lane' in k])"
