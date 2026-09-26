"""Hidden judge suite for the race job: PATCH /orders/{id}/pay. Never shown to a lane."""


def _make(client, status="new"):
    r = client.post("/orders", json={"customer": "Judge", "total_cents": 500})
    oid = r.json()["id"]
    if status != "new":
        client.patch(f"/orders/{oid}/pay")
    return oid


def test_new_order_becomes_paid(client):
    oid = _make(client)
    r = client.patch(f"/orders/{oid}/pay")
    assert r.status_code == 200 and r.json()["status"] == "paid"
    assert client.get(f"/orders/{oid}").json()["status"] == "paid"


def test_paying_twice_is_rejected(client):
    oid = _make(client, "paid")
    assert client.patch(f"/orders/{oid}/pay").status_code == 422


def test_missing_order_is_404(client):
    assert client.patch("/orders/4242/pay").status_code == 404


def test_other_orders_untouched(client):
    a = _make(client)
    b = _make(client)
    client.patch(f"/orders/{a}/pay")
    assert client.get(f"/orders/{b}").json()["status"] == "new"
