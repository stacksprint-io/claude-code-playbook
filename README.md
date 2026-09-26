# claude-code-playbook

The `.claude/` directory I actually use, plus a small real project to run it against.
Every file in here has been used on camera on the [StackSprint](https://www.youtube.com/@stacksprint)
channel. Nothing is theoretical: the table at the bottom maps each file to the video that shows it working.

Drop the `.claude/` folder into your own repo, keep what fits, delete what does not.

## What is in the box

```
CLAUDE.md                      project memory: the run/test commands, the conventions, and why it stays short
.claude/settings.json          the committed team settings: scoped allow/deny rules + three hooks
.claude/hooks/
  block-secrets.sh             PreToolUse · refuses writes that contain a credential or touch .env / migrations
  format-and-test.sh           PostToolUse · ruff-formats the file Claude just edited and runs the tests that cover it
  session-summary.sh           Stop · one line per turn into .claude/session.log
.claude/agents/
  reviewer.md                  read-only reviewer (cannot edit, on purpose), Opus 5.5, high effort
  test-writer.md               writes and runs pytest tests, Sonnet 5
  researcher.md                answers "how does this work" from code and docs, never edits
.claude/skills/
  fastapi-endpoint/SKILL.md    endpoint + test + Bootstrap form, all three in one pass
  release-notes/SKILL.md       commits since the last tag → a CHANGELOG section
mcp_server/server.py           a FastMCP server over the orders database: two read tools, one guarded write
scripts/
  race.sh                      three Claude Code sessions in three git worktrees, one prompt, one model per lane
  judge.sh + judge/            hidden tests the lanes never see, run in every worktree after the race
  seed.py                      six realistic orders for the page and the MCP tools
  trust-probe.sh               pre-answer the "trust this folder" dialog for new worktrees, off camera
.github/workflows/
  ci.yml                       ruff + pytest on push and PR
  auto-fix.yml                 CI fails → Claude fixes it and pushes to the same branch (with a loop guard)
  pr-review.yml                every PR gets a real review comment from Claude
app/ · static/ · tests/        the project all of this runs against: FastAPI + SQLite + Bootstrap, 3 endpoints, 3 tests
```

## Quick start

```bash
git clone https://github.com/stacksprint-io/claude-code-playbook && cd claude-code-playbook
python3.12 -m venv .venv && .venv/bin/pip install -r requirements.txt
.venv/bin/python -m pytest          # 3 passed
claude                              # the hooks, agents and skills load from .claude/
```

Try it in that first session:

- `/agents` lists the three subagents. Ask "use the reviewer to look at app/main.py".
- Ask "add an endpoint that cancels an order" and watch `fastapi-endpoint` trigger.
- Ask Claude to write `API_KEY=sk-ant-...` into any file and watch `block-secrets` refuse.
- Edit any file under `app/` and watch `format-and-test` run the matching test and report back.

## The pieces, one at a time

### Settings and permissions (`.claude/settings.json`)

Committed, so every clone gets the same rules. `allow` is scoped to the exact commands the project
needs (`Bash(.venv/bin/python -m pytest:*)`, `Bash(git commit:*)`), never a blanket `Bash`. `deny`
keeps `.env` unreadable and blocks `rm -rf` and force-pushes outright. A teammate's personal
exceptions go in `.claude/settings.local.json`, which is git-ignored.

On the command line the same idea is `--allowedTools "Bash(git:*)"`. Four things still ask even with
`--permission-mode acceptEdits`: an MCP tool call, a shell command with variable expansion, a file
read outside the project, and the first-launch trust dialog for a new directory. The allowlist
covers the first two; `trust-probe.sh` handles the last.

### Hooks (`.claude/hooks/`)

Shell scripts that receive the tool call as JSON on stdin. `block-secrets.sh` exits 2 with a
`permissionDecision: deny` and a reason, which Claude sees and works around. `format-and-test.sh`
runs after every edit and hands the pytest result back as `additionalContext`, so Claude fixes a
red test before it tells you it is done. `session-summary.sh` runs on Stop. Timeouts are set on
each so a slow test suite cannot hang a session.

### Subagents (`.claude/agents/`)

Markdown with frontmatter. The important line in each is `tools:`: the reviewer cannot edit,
the researcher cannot run code. Model and effort are pinned per agent, so a cheap agent stays
cheap and the reviewer gets the strongest model.

### Skills (`.claude/skills/`)

A skill is a `SKILL.md` Claude loads when your request matches its `description`. The
description is the whole trick: `fastapi-endpoint` lists the verbs people actually type
("add", "expose", "create an endpoint for"). `release-notes` shows the other pattern: a shell
command inlined with `` !`git log ...` `` so the skill sees live data.

### MCP (`mcp_server/server.py`)

```bash
claude mcp add orders -- .venv/bin/python mcp_server/server.py
claude --allowedTools "mcp__orders__find_orders" "mcp__orders__daily_summary"
```

Three tools over the SQLite file. The write tool refuses unless `confirm=true`, and it is left
out of the allowlist above so Claude has to ask before changing a real order.

### Worktrees, the race, and the judge (`scripts/`)

`race.sh "the prompt" claude-opus-5-5 claude-opus-5 claude-sonnet-5` creates three worktrees,
opens three tmux panes, launches one Claude Code per lane with `--model` pinned, and sends the same
prompt to all three in the same second. `judge.sh` then copies `judge/hidden_tests.py` into each
lane and runs the full suite. The lanes never see the hidden file, so a model cannot game a test
it has not read.

### CI (`.github/workflows/`)

`auto-fix.yml` needs the Claude GitHub App installed on the repo and an `ANTHROPIC_API_KEY`
secret. The guard step checks the last commit message so a fix that does not fully pass cannot
re-trigger itself forever. `pr-review.yml` gives the action `GH_TOKEN` so its `gh pr comment` works.

## File → video

| file | proven in |
|---|---|
| everything, together | Claude Code Cheat Sheet 2026 (the hub video, link in each section as it ships) |
| `scripts/race.sh`, worktrees | Git Worktrees: Run 3 Claude Code Agents At Once · I Raced Opus 5.5, Opus 5 and Sonnet 5 |
| `scripts/judge.sh`, hidden tests | I Raced Opus 5.5, Opus 5 and Sonnet 5 on the Same Bug |
| `.github/workflows/auto-fix.yml` | Claude Code fixes your failing CI |
| `.github/workflows/pr-review.yml` | Automating code review with Claude Code |
| `mcp_server/server.py` | MCP servers explained |
| `CLAUDE.md` | Context and memory in Claude Code |
| the tiny agent loop this grew out of | I Built My Own Claude Code in 30 Minutes With Python |

## License

MIT. Use it, change it, ship it.
