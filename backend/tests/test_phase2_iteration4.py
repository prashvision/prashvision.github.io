"""Phase 2 iteration 4 tests: 7 curated preset engine + per-wallpaper intensity."""
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

VALID_PRESETS = {"peaceful", "temple", "himalayan", "rain", "river", "divineGlow", "night"}
OLD_PRESETS = {"clouds", "petals", "particles", "lightRays", "snow", "fire"}


def _png_bytes():
    sig = b"\x89PNG\r\n\x1a\n"

    def chunk(t, d):
        return struct.pack(">I", len(d)) + t + d + struct.pack(">I", zlib.crc32(t + d) & 0xffffffff)

    ihdr = chunk(b"IHDR", struct.pack(">IIBBBBB", 1, 1, 8, 2, 0, 0, 0))
    idat = chunk(b"IDAT", zlib.compress(b"\x00\xff\x00\x00"))
    iend = chunk(b"IEND", b"")
    return sig + ihdr + idat + iend


@pytest.fixture(scope="module")
def client():
    return requests.Session()


@pytest.fixture(scope="module")
def admin_token(client):
    r = client.post(f"{BASE_URL}/api/auth/admin/login",
                    json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200, r.text
    body = r.json()
    assert "access_token" in body
    return body["access_token"]


# ---- Curated preset engine ----
class TestCuratedPresets:
    def test_wallpapers_count_at_least_10(self, client):
        r = client.get(f"{BASE_URL}/api/wallpapers")
        assert r.status_code == 200
        walls = r.json()
        assert len(walls) >= 10, f"expected >=10 wallpapers, got {len(walls)}"

    def test_no_old_preset_names(self, client):
        r = client.get(f"{BASE_URL}/api/wallpapers")
        walls = r.json()
        offenders = [(w["name"], w.get("animationPreset")) for w in walls
                     if w.get("animationPreset") in OLD_PRESETS]
        assert not offenders, f"Old presets still present: {offenders}"

    def test_all_presets_valid_or_none(self, client):
        r = client.get(f"{BASE_URL}/api/wallpapers")
        walls = r.json()
        for w in walls:
            p = w.get("animationPreset")
            assert p in VALID_PRESETS or p == "none", f"{w['name']} has invalid preset {p}"

    def test_featured_four_curated_presets(self, client):
        r = client.get(f"{BASE_URL}/api/wallpapers")
        walls = r.json()
        expected = {"Mahadev": "himalayan", "Krishna": "river",
                    "Ganesh Ji": "divineGlow", "Temple": "temple"}
        for deity, preset in expected.items():
            featured = [w for w in walls if w["deity"] == deity and w.get("isFeatured")]
            assert featured, f"No featured wallpaper for {deity}"
            fw = featured[0]
            assert fw["isLive"] is True, f"{deity} featured must be live"
            assert fw["animationPreset"] == preset, f"{deity} preset should be {preset}, got {fw['animationPreset']}"
            assert fw["type"] == "live"
            assert fw.get("animationConfig", {}).get("intensity") == "medium", \
                f"{deity} intensity should be 'medium', got {fw.get('animationConfig')}"

    def test_non_live_have_preset_none(self, client):
        r = client.get(f"{BASE_URL}/api/wallpapers")
        walls = r.json()
        for w in walls:
            if not w.get("isLive"):
                assert w.get("animationPreset") == "none", \
                    f"non-live {w['name']} should have animationPreset='none', got {w.get('animationPreset')}"


# ---- Upload regression ----
class TestUploadRegression:
    def test_upload_png_returns_200(self, client, admin_token):
        png = _png_bytes()
        files = {"file": ("test.png", png, "image/png")}
        r = client.post(f"{BASE_URL}/api/admin/uploads",
                        headers={"Authorization": f"Bearer {admin_token}"}, files=files)
        assert r.status_code == 200, f"upload must NOT 503 anymore. got {r.status_code}: {r.text[:200]}"
        body = r.json()
        assert body["url"].startswith("/api/files/")
        assert body["contentType"] == "image/png"
        assert body["size"] == len(png)
        # Serve back
        f = client.get(f"{BASE_URL}{body['url']}")
        assert f.status_code == 200
        assert f.content == png
        pytest.uploaded_url = body["url"]

    def test_upload_bad_mime_rejected(self, client, admin_token):
        r = client.post(f"{BASE_URL}/api/admin/uploads",
                        headers={"Authorization": f"Bearer {admin_token}"},
                        files={"file": ("a.txt", b"hi", "text/plain")})
        assert r.status_code == 415

    def test_upload_requires_auth(self, client):
        r = client.post(f"{BASE_URL}/api/admin/uploads")
        assert r.status_code == 401


# ---- Live wallpaper create with new preset+intensity ----
class TestCreateLiveWithIntensity:
    created_id = None

    def test_create_live_temple_high_intensity(self, client, admin_token):
        payload = {
            "name": f"TEST_it4_temple_{uuid.uuid4().hex[:6]}",
            "description": "e2e it4",
            "deity": "Temple",
            "category": "Temple",
            "tags": ["test"],
            "thumbnailUrl": "",
            "isPublished": True,
            "isLive": True,
            "animationPreset": "temple",
            "animationConfig": {"intensity": "high"},
            "qualityDefault": "balanced",
            "type": "live",
        }
        r = client.post(f"{BASE_URL}/api/admin/wallpapers",
                        headers={"Authorization": f"Bearer {admin_token}"}, json=payload)
        assert r.status_code == 200, r.text
        item = r.json()
        assert item["isLive"] is True
        assert item["animationPreset"] == "temple"
        assert item["animationConfig"]["intensity"] == "high"
        TestCreateLiveWithIntensity.created_id = item["id"]

    def test_new_wallpaper_appears_publicly(self, client):
        wid = TestCreateLiveWithIntensity.created_id
        assert wid
        r = client.get(f"{BASE_URL}/api/wallpapers")
        assert r.status_code == 200
        found = next((w for w in r.json() if w["id"] == wid), None)
        assert found, "created wallpaper missing from public feed"
        assert found["isLive"] is True
        assert found["animationPreset"] == "temple"
        assert found["animationConfig"]["intensity"] == "high"
        assert found["type"] == "live"

    def test_cleanup(self, client, admin_token):
        wid = TestCreateLiveWithIntensity.created_id
        if wid:
            r = client.delete(f"{BASE_URL}/api/admin/wallpapers/{wid}",
                              headers={"Authorization": f"Bearer {admin_token}"})
            assert r.status_code == 200
            # verify gone
            g = client.get(f"{BASE_URL}/api/wallpapers")
            assert not any(w["id"] == wid for w in g.json())


# ---- Regression: existing endpoints ----
class TestRegression:
    def test_health(self, client):
        r = client.get(f"{BASE_URL}/api/health")
        assert r.status_code == 200
        assert r.json().get("status") == "ok"

    def test_categories(self, client):
        r = client.get(f"{BASE_URL}/api/categories")
        assert r.status_code == 200
        cats = r.json()
        assert isinstance(cats, list) and len(cats) >= 1

    def test_daily_darshan_hindi(self, client):
        r = client.get(f"{BASE_URL}/api/daily-darshan")
        assert r.status_code == 200
        d = r.json()
        combined = (d.get("quote", "") + d.get("deity", ""))
        assert any(0x0900 <= ord(c) <= 0x097F for c in combined), "expected devanagari"

    def test_search_krishna(self, client):
        r = client.get(f"{BASE_URL}/api/wallpapers", params={"search": "krishna"})
        assert r.status_code == 200
        walls = r.json()
        assert len(walls) >= 1
        assert any("krishna" in (w.get("name", "") + w.get("deity", "")).lower() for w in walls)

    def test_admin_requires_jwt(self, client):
        for ep in ["/api/admin/dashboard", "/api/admin/wallpapers",
                   "/api/admin/categories", "/api/admin/daily-darshan", "/api/admin/festivals"]:
            r = client.get(f"{BASE_URL}{ep}")
            assert r.status_code == 401, f"{ep} should require auth"

    def test_admin_dashboard(self, client, admin_token):
        r = client.get(f"{BASE_URL}/api/admin/dashboard",
                       headers={"Authorization": f"Bearer {admin_token}"})
        assert r.status_code == 200
        d = r.json()
        assert d["wallpapers"] >= 1
        assert d["categories"] >= 1

    def test_publish_unpublish_cycle(self, client, admin_token):
        # pick a random non-featured wallpaper
        r = client.get(f"{BASE_URL}/api/wallpapers")
        candidate = next(w for w in r.json() if not w.get("isFeatured"))
        wid = candidate["id"]
        orig = candidate["isPublished"]
        hdrs = {"Authorization": f"Bearer {admin_token}"}
        # toggle publish state
        r = client.patch(f"{BASE_URL}/api/admin/wallpapers/{wid}/publish",
                         headers=hdrs, params={"published": str(not orig).lower()})
        assert r.status_code == 200, r.text
        assert r.json()["isPublished"] is (not orig)
        # restore
        r = client.patch(f"{BASE_URL}/api/admin/wallpapers/{wid}/publish",
                         headers=hdrs, params={"published": str(orig).lower()})
        assert r.status_code == 200
        assert r.json()["isPublished"] is orig
