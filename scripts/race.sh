#!/bin/zsh
# Three Claude Code sessions, three git worktrees, one prompt, one model per lane.
# Usage:  scripts/race.sh "the prompt"  [claude-opus-5-5 claude-opus-5 claude-sonnet-5]
# Worktrees ../<repo>-lane1..3 are created if missing (branch race/lane-N from HEAD).
PROMPT="${1:?usage: race.sh \"prompt\" [model ...]}"; shift
MODELS=("$@"); [ ${#MODELS[@]} -eq 0 ] && MODELS=(claude-opus-5-5 claude-opus-5 claude-sonnet-5)
REPO="$(git rev-parse --show-toplevel)"; NAME="$(basename "$REPO")"; PARENT="$(dirname "$REPO")"
LANES=()
for i in 1 2 3; do
  d="$PARENT/$NAME-lane$i"
  [ -d "$d" ] || git -C "$REPO" worktree add -q "$d" -b "race/lane-$i" HEAD
  LANES+=("$d")
done
unset -m 'CLAUDE*' 2>/dev/null
tmux kill-server 2>/dev/null; tmux start-server
tmux new-session -d -s race -x 220 -y 50 -c "${LANES[1]}" "PROMPT='> ' zsh -df"
tmux set -g default-command "PROMPT='> ' zsh -df"
tmux set -g pane-border-status top; tmux set -g pane-border-format " #{pane_title} "; tmux set -g status off
tmux split-window -h -t race -c "${LANES[2]}"; tmux split-window -h -t race -c "${LANES[3]}"
tmux select-layout -t race even-horizontal
for p in 0 1 2; do tmux select-pane -t race:0.$p -T " ${MODELS[$((p+1))]} "; done
(
  sleep 2
  for p in 0 1 2; do
    tmux send-keys -t race:0.$p "claude --model ${MODELS[$((p+1))]} --permission-mode acceptEdits --effort medium --allowedTools 'Bash(.venv/bin/python -m pytest:*)' 'Bash(git:*)'"
  done
  sleep 1; for p in 0 1 2; do tmux send-keys -t race:0.$p Enter; done
  sleep 11; for p in 0 1 2; do tmux send-keys -t race:0.$p "$PROMPT"; done
  sleep 2;  for p in 0 1 2; do tmux send-keys -t race:0.$p Enter; done
) &
exec tmux attach -t race
