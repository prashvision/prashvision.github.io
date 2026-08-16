import { Platform } from "react-native";
import Constants from "expo-constants";
import * as IntentLauncher from "expo-intent-launcher";

// Expo Go reports appOwnership === "expo". A dev/standalone build reports "standalone" or null.
export const isExpoGo = Constants.appOwnership === "expo";

// The native Live Wallpaper "Apply" flow only exists in a real Android build
// (the WallpaperService is injected by plugins/withWallpaperService.js at prebuild).
export const canApplyNative = Platform.OS === "android" && !isExpoGo;

const LIVE_WALLPAPER_CHOOSER = "android.service.wallpaper.LIVE_WALLPAPER_CHOOSER";

/**
 * Opens the Android system Live Wallpaper picker so the user can select
 * "DivyaLive · Jeevant Darshan" and apply it to their home screen.
 * Returns true if a system chooser was launched, false if not supported
 * (Expo Go / web / iOS) or if it failed.
 */
export async function openLiveWallpaperChooser(): Promise<boolean> {
  if (!canApplyNative) return false;
  try {
    await IntentLauncher.startActivityAsync(LIVE_WALLPAPER_CHOOSER as any);
    return true;
  } catch {
    // Fallback: general wallpaper settings, so the user is never dead-ended.
    try {
      await IntentLauncher.startActivityAsync("android.intent.action.SET_WALLPAPER" as any);
      return true;
    } catch {
      return false;
    }
  }
}
