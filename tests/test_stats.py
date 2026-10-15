def test_stats_empty(client):
    r = client.get("/orders/stats")
    assert r.status_code == 200
    assert r.json() == {"count": 0, "total_cents": 0}


def test_stats_counts_and_sums_cents(client):
    for customer, cents in [("Ada", 1999), ("Bob", 1), ("Cy", 500)]:
        client.post("/orders", json={"customer": customer, "total_cents": cents})
    r = client.get("/orders/stats")
    assert r.status_code == 200
    body = r.json()
    assert body == {"count": 3, "total_cents": 2500}
    assert isinstance(body["total_cents"], int)


def test_stats_route_not_shadowed_by_order_id(client):
    # /orders/stats must be declared before /orders/{order_id}, or it 422s.
    assert client.get("/orders/stats").status_code == 200


def test_page_has_stats_card(client):
    r = client.get("/")
    assert r.status_code == 200
    assert 'id="stat-count"' in r.text and 'id="stat-total"' in r.text
