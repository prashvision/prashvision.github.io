import React, { useEffect, useState } from "react";
import {
  AppState,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import LiveEffect, { Preset } from "@/src/components/effects/LiveEffect";
import { resolveMedia } from "@/src/lib/media";
import { useLiveSettings } from "@/src/lib/settings";

const C = { bg: "#0B0C10", gold: "#D4AF37", saffron: "#FF9933", text: "#F3F4F6", muted: "#9CA3AF", line: "rgba(212,175,55,.25)" };

type Item = {
  id: string;
  name: string;
  deity: string;
  thumbnailUrl: string;
  previewUrl?: string;
  isLive?: boolean;
  animationPreset?: string;
  animationConfig?: any;
};

export default function LivePreview({ item, onClose, onApply }: { item: Item | null; onClose: () => void; onApply: (i: Item) => void }) {
  const settings = useLiveSettings();
  const [bgActive, setBgActive] = useState(true);

  // Smart Battery: pause rendering when the app is not in the foreground.
  useEffect(() => {
    const sub = AppState.addEventListener("change", (s) => setBgActive(s === "active"));
    return () => sub.remove();
  }, []);

  if (!item) return null;
  const preset = (item.isLive ? item.animationPreset || "none" : "none") as Preset;
  const uri = resolveMedia(item.previewUrl || item.thumbnailUrl);

  return (
    <SafeAreaView style={s.wrap} testID="live-preview-screen">
      <View style={StyleSheet.absoluteFill}>
        <Image source={{ uri }} style={StyleSheet.absoluteFill} contentFit="cover" transition={250} />
        {item.isLive && (
          <LiveEffect
            preset={preset}
            intensity={(item.animationConfig?.intensity || "medium") as any}
            quality={settings.quality}
            animationsEnabled={settings.animations}
            particlesEnabled={settings.particles}
            paused={!bgActive}
          />
        )}
        <LinearGradient colors={["rgba(11,12,16,0.55)", "transparent", "rgba(11,12,16,0.85)"]} style={StyleSheet.absoluteFill} />
      </View>

      <View style={s.top}>
        <Pressable testID="live-preview-close" onPress={onClose} style={s.iconBtn}>
          <Ionicons name="close" size={24} color={C.text} />
        </Pressable>
        <View style={[s.pill, item.isLive ? s.pillLive : s.pillStatic]}>
          {item.isLive && <Ionicons name="sparkles" size={12} color={C.bg} />}
          <Text style={[s.pillText, { color: item.isLive ? C.bg : C.text }]}>{item.isLive ? "LIVE PREVIEW" : "STATIC PREVIEW"}</Text>
        </View>
      </View>

      <View style={s.bottom}>
        <Text style={s.eyebrow}>{item.isLive ? "JEEVANT DARSHAN" : "DIVYALIVE"}</Text>
        <Text style={s.title}>{item.name}</Text>
        <Text style={s.sub}>{item.deity}</Text>
        <Pressable testID="live-preview-apply" style={s.apply} onPress={() => onApply(item)}>
          <Ionicons name="phone-portrait-outline" size={18} color={C.bg} />
          <Text style={s.applyText}>{item.isLive ? "Set as Live Wallpaper" : "Set as Wallpaper"}</Text>
        </Pressable>
        <Text style={s.note}>
          {item.isLive
            ? "This is a real in-app live preview. Applying to your Android home screen needs the DivyaLive native build (Phase 2)."
            : "Setting your home-screen wallpaper needs the DivyaLive native build (Phase 2)."}
        </Text>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: C.bg },
  top: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 18, paddingTop: 14 },
  iconBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(11,12,16,.6)", alignItems: "center", justifyContent: "center" },
  pill: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, height: 30, borderRadius: 15 },
  pillLive: { backgroundColor: C.gold },
  pillStatic: { backgroundColor: "rgba(11,12,16,.6)", borderWidth: 1, borderColor: C.line },
  pillText: { fontSize: 11, fontWeight: "900", letterSpacing: 1 },
  bottom: { marginTop: "auto", padding: 24, paddingBottom: 34 },
  eyebrow: { fontSize: 11, letterSpacing: 1.8, color: C.gold, fontWeight: "800" },
  title: { fontSize: 30, color: C.text, fontWeight: "800", marginTop: 6 },
  sub: { color: C.muted, fontSize: 14, marginTop: 4 },
  apply: { marginTop: 20, height: 54, borderRadius: 27, backgroundColor: C.gold, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9 },
  applyText: { color: C.bg, fontWeight: "800", fontSize: 15 },
  note: { color: C.muted, fontSize: 12, lineHeight: 18, marginTop: 12, textAlign: "center" },
});
