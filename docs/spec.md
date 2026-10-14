# Spec: orders v1.1

Four small features for the orders service. Each one is independent: it can be built, tested
and reviewed on its own, in its own pull request.

## 1. Filter orders by status
`GET /orders?status=paid` returns only orders with that status, newest first.
No `status` returns every order, as today. A status that isn't `new`, `paid` or `shipped` returns 422.

## 2. Change an order's status
`PATCH /orders/{order_id}/status` with `{"status": "paid"}` updates one order and returns it.
Only `new`, `paid` and `shipped` are allowed (422 otherwise). An unknown order returns 404.

## 3. Export orders as CSV
`GET /orders.csv` downloads every order as CSV with the header
`id,customer,total_cents,status,created_at`. Totals stay in integer cents.

## 4. Stats on the page
`GET /orders/stats` returns `{"count": <int>, "total_cents": <int>}` for all orders.
The page shows them in a card above the orders table: the order count, and the total formatted as dollars.

## Done means
- Each feature has its own test file, `tests/test_<topic>.py`, and the full suite passes.
- `ruff check` and `ruff format` are clean.
- The page still loads at `/`.
