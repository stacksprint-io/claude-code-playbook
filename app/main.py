"""Orders service: FastAPI + SQLite + a Bootstrap page. Small on purpose."""

from contextlib import asynccontextmanager

import os
from fastapi import Depends, FastAPI, HTTPException
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from sqlmodel import Session, col, select

from .db import get_session, init_db
from .models import Order, OrderCreate


@asynccontextmanager
async def lifespan(_: FastAPI):
    init_db()
    yield


app = FastAPI(title="orders", lifespan=lifespan)
app.mount("/static", StaticFiles(directory="static"), name="static")


@app.get("/", response_class=HTMLResponse)
def index() -> str:
    with open("static/index.html", encoding="utf-8") as f:
        return f.read()


@app.get("/orders", response_model=list[Order])
def list_orders(session: Session = Depends(get_session)) -> list[Order]:
    return list(session.exec(select(Order).order_by(col(Order.id).desc())))


@app.post("/orders", response_model=Order, status_code=201)
def create_order(payload: OrderCreate, session: Session = Depends(get_session)) -> Order:
    if payload.total_cents < 0:
        raise HTTPException(status_code=422, detail="total_cents must be >= 0")
    order = Order(customer=payload.customer, total_cents=payload.total_cents)
    session.add(order)
    session.commit()
    session.refresh(order)
    return order


@app.get("/orders/{order_id}", response_model=Order)
def get_order(order_id: int, session: Session = Depends(get_session)) -> Order:
    order = session.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="order not found")
    return order


@app.patch("/orders/{order_id}/pay", response_model=Order)
def pay_order(order_id: int, session: Session = Depends(get_session)) -> Order:
    order = session.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="order not found")
    order.status = "paid"
    session.add(order)
    session.commit()
    session.refresh(order)
    return order
