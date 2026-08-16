# DivyaLive — Phase 2: Jeevant Darshan (Live Wallpaper)

## What works right now (Expo Go / web preview)
- Real image uploads in Admin (Emergent Object Storage) → published wallpapers appear instantly in the app, no code change.
- In-app **Live Preview** with a real animation engine (11 presets: clouds, rain, snow, petals, fire, smoke, water, lightRays, particles, stars, diya).
- LIVE / STATIC badges, "Jeevant Darshan · Live" home section.
- Settings: quality (High / Balanced / Battery Saver) + Animations/Particles toggles. Smart-battery pauses animation when app is backgrounded.

## What needs a native Android build (NOT testable in Expo Go)
Setting a wallpaper as the actual **Android system live wallpaper** requires the native
`WallpaperService`, injected by the Expo config plugin `frontend/plugins/withWallpaperService.js`.
This plugin runs only during `expo prebuild` / an EAS build — it has no effect in Expo Go or web.

### How to test "Apply as Live Wallpaper" on a device
1. Click **Publish** (top-right) to deploy, then generate an **Android build** from the deployment panel.
2. Install the build on a real Android device.
3. Open a Jeevant Darshan wallpaper → the native service is registered under Settings → Wallpaper → Live Wallpapers → "DivyaLive · Jeevant Darshan".

The Kotlin baseline (`DivyaLiveWallpaperService.kt`, generated at build time) draws the DivyaLive
canvas + a golden particle field and pauses when not visible (battery-aware). It is the hook point
to port the full JS preset engine to native GL in a later pass.

## Admin: add a live wallpaper
Profile → Open Admin Portal → sign in → Wallpapers tab → Pick & upload artwork →
toggle **Jeevant Darshan (Live)** → choose a preset → set Featured/Published → Save.
