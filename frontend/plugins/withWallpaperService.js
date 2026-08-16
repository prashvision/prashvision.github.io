/**
 * DivyaLive — Phase 2 native Android Live Wallpaper config plugin.
 *
 * Registers a system `WallpaperService` ("Jeevant Darshan") into the generated
 * Android project WITHOUT ejecting from Expo. It is applied only during
 * `expo prebuild` / an EAS build — it has NO effect in Expo Go or the web
 * preview, so the JS app (static + in-app live preview) keeps working as-is.
 *
 * The Kotlin service below is a minimal, buildable baseline that draws the
 * wallpaper background and an animated glow. It is the documented hook point
 * where the full particle engine (mirroring src/components/effects/LiveEffect)
 * is wired for the real home-screen live wallpaper.
 *
 * NOTE: "Apply as Live Wallpaper" can only be verified on a real Android
 * development/production build — never in Expo Go.
 */
const { withAndroidManifest, withDangerousMod, AndroidConfig } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

const SERVICE_NAME = "DivyaLiveWallpaperService";

function withManifestService(config) {
  return withAndroidManifest(config, (cfg) => {
    const app = AndroidConfig.Manifest.getMainApplicationOrThrow(cfg.modResults);
    app.service = app.service || [];
    const exists = app.service.find(
      (s) => s.$ && s.$["android:name"] === `.${SERVICE_NAME}`
    );
    if (!exists) {
      app.service.push({
        $: {
          "android:name": `.${SERVICE_NAME}`,
          "android:label": "DivyaLive · Jeevant Darshan",
          "android:permission": "android.permission.BIND_WALLPAPER",
          "android:exported": "true",
        },
        "intent-filter": [
          { action: [{ $: { "android:name": "android.service.wallpaper.WallpaperService" } }] },
        ],
        "meta-data": [
          {
            $: {
              "android:name": "android.service.wallpaper",
              "android:resource": "@xml/divya_wallpaper",
            },
          },
        ],
      });
    }
    return cfg;
  });
}

const WALLPAPER_XML = `<?xml version="1.0" encoding="utf-8"?>
<wallpaper xmlns:android="http://schemas.android.com/apk/res/android"
    android:thumbnail="@mipmap/ic_launcher"
    android:description="@string/app_name" />
`;

function kotlinService(pkg) {
  return `package ${pkg}

import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.os.Handler
import android.os.Looper
import android.service.wallpaper.WallpaperService
import android.view.SurfaceHolder
import kotlin.random.Random

/**
 * Minimal Jeevant Darshan live wallpaper baseline.
 * Draws the DivyaLive dark canvas + a gently rising golden particle field.
 * Extend drawFrame() to load the selected wallpaper bitmap + preset engine.
 */
class ${SERVICE_NAME} : WallpaperService() {
    override fun onCreateEngine(): Engine = DivyaEngine()

    inner class DivyaEngine : Engine() {
        private val handler = Handler(Looper.getMainLooper())
        private var visible = true
        private var width = 0
        private var height = 0
        private val paint = Paint().apply { isAntiAlias = true }
        private val particles = ArrayList<FloatArray>() // x, y, size, speed
        private val drawRunner = Runnable { drawFrame() }

        private fun seed() {
            particles.clear()
            val count = 40
            for (i in 0 until count) {
                particles.add(
                    floatArrayOf(
                        Random.nextFloat() * width,
                        Random.nextFloat() * height,
                        3f + Random.nextFloat() * 5f,
                        0.4f + Random.nextFloat() * 1.2f
                    )
                )
            }
        }

        override fun onVisibilityChanged(v: Boolean) {
            visible = v
            // Smart battery: only animate while the wallpaper is visible.
            if (v) handler.post(drawRunner) else handler.removeCallbacks(drawRunner)
        }

        override fun onSurfaceChanged(holder: SurfaceHolder, format: Int, w: Int, h: Int) {
            width = w; height = h; seed(); drawFrame()
        }

        override fun onSurfaceDestroyed(holder: SurfaceHolder) {
            visible = false
            handler.removeCallbacks(drawRunner)
        }

        private fun drawFrame() {
            val holder = surfaceHolder
            var canvas: Canvas? = null
            try {
                canvas = holder.lockCanvas()
                if (canvas != null) {
                    canvas.drawColor(Color.parseColor("#0B0C10"))
                    paint.color = Color.parseColor("#D4AF37")
                    for (p in particles) {
                        paint.alpha = 180
                        canvas.drawCircle(p[0], p[1], p[2], paint)
                        p[1] -= p[3]
                        if (p[1] < -10f) { p[1] = height + 10f; p[0] = Random.nextFloat() * width }
                    }
                }
            } finally {
                if (canvas != null) holder.unlockCanvasAndPost(canvas)
            }
            handler.removeCallbacks(drawRunner)
            if (visible) handler.postDelayed(drawRunner, 1000L / 30L)
        }
    }
}
`;
}

function withNativeFiles(config) {
  return withDangerousMod(config, [
    "android",
    async (cfg) => {
      const root = cfg.modRequest.platformProjectRoot;
      const pkg =
        (cfg.android && cfg.android.package) ||
        (config.android && config.android.package) ||
        "com.divyalive.app";

      // res/xml/divya_wallpaper.xml
      const xmlDir = path.join(root, "app", "src", "main", "res", "xml");
      fs.mkdirSync(xmlDir, { recursive: true });
      fs.writeFileSync(path.join(xmlDir, "divya_wallpaper.xml"), WALLPAPER_XML);

      // Kotlin service under the app package path
      const javaDir = path.join(root, "app", "src", "main", "java", ...pkg.split("."));
      fs.mkdirSync(javaDir, { recursive: true });
      fs.writeFileSync(path.join(javaDir, `${SERVICE_NAME}.kt`), kotlinService(pkg));

      return cfg;
    },
  ]);
}

module.exports = function withWallpaperService(config) {
  config = withManifestService(config);
  config = withNativeFiles(config);
  return config;
};
