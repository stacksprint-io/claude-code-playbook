# CLAUDE.md: orders

A small orders service: FastAPI + SQLite (SQLModel) + one Bootstrap page with vanilla JS.
Read this before touching anything. It is short on purpose; keep it that way (see the last section).

## Run and test

- Install: `python3.12 -m venv .venv && .venv/bin/pip install -r requirements.txt`
- Tests: `.venv/bin/python -m pytest` (must be green before any commit)
- Lint/format: `.venv/bin/ruff check app tests && .venv/bin/ruff format app tests`
- Serve: `.venv/bin/uvicorn app.main:app --reload`, then open http://127.0.0.1:8000

## Conventions

- Money is always integer cents (`total_cents`). Never store or compute money as a float.
- `status` is one of `new`, `paid`, `shipped`. A new value means a new test and a note here.
- Every endpoint gets a test in `tests/test_<topic>.py` using the `client` fixture; run it before you report done.
- Read the code before guessing: `app/main.py` is the whole API, `app/models.py` the whole schema.
- Commit messages: conventional type + short description (`feat: add order cancellation`).
- Never edit `.env` or anything under `migrations/`; a hook will block it anyway.

## How this project uses Claude Code

`.claude/settings.json` (committed) holds the team allowlist and three hooks; `.claude/agents/` the
reviewer / test-writer / researcher subagents; `.claude/skills/` the `fastapi-endpoint` and
`release-notes` skills; `mcp_server/server.py` an MCP server over the database; `scripts/` the
three-lane worktree race and the hidden-test judge. The README maps each to the video that shows it.

## Keep this file small

Claude Code reads this file into every session. Past ~40k characters it warns and beyond
150k it stops loading it properly. Put history and lessons in `docs/`, not here.
