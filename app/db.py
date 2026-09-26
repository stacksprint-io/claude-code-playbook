"""SQLite via SQLModel. One file, one engine, one session factory."""

import os

from sqlmodel import Session, SQLModel, create_engine

DB_PATH = os.environ.get("ORDERS_DB", "orders.db")
engine = create_engine(f"sqlite:///{DB_PATH}", connect_args={"check_same_thread": False})


def init_db() -> None:
    SQLModel.metadata.create_all(engine)


def get_session():
    with Session(engine) as session:
        yield session
