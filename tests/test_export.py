import csv
import io

HEADER = ["id", "customer", "total_cents", "status", "created_at"]


def test_export_csv(client):
    client.post("/orders", json={"customer": "Ada", "total_cents": 1999})
    client.post("/orders", json={"customer": "Lovelace, Ada", "total_cents": 5})
    r = client.get("/orders.csv")
    assert r.status_code == 200
    assert r.headers["content-type"].startswith("text/csv")
    assert "attachment" in r.headers["content-disposition"]
    rows = list(csv.reader(io.StringIO(r.text)))
    assert rows[0] == HEADER
    assert [row[:4] for row in rows[1:]] == [
        ["1", "Ada", "1999", "new"],
        ["2", "Lovelace, Ada", "5", "new"],
    ]
    assert all(row[4] for row in rows[1:])


def test_export_csv_empty_is_header_only(client):
    r = client.get("/orders.csv")
    assert r.status_code == 200
    assert list(csv.reader(io.StringIO(r.text))) == [HEADER]


def test_order_by_id_still_works(client):
    client.post("/orders", json={"customer": "Ada", "total_cents": 1})
    assert client.get("/orders/1").status_code == 200
    assert client.get("/orders/999").status_code == 404


def test_export_csv_escapes_formula_customers(client):
    risky = ['=HYPERLINK("http://evil","x")', "+1+1", "-2", "@SUM(A1)", "\tTab", "\rCR"]
    for name in [*risky, "Ada"]:
        client.post("/orders", json={"customer": name, "total_cents": 1})
    r = client.get("/orders.csv")
    rows = list(csv.reader(io.StringIO(r.text, newline="")))
    assert [row[1] for row in rows[1:]] == ["'" + name for name in risky] + ["Ada"]
