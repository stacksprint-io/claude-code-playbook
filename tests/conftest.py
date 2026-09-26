import os
import tempfile

import pytest

# Point the app at a throwaway database BEFORE it is imported.
os.environ["ORDERS_DB"] = os.path.join(tempfile.mkdtemp(), "test.db")

from fastapi.testclient import TestClient
from sqlmodel import SQLModel

from app.db import engine
from app.main import app


@pytest.fixture()
def client():
    SQLModel.metadata.drop_all(engine)
    SQLModel.metadata.create_all(engine)
    with TestClient(app) as c:
        yield c
