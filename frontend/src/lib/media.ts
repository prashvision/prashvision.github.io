import Constants from "expo-constants";

// Base host for the backend. Uploaded assets are served from `${BACKEND}/api/files/...`
// while seeded demo assets are inline `data:` URIs. `resolveMedia` normalises both.
export const BACKEND: string =
  (Constants.expoConfig?.extra as any)?.backendUrl || process.env.EXPO_PUBLIC_BACKEND_URL || "";
export const API = `${BACKEND}/api`;

export function resolveMedia(url?: string | null): string | undefined {
  if (!url) return undefined;
  if (url.startsWith("http") || url.startsWith("data:")) return url;
  return `${BACKEND}${url.startsWith("/") ? "" : "/"}${url}`;
}
