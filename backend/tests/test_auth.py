import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.core.database import init_db


@pytest_asyncio.fixture(scope="session", autouse=True)
async def setup():
    await init_db()
    yield


@pytest.mark.asyncio
async def test_register():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        res = await client.post("/auth/register", json={"username": "testuser", "email": "test@test.com", "password": "password123"})
        assert res.status_code == 200
        assert res.json()["username"] == "testuser"


@pytest.mark.asyncio
async def test_login():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        await client.post("/auth/register", json={"username": "loginuser", "email": "login@test.com", "password": "password123"})
        form = {"username": "loginuser", "password": "password123"}
        res = await client.post("/auth/login", data=form)
        assert res.status_code == 200
        assert "access_token" in res.json()


@pytest.mark.asyncio
async def test_duplicate_register():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        await client.post("/auth/register", json={"username": "dupuser", "email": "dup@test.com", "password": "password123"})
        res = await client.post("/auth/register", json={"username": "dupuser", "email": "dup2@test.com", "password": "password123"})
        assert res.status_code == 400
