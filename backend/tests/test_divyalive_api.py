import os
import requests
import pytest

BASE_URL = os.environ.get("EXPO_BACKEND_URL", "https://deity-live-launch.preview.emergentagent.com").rstrip("/")

@pytest.fixture(scope="module")
def client():
    return requests.Session()

def test_health(client):
    r = client.get(f"{BASE_URL}/api/health")
    assert r.status_code == 200 and r.json()["status"] == "ok"

def test_public_content(client):
    categories = client.get(f"{BASE_URL}/api/categories")
    wallpapers = client.get(f"{BASE_URL}/api/wallpapers")
    darshan = client.get(f"{BASE_URL}/api/daily-darshan")
    assert categories.status_code == wallpapers.status_code == darshan.status_code == 200
    assert len(categories.json()) >= 1 and len(wallpapers.json()) >= 1
    assert darshan.json()["wallpaperId"]

def test_search_filters(client):
    r = client.get(f"{BASE_URL}/api/wallpapers", params={"search": "Krishna"})
    assert r.status_code == 200 and r.json()
    assert all("krishna" in (w["name"] + w["deity"] + w["category"]).lower() or any("krishna" in t.lower() for t in w["tags"]) for w in r.json())

def test_admin_login_and_dashboard(client):
    r = client.post(f"{BASE_URL}/api/auth/admin/login", json={"email":"admin@divyalive.app","password":"DivyaLive@2026"})
    assert r.status_code == 200 and r.json().get("access_token")
    token = r.json()["access_token"]
    d = client.get(f"{BASE_URL}/api/admin/dashboard", headers={"Authorization":f"Bearer {token}"})
    assert d.status_code == 200 and d.json()["wallpapers"] >= 1

def test_admin_rejected_without_token(client):
    r = client.get(f"{BASE_URL}/api/admin/dashboard")
    assert r.status_code == 401

def test_category_create_persists(client):
    login = client.post(f"{BASE_URL}/api/auth/admin/login", json={"email":"admin@divyalive.app","password":"DivyaLive@2026"})
    token = login.json()["access_token"]
    name = "TEST_regression_category"
    headers = {"Authorization":f"Bearer {token}"}
    r = client.post(f"{BASE_URL}/api/admin/categories", headers=headers, json={"name":name})
    assert r.status_code == 200 and r.json()["name"] == name
    item_id = r.json()["id"]
    listing = client.get(f"{BASE_URL}/api/admin/categories", headers=headers)
    assert any(x["id"] == item_id and x["name"] == name for x in listing.json())
    client.delete(f"{BASE_URL}/api/admin/categories/{item_id}", headers=headers)