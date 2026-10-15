def _create(client):
    r = client.post("/orders", json={"customer": "Ada", "total_cents": 1999})
    assert r.status_code == 201
    return r.json()["id"]


def test_change_status_updates_and_returns_order(client):
    order_id = _create(client)
    r = client.patch(f"/orders/{order_id}/status", json={"status": "paid"})
    assert r.status_code == 200
    body = r.json()
    assert body["id"] == order_id and body["status"] == "paid"
    assert body["total_cents"] == 1999
    assert client.get(f"/orders/{order_id}").json()["status"] == "paid"


def test_every_allowed_status_is_accepted(client):
    order_id = _create(client)
    for status in ("shipped", "paid", "new"):
        r = client.patch(f"/orders/{order_id}/status", json={"status": status})
        assert r.status_code == 200
        assert r.json()["status"] == status


def test_unknown_status_is_422_and_order_unchanged(client):
    order_id = _create(client)
    for body in ({"status": "cancelled"}, {"status": ""}, {"status": None}, {}):
        r = client.patch(f"/orders/{order_id}/status", json=body)
        assert r.status_code == 422
    assert client.get(f"/orders/{order_id}").json()["status"] == "new"


def test_unknown_order_is_404(client):
    r = client.patch("/orders/999/status", json={"status": "paid"})
    assert r.status_code == 404
