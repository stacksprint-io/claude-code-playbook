from sqlmodel import Session

from app.db import engine
from app.models import Order


def _seed(client, *statuses):
    for i, status in enumerate(statuses):
        r = client.post("/orders", json={"customer": f"c{i}", "total_cents": 100 * (i + 1)})
        assert r.status_code == 201
        with Session(engine) as session:
            order = session.get(Order, r.json()["id"])
            order.status = status
            session.add(order)
            session.commit()


def test_filter_by_status_newest_first(client):
    _seed(client, "paid", "new", "paid", "shipped")
    r = client.get("/orders", params={"status": "paid"})
    assert r.status_code == 200
    assert [o["customer"] for o in r.json()] == ["c2", "c0"]
    assert all(o["status"] == "paid" for o in r.json())


def test_filter_with_no_matches_is_empty(client):
    _seed(client, "new")
    r = client.get("/orders", params={"status": "shipped"})
    assert r.status_code == 200
    assert r.json() == []


def test_no_status_returns_every_order(client):
    _seed(client, "new", "paid", "shipped")
    r = client.get("/orders")
    assert r.status_code == 200
    assert [o["customer"] for o in r.json()] == ["c2", "c1", "c0"]


def test_unknown_status_is_422(client):
    assert client.get("/orders", params={"status": "cancelled"}).status_code == 422
    assert client.get("/orders", params={"status": ""}).status_code == 422
