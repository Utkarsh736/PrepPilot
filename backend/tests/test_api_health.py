"""API smoke via TestClient — works in demo mode with no keys."""

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health():
    r = client.get("/api/health")
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "ok"
    assert "default_provider" in body


def test_models_includes_demo():
    r = client.get("/api/models")
    assert r.status_code == 200
    ids = {m["id"] for m in r.json()["models"]}
    assert "demo" in ids


def test_create_and_fetch_session():
    r = client.post("/api/sessions")
    assert r.status_code == 200
    sid = r.json()["session_id"]
    r2 = client.get(f"/api/sessions/{sid}")
    assert r2.status_code == 200
    assert r2.json()["session_id"] == sid
    client.delete(f"/api/sessions/{sid}")
