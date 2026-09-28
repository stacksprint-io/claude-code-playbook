def test_pay_new_order(client):
    order_id = client.post("/orders", json={"customer": "Ada", "total_cents": 1999}).json()["id"]
    r = client.patch(f"/orders/{order_id}/pay")
    assert r.status_code == 200
    assert r.json()["status"] == "paid"
    assert client.get(f"/orders/{order_id}").json()["status"] == "paid"


def test_pay_missing_is_404(client):
    assert client.patch("/orders/999/pay").status_code == 404
