# DivyaLive Phase 1

## Problem statement
Build a premium, content-driven devotional wallpaper browsing app with a separate responsive admin workspace. Phase 1 deliberately excludes live wallpaper engine, payments, ads, and AI generation.

## Architecture
- Expo SDK 54 mobile client with tab-style navigation and local AsyncStorage favorites.
- FastAPI + MongoDB API under `/api`; content entities are identified by UUIDs and expose base64 image data for the seeded demo assets.
- JWT-protected admin routes support dashboard metrics, wallpaper/category CRUD, and festival/daily-darshan foundations.
- Future live wallpaper, sync, billing, notifications, and AI layers can attach to the existing wallpaper metadata and content APIs.

## Personas
- Guest devotee: browses, searches, views darshan, and saves favorites locally.
- Admin/content manager: signs into the separate admin portal and publishes devotional catalog content.

## Core requirements implemented
- Home, Categories, Daily Darshan, Favorites, Profile screens.
- Dynamic categories, wallpapers, search, detail preview, favorite persistence, and Hindi darshan quote.
- Admin login, metrics dashboard, wallpaper listing, category creation, wallpaper/category API CRUD, festival and daily-darshan API foundations.
- Seeded licensed-safe generated demo artwork clearly marked as demo content.

## Prioritized backlog
- P0: finish binary upload form/storage adapter and full admin edit/delete modal UX.
- P1: user accounts and cloud favorites sync; active festival feed; download manager.
- P2: Phase 2 live wallpaper engine, animation layers, sound, battery controls, monetization, AI generation.

## Implementation log
- 2026-02-14: Phase 1 backend, seed content, mobile UI, detail/favorites/search, and admin portal implemented.