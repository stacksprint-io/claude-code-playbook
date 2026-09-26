"""Hidden judge suite. Never shown to a lane. Extend per job; these cover the base app."""


def test_list_is_newest_first(client):
    client.post("/orders", json={"customer": "A", "total_cents": 100})
    client.post("/orders", json={"customer": "B", "total_cents": 200})
    assert [o["customer"] for o in client.get("/orders").json()] == ["B", "A"]


def test_new_orders_start_as_new(client):
    r = client.post("/orders", json={"customer": "C", "total_cents": 0})
    assert r.status_code == 201 and r.json()["status"] == "new"


def test_missing_customer_is_422(client):
    assert client.post("/orders", json={"total_cents": 5}).status_code == 422
