import { useEffect, useSyncExternalStore } from "react";
import { storage } from "@/src/utils/storage";

export type Quality = "high" | "balanced" | "saver";
export type LiveSettings = {
  quality: Quality;
  animations: boolean;
  particles: boolean;
  parallax: boolean;
  notifications: boolean;
  sound: boolean;
};

const KEY = "divyalive_live_settings";
export const DEFAULT_SETTINGS: LiveSettings = {
  quality: "balanced",
  animations: true,
  particles: true,
  parallax: true,
  notifications: true,
  sound: false,
};

let current: LiveSettings = DEFAULT_SETTINGS;
let loaded = false;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

export async function loadSettings() {
  const saved = await storage.getItem<LiveSettings>(KEY, DEFAULT_SETTINGS);
  current = { ...DEFAULT_SETTINGS, ...(saved || {}) };
  loaded = true;
  emit();
}

export function getSettings(): LiveSettings {
  return current;
}

export async function updateSettings(patch: Partial<LiveSettings>) {
  current = { ...current, ...patch };
  emit();
  await storage.setItem(KEY, current);
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function useLiveSettings(): LiveSettings {
  const value = useSyncExternalStore(subscribe, getSettings, getSettings);
  useEffect(() => {
    if (!loaded) loadSettings();
  }, []);
  return value;
}
