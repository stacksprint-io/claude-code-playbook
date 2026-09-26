"""Put a few realistic orders in the database so the page and the MCP tools have something to show.
Run: .venv/bin/python scripts/seed.py"""

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from sqlmodel import Session  # noqa: E402

from app.db import engine, init_db  # noqa: E402
from app.models import Order  # noqa: E402

ROWS = [
    ("Ada Lovelace", 12999, "shipped"),
    ("Grace Hopper", 4550, "paid"),
    ("Linus Torvalds", 899, "new"),
    ("Margaret Hamilton", 23900, "paid"),
    ("Ken Thompson", 1599, "new"),
    ("Ada Lovelace", 3200, "new"),
]

init_db()
with Session(engine) as s:
    for customer, cents, status in ROWS:
        s.add(Order(customer=customer, total_cents=cents, status=status))
    s.commit()
print(f"seeded {len(ROWS)} orders into {engine.url.database}")
