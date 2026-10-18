# What pr-review checks in this repo

- Money is integer cents (total_cents): never a float, never dollars.
- status stays new, paid or shipped; a new value needs a test and a CLAUDE.md note.
- Every new or changed endpoint has a test in tests/test_<topic>.py using the client fixture.
- Error paths are tested, not just the happy path (404s, 422s).
- Commit messages use a conventional type (feat:, fix:, test:).
- Nothing touches .env or migrations/.
- If static/index.html changed, a test still checks that / loads.
- No unrelated changes ride along.
