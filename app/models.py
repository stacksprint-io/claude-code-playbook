from datetime import UTC, datetime

from sqlmodel import Field, SQLModel


class Order(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    customer: str
    total_cents: int
    status: str = "new"  # new | paid | shipped
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class OrderCreate(SQLModel):
    customer: str
    total_cents: int
