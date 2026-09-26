---
name: fastapi-endpoint
description: Add a new FastAPI endpoint to this app with its pytest test and a Bootstrap form or table on the page, all three in one pass. Use when the user asks to add, expose, or create an endpoint, route, or API for something (orders, refunds, exports), or says "add an API for X".
allowed-tools: Read, Edit, Write, Bash(.venv/bin/python -m pytest:*)
---

## Where things live

- Routes: `app/main.py`. Models and request schemas: `app/models.py`. Database session: `app/db.py` (`get_session`).
- Tests: `tests/test_<topic>.py`, using the `client` fixture from `tests/conftest.py`.
- Page: `static/index.html` (Bootstrap 5 from the CDN, vanilla `fetch`).

## Do all three, every time

1. **The endpoint** in `app/main.py`: a typed request model in `app/models.py` if it takes a body, `response_model` set, the right status code (`201` on create), `HTTPException` for the failure cases. Money is always integer cents.
2. **The test** in `tests/`: the happy path and at least one failure path, run with `.venv/bin/python -m pytest tests/test_<topic>.py -q`, and paste the last line of the output.
3. **The page**: a form (for a POST) or a table column/button (for a GET/PATCH) in `static/index.html` that calls the new endpoint with `fetch` and reloads the list. No frameworks, no build step.

Report the three files you changed and the test result. Stop there; do not add endpoints that were not asked for.
