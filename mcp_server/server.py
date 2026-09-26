"""An MCP server over the orders database. Three tools: two read, one guarded write.
Run: .venv/bin/python mcp_server/server.py   (stdio; registered with `claude mcp add`)"""

import os
import sqlite3

from fastmcp import FastMCP

DB = os.environ.get("ORDERS_DB", os.path.join(os.path.dirname(__file__), "..", "orders.db"))
mcp = FastMCP("orders")


def _rows(sql: str, args: tuple = ()) -> list[dict]:
    con = sqlite3.connect(DB)
    con.row_factory = sqlite3.Row
    try:
        return [dict(r) for r in con.execute(sql, args).fetchall()]
    finally:
        con.close()


@mcp.tool()
def find_orders(customer: str) -> list[dict]:
    """Orders for a customer, newest first. Case-insensitive match on the name."""
    return _rows(
        'SELECT id, customer, total_cents, status, created_at FROM "order" '
        "WHERE lower(customer) LIKE lower(?) ORDER BY id DESC",
        (f"%{customer}%",),
    )


@mcp.tool()
def daily_summary() -> dict:
    """Count and revenue (in cents) per status, plus the grand total."""
    per = _rows(
        'SELECT status, COUNT(*) AS n, SUM(total_cents) AS cents FROM "order" GROUP BY status'
    )
    return {"by_status": per, "total_cents": sum(r["cents"] or 0 for r in per)}


@mcp.tool()
def mark_shipped(order_id: int, confirm: bool = False) -> dict:
    """Move a paid order to shipped. Needs confirm=true; never touches other statuses."""
    if not confirm:
        return {"ok": False, "reason": "Pass confirm=true to change a real order."}
    con = sqlite3.connect(DB)
    try:
        cur = con.execute(
            "UPDATE \"order\" SET status='shipped' WHERE id=? AND status='paid'", (order_id,)
        )
        con.commit()
        return {"ok": cur.rowcount == 1, "changed": cur.rowcount}
    finally:
        con.close()


if __name__ == "__main__":
    mcp.run()
