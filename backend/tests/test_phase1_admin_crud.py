import os
import io
import requests

BASE_URL = os.environ["EXPO_BACKEND_URL"].rstrip("/")


def auth():
    response = requests.post(f"{BASE_URL}/api/auth/admin/login", json={"email": "admin@divyalive.app", "password": "DivyaLive@2026"})
    assert response.status_code == 200
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


def test_phase1_admin_crud_publish_and_upload_contract():
    headers = auth()
    json_headers = {**headers, "Content-Type": "application/json"}

    category = requests.post(f"{BASE_URL}/api/admin/categories", headers=json_headers, json={"name": "TEST_phase1_category"})
    assert category.status_code == 200 and category.json()["name"] == "TEST_phase1_category"
    category_id = category.json()["id"]
    edited_category = requests.put(f"{BASE_URL}/api/admin/categories/{category_id}", headers=json_headers, json={"name": "TEST_phase1_category_edit"})
    assert edited_category.status_code == 200 and edited_category.json()["name"] == "TEST_phase1_category_edit"

    wallpaper = requests.post(f"{BASE_URL}/api/admin/wallpapers", headers=json_headers, json={"name": "TEST_phase1_wallpaper", "category": "Mahadev", "isPublished": False})
    assert wallpaper.status_code == 200 and wallpaper.json()["isPublished"] is False
    wallpaper_id = wallpaper.json()["id"]
    publish = requests.patch(f"{BASE_URL}/api/admin/wallpapers/{wallpaper_id}/publish?published=true", headers=headers)
    assert publish.status_code == 200 and publish.json()["isPublished"] is True
    public = requests.get(f"{BASE_URL}/api/wallpapers", params={"search": "TEST_phase1_wallpaper"})
    assert any(row["id"] == wallpaper_id for row in public.json())

    darshan = requests.post(f"{BASE_URL}/api/admin/daily-darshan", headers=json_headers, json={"date": "2099-01-01", "wallpaperId": wallpaper_id, "deity": "TEST", "quote": "TEST quote", "featured": True})
    assert darshan.status_code == 200 and darshan.json()["quote"] == "TEST quote"
    darshan_id = darshan.json()["id"]
    festival = requests.post(f"{BASE_URL}/api/admin/festivals", headers=json_headers, json={"name": "TEST festival", "startDate": "2099-01-01", "endDate": "2099-01-02"})
    assert festival.status_code == 200 and festival.json()["name"] == "TEST festival"
    festival_id = festival.json()["id"]

    invalid = requests.post(f"{BASE_URL}/api/admin/uploads", headers=headers, files={"file": ("bad.txt", b"bad", "text/plain")})
    assert invalid.status_code == 415
    valid_unavailable = requests.post(f"{BASE_URL}/api/admin/uploads", headers=headers, files={"file": ("valid.png", b"png", "image/png")})
    assert valid_unavailable.status_code == 503 and "credentials" in valid_unavailable.text.lower()

    for path, item_id in [("categories", category_id), ("wallpapers", wallpaper_id), ("daily-darshan", darshan_id), ("festivals", festival_id)]:
        deleted = requests.delete(f"{BASE_URL}/api/admin/{path}/{item_id}", headers=headers)
        assert deleted.status_code == 200 and deleted.json()["ok"] is True