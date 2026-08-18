# DivyaLive — Phase 2: Jeevant Darshan (Live Wallpaper)

## What works right now (Expo Go / web preview)
- Real image uploads in Admin (Emergent Object Storage) → published wallpapers appear instantly in the app, no code change.
- In-app **Live Preview** with a real, reusable animation engine — 7 curated scene presets, each composed of layered particle + light effects:
  - **Peaceful** (soft drifting light motes, warm tint)
  - **Temple** (diya glow + rising golden embers + light rays)
  - **Himalayan** (drifting clouds + light snow + cool tint)
  - **Rain** (falling rain streaks)
  - **River** (water shimmer bands + floating motes)
  - **Divine Glow** (sweeping light rays + golden particles)
  - **Night** (twinkling stars + drifting motes + night tint)
- Per-wallpaper **effect intensity** (Low / Medium / High) stored in `animationConfig.intensity`, combined with the global battery quality.
- LIVE / STATIC badges, "Jeevant Darshan · Live" home section.
- Settings: quality (High / Balanced / Battery Saver) + Animations/Particles toggles. Smart-battery pauses animation when app is backgrounded.

## What needs a native Android build (NOT testable in Expo Go)
Setting a wallpaper as the actual **Android system live wallpaper** requires the native
`WallpaperService`, injected by the Expo config plugin `frontend/plugins/withWallpaperService.js`.
This plugin runs only during `expo prebuild` / an EAS build — it has no effect in Expo Go or web.

### How to test "Apply as Live Wallpaper" on a device
1. Click **Publish** (top-right) to deploy, then generate an **Android build** from the deployment panel.
2. Install the build (APK/AAB) on a real Android device.
3. Open any wallpaper → tap **Apply Wallpaper**. On the real build a **"Open Live Wallpaper Picker"** button appears (it is hidden in Expo Go/web). Tapping it opens the Android system Live Wallpaper list.
4. Choose **"DivyaLive · Jeevant Darshan"** → Set wallpaper. It now runs on your home screen.

Under the hood the app launches the Android `LIVE_WALLPAPER_CHOOSER` intent (via `expo-intent-launcher`), and the service is registered by `plugins/withWallpaperService.js` at prebuild.

The Kotlin baseline (`DivyaLiveWallpaperService.kt`, generated at build time) draws the DivyaLive
canvas + a golden particle field and pauses when not visible (battery-aware). It is the hook point
to port the full JS preset engine to native GL in a later pass.

## Admin: add a live wallpaper
Profile → Open Admin Portal → sign in → Wallpapers tab → Pick & upload artwork →
toggle **Jeevant Darshan (Live)** → choose a preset → set Featured/Published → Save.
