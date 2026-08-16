"""Phase 2 backend tests: object-storage upload fix + live wallpaper metadata."""
import io
import os
import struct
import zlib
import uuid
import pytest
import requests

BASE_URL = os.environ.get("EXPO_BACKEND_URL", "https://deity-live-launch.preview.emergentagent.com").rstrip("/")
ADMIN_EMAIL = "admin@divyalive.app"
ADMIN_PASSWORD = "DivyaLive@2026"


def _png_bytes():
    # 1x1 red PNG
    sig = b"\x89PNG\r\n\x1a\n"
    def chunk(t, d):
        return struct.pack(">I", len(d)) + t + d + struct.pack(">I", zlib.crc32(t + d) & 0xffffffff)
    ihdr = chunk(b"IHDR", struct.pack(">IIBBBBB", 1, 1, 8, 2, 0, 0, 0))
    raw = b"\x00\xff\x00\x00"
    idat = chunk(b"IDAT", zlib.compress(raw))
    iend = chunk(b"IEND", b"")
    return sig + ihdr + idat + iend


@pytest.fixture(scope="module")
def client():
    s = requests.Session()
    return s


@pytest.fixture(scope="module")
def admin_token(client):
    r = client.post(f"{BASE_URL}/api/auth/admin/login",
                    json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200, r.text
    return r.json()["access_token"]


# ---- BUG FIX P0: real object-storage upload ----
class TestUpload:
    def test_upload_requires_auth(self, client):
        r = client.post(f"{BASE_URL}/api/admin/uploads")
        assert r.status_code == 401

    def test_upload_rejects_bad_mime(self, client, admin_token):
        files = {"file": ("hello.txt", b"hi", "text/plain")}
        r = client.post(f"{BASE_URL}/api/admin/uploads",
                        headers={"Authorization": f"Bearer {admin_token}"}, files=files)
        assert r.status_code == 415

    def test_upload_png_returns_200_and_serves_bytes(self, client, admin_token):
        png = _png_bytes()
        files = {"file": ("test.png", png, "image/png")}
        r = client.post(f"{BASE_URL}/api/admin/uploads",
                        headers={"Authorization": f"Bearer {admin_token}"}, files=files)
        assert r.status_code == 200, f"Upload should NOT be 503 anymore. Got {r.status_code}: {r.text}"
        body = r.json()
        assert body["contentType"] == "image/png"
        assert body["size"] == len(png)
        assert body["url"].startswith("/api/files/")
        assert body["path"] and body["path"].startswith("divyalive/uploads/")

        # verify /api/files/{path} serves bytes back publicly
        f = client.get(f"{BASE_URL}{body['url']}")
        assert f.status_code == 200
        assert f.headers.get("Content-Type", "").startswith("image/png")
        assert f.content == png

        # Save for downstream test
        pytest.uploaded_url = body["url"]

    def test_files_missing_returns_404(self, client):
        r = client.get(f"{BASE_URL}/api/files/divyalive/uploads/does-not-exist-{uuid.uuid4()}.png")
        assert r.status_code == 404


# ---- END-TO-END: uploaded url used as wallpaper thumbnail ----
class TestWallpaperWithUpload:
    created_id = None

    def test_create_wallpaper_with_uploaded_thumbnail(self, client, admin_token):
        url = getattr(pytest, "uploaded_url", None)
        if not url:
            pytest.skip("upload didn't happen")
        payload = {
            "name": "TEST_phase2_upload_wallpaper",
            "description": "e2e",
            "deity": "Krishna",
            "category": "Shri Krishna",
            "tags": ["test"],
            "thumbnailUrl": url,
            "isPublished": True,
            "isLive": True,
            "animationPreset": "petals",
            "qualityDefault": "high",
            "type": "live",
        }
        r = client.post(f"{BASE_URL}/api/admin/wallpapers",
                        headers={"Authorization": f"Bearer {admin_token}"}, json=payload)
        assert r.status_code == 200, r.text
        item = r.json()
        assert item["thumbnailUrl"] == url
        assert item["isLive"] is True and item["animationPreset"] == "petals"
        TestWallpaperWithUpload.created_id = item["id"]

    def test_new_wallpaper_appears_publicly(self, client):
        wid = TestWallpaperWithUpload.created_id
        if not wid:
            pytest.skip("no wallpaper created")
        r = client.get(f"{BASE_URL}/api/wallpapers")
        assert r.status_code == 200
        listing = r.json()
        found = next((w for w in listing if w["id"] == wid), None)
        assert found is not None
        assert found["isLive"] is True
        assert found["animationPreset"] == "petals"
        assert found["qualityDefault"] == "high"
        assert found["thumbnailUrl"].startswith("/api/files/")

    def test_cleanup(self, client, admin_token):
        wid = TestWallpaperWithUpload.created_id
        if wid:
            client.delete(f"{BASE_URL}/api/admin/wallpapers/{wid}",
                          headers={"Authorization": f"Bearer {admin_token}"})


# ---- PHASE 2 FIELDS on public wallpapers ----
class TestPhase2Fields:
    def test_public_wallpapers_have_phase2_fields(self, client):
        r = client.get(f"{BASE_URL}/api/wallpapers")
        assert r.status_code == 200
        walls = r.json()
        assert len(walls) >= 1
        required = {"isLive", "animationPreset", "animationConfig", "qualityDefault", "type"}
        for w in walls:
            missing = required - set(w.keys())
            assert not missing, f"Wallpaper {w.get('name')} missing {missing}"

    def test_featured_demo_live_presets(self, client):
        r = client.get(f"{BASE_URL}/api/wallpapers")
        walls = r.json()
        expected = {"Mahadev": "clouds", "Krishna": "petals",
                    "Ganesh Ji": "particles", "Temple": "lightRays"}
        for deity, preset in expected.items():
            featured = [w for w in walls if w["deity"] == deity and w.get("isFeatured")]
            assert featured, f"No featured wallpaper for {deity}"
            fw = featured[0]
            assert fw["isLive"] is True, f"{deity} featured must be live"
            assert fw["animationPreset"] == preset, f"{deity} preset should be {preset}, got {fw['animationPreset']}"
            assert fw["type"] == "live"

    def test_non_featured_static(self, client):
        r = client.get(f"{BASE_URL}/api/wallpapers")
        walls = r.json()
        non_featured = [w for w in walls if not w.get("isFeatured")]
        for w in non_featured:
            assert w["isLive"] is False, f"{w['name']} should be static"
            assert w["animationPreset"] == "none"


# ---- Existing endpoints regression ----
class TestRegression:
    def test_health(self, client):
        assert client.get(f"{BASE_URL}/api/health").status_code == 200

    def test_search(self, client):
        r = client.get(f"{BASE_URL}/api/wallpapers", params={"search": "krishna"})
        assert r.status_code == 200 and len(r.json()) >= 1

    def test_daily_darshan_hindi(self, client):
        r = client.get(f"{BASE_URL}/api/daily-darshan")
        assert r.status_code == 200
        d = r.json()
        # Hindi contains devanagari script (deity or quote should have unicode > 0x0900)
        assert any(0x0900 <= ord(c) <= 0x097F for c in (d.get("quote", "") + d.get("deity", "")))

    def test_admin_endpoints_require_auth(self, client):
        for ep in ["/api/admin/dashboard", "/api/admin/wallpapers",
                   "/api/admin/categories", "/api/admin/daily-darshan", "/api/admin/festivals"]:
            r = client.get(f"{BASE_URL}{ep}")
            assert r.status_code == 401, f"{ep} should require auth"

    def test_admin_dashboard(self, client, admin_token):
        r = client.get(f"{BASE_URL}/api/admin/dashboard",
                       headers={"Authorization": f"Bearer {admin_token}"})
        assert r.status_code == 200
        d = r.json()
        assert d["wallpapers"] >= 1 and d["categories"] >= 1
