import React from "react";
import { Modal, Pressable, SafeAreaView, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Quality, useLiveSettings, updateSettings } from "@/src/lib/settings";

const C = { bg: "#0B0C10", surface: "#151821", gold: "#D4AF37", saffron: "#FF9933", text: "#F3F4F6", muted: "#9CA3AF", line: "rgba(212,175,55,.2)" };

const QUALITY: { key: Quality; label: string; hint: string }[] = [
  { key: "high", label: "High", hint: "Full effects · 60fps" },
  { key: "balanced", label: "Balanced", hint: "Recommended" },
  { key: "saver", label: "Battery Saver", hint: "Fewer particles" },
];

export default function SettingsModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const s = useLiveSettings();

  const Row = ({ testID, label, hint, value, onToggle }: any) => (
    <View style={x.row}>
      <View style={{ flex: 1 }}>
        <Text style={x.rowLabel}>{label}</Text>
        {hint ? <Text style={x.rowHint}>{hint}</Text> : null}
      </View>
      <Switch
        testID={testID}
        value={value}
        onValueChange={onToggle}
        trackColor={{ true: C.gold, false: "#333" }}
        thumbColor={value ? "#fff" : "#888"}
      />
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={x.safe} testID="settings-screen">
        <View style={x.header}>
          <Text style={x.title}>Settings</Text>
          <Pressable testID="settings-close" onPress={onClose} style={x.iconBtn}>
            <Ionicons name="close" size={24} color={C.text} />
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={x.body}>
          <Text style={x.section}>LIVE WALLPAPER QUALITY</Text>
          <View style={x.card}>
            {QUALITY.map((q) => {
              const active = s.quality === q.key;
              return (
                <Pressable
                  key={q.key}
                  testID={`quality-${q.key}`}
                  style={[x.quality, active && x.qualityActive]}
                  onPress={() => updateSettings({ quality: q.key })}
                >
                  <Ionicons
                    name={active ? "radio-button-on" : "radio-button-off"}
                    size={20}
                    color={active ? C.gold : C.muted}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={[x.rowLabel, active && { color: C.gold }]}>{q.label}</Text>
                    <Text style={x.rowHint}>{q.hint}</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>

          <Text style={x.section}>ANIMATION</Text>
          <View style={x.card}>
            <Row testID="toggle-animations" label="Animations" hint="Jeevant Darshan live effects" value={s.animations} onToggle={(v: boolean) => updateSettings({ animations: v })} />
            <Row testID="toggle-particles" label="Particles" hint="Rain, petals, embers, sparkles" value={s.particles} onToggle={(v: boolean) => updateSettings({ particles: v })} />
            <Row testID="toggle-parallax" label="Parallax" hint="Depth motion on touch (native build)" value={s.parallax} onToggle={(v: boolean) => updateSettings({ parallax: v })} />
          </View>

          <Text style={x.section}>GENERAL</Text>
          <View style={x.card}>
            <Row testID="toggle-notifications" label="Notifications" value={s.notifications} onToggle={(v: boolean) => updateSettings({ notifications: v })} />
            <Row testID="toggle-sound" label="Sound" value={s.sound} onToggle={(v: boolean) => updateSettings({ sound: v })} />
          </View>

          <View style={x.about}>
            <Text style={x.rowHint}>DivyaLive · Bhakti jo screen par jeevant lage.</Text>
            <Text style={x.rowHint}>Version 1.0.0 · Phase 2 (Jeevant Darshan)</Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const x = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 22, paddingTop: 16, paddingBottom: 8 },
  title: { fontSize: 26, fontWeight: "800", color: C.text },
  iconBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: C.surface, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: C.line },
  body: { padding: 22, paddingBottom: 60, maxWidth: 640, width: "100%", alignSelf: "center" },
  section: { color: C.muted, fontSize: 11, letterSpacing: 1.5, fontWeight: "800", marginTop: 22, marginBottom: 10 },
  card: { backgroundColor: C.surface, borderRadius: 18, borderWidth: 1, borderColor: C.line, paddingHorizontal: 16 },
  row: { minHeight: 62, flexDirection: "row", alignItems: "center", gap: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "rgba(255,255,255,.06)" },
  rowLabel: { color: C.text, fontSize: 15, fontWeight: "600" },
  rowHint: { color: C.muted, fontSize: 12, marginTop: 3, lineHeight: 17 },
  quality: { minHeight: 60, flexDirection: "row", alignItems: "center", gap: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "rgba(255,255,255,.06)" },
  qualityActive: {},
  about: { marginTop: 30, alignItems: "center", gap: 4 },
});
