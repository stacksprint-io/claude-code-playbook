def test_create_and_list(client):
    r = client.post("/orders", json={"customer": "Ada", "total_cents": 1999})
    assert r.status_code == 201
    body = r.json()
    assert body["customer"] == "Ada" and body["status"] == "new"
    r = client.get("/orders")
    assert r.status_code == 200
    assert [o["customer"] for o in r.json()] == ["Ada"]


def test_get_missing_is_404(client):
    assert client.get("/orders/999").status_code == 404


def test_negative_total_rejected(client):
    r = client.post("/orders", json={"customer": "Bob", "total_cents": -5})
    assert r.status_code == 422
