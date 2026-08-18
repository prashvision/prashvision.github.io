# DivyaLive — Devotional Live Wallpaper App

## Problem statement
Premium, content-driven devotional wallpaper app (Indian deities) with a responsive web admin. Phase 1 = catalog/browse/favorites/admin. Phase 2 = "Jeevant Darshan" live wallpaper engine + animations, real cloud image uploads, battery settings — while preserving all Phase 1 behaviour.

## Architecture
- Expo SDK 54 (React Native) client, tab navigation, AsyncStorage favorites, local live-wallpaper settings.
- FastAPI + MongoDB (`/api`). Content = UUID docs. Seeded demo assets are inline base64; admin-uploaded assets go to Emergent Object Storage and are served via `GET /api/files/{path}`.
- JWT-protected admin routes: dashboard, wallpaper/category/festival/daily-darshan CRUD, publish/unpublish, uploads.
- Phase 2 animation engine is a reusable Reanimated overlay (`src/components/effects/LiveEffect.tsx`) rendering 11 presets. Native Android `WallpaperService` is scaffolded via an Expo config plugin (`plugins/withWallpaperService.js`) applied only at prebuild/EAS build.

## Personas
- Guest devotee: browses, searches, previews live wallpapers, saves favorites locally.
- Admin/content manager: signs in, uploads real artwork, marks Live + animation preset, publishes.

## Core requirements implemented
- Phase 1: Home, Categories, Daily Darshan (Hindi), Favorites, Profile, Search, detail, admin studio, dynamic content.
- Phase 2 (this session):
  - Emergent Object Storage: real image/MP4 upload (`POST /api/admin/uploads`) + serving (`GET /api/files/{path}`). Replaced the old 503 mock.
  - Wallpaper model extended (backwards compatible): `isLive`, `animationPreset`, `animationConfig`, `qualityDefault`. Startup migration backfills existing docs and marks featured demo art Live (Mahadev→clouds, Krishna→petals, Ganesh→particles, Temple→lightRays).
  - Jeevant Darshan animation engine (clouds, rain, snow, petals, fire, smoke, water, lightRays, particles, stars, diya) with quality scaling + smart-battery pause on background.
  - In-app Live Preview screen; LIVE/STATIC badges on hero + cards; Home "Jeevant Darshan", "Festival Specials", "Peaceful & Meditation" sections.
  - Apply Wallpaper is honest: distinct from Preview, explains it needs the native Android build (Phase 2) — does not fake it.
  - Settings screen: Quality (High/Balanced/Battery Saver), Animations/Particles/Parallax toggles, Notifications/Sound.
  - Admin: pick+upload artwork, Live toggle + preset chips, Featured/Published toggles, thumbnails + status in lists.
  - Native `WallpaperService` config plugin + XML + Kotlin baseline engine (test only on a dev build).

## Prioritized backlog
- P1: user accounts + cloud favorites sync; download manager; festival active-feed UI; admin edit modal for existing wallpapers.
- P2 (Phase 3+): full native GL particle engine, sound, time-based wallpapers, subscriptions/ads, AI generation, cloud sync.

## Implementation log
- 2026-02-14: Phase 1 backend, seed content, mobile UI, admin portal.
- 2026-06 (this session): Object Storage uploads + Phase 2 Jeevant Darshan live engine, settings, badges, native config plugin.
- 2026-06 (Phase 2 presets): Reworked the engine into 7 curated scene presets (peaceful, temple, himalayan, rain, river, divineGlow, night) composed of layered particle/light effects; added per-wallpaper effect intensity (low/medium/high) in `animationConfig`; remapped demo data (Mahadev→himalayan, Krishna→river, Ganesh→divineGlow, Temple→temple); added admin preset + intensity controls; wired real Apply via Android LIVE_WALLPAPER_CHOOSER (expo-intent-launcher) shown only on native builds. Verified: 18/18 backend + full frontend regression.

## Native build note
"Apply as Live Wallpaper" and the Kotlin `DivyaLiveWallpaperService` only work in an Android development/production build (via Publish → build), NEVER in Expo Go. The in-app Live Preview fully works in Expo Go/web.
