import React, { useMemo, useState } from "react";
import { StyleSheet, View, LayoutChangeEvent } from "react-native";
import Animated, {
  Easing,
  cancelAnimation,
  interpolate,
  Extrapolation,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import type { Quality } from "@/src/lib/settings";

export type Preset =
  | "none"
  | "peaceful"
  | "temple"
  | "himalayan"
  | "rain"
  | "river"
  | "divineGlow"
  | "night";

export type Intensity = "low" | "medium" | "high";

export const PRESET_META: { key: Preset; label: string; icon: string }[] = [
  { key: "none", label: "None (Static)", icon: "remove-circle-outline" },
  { key: "peaceful", label: "Peaceful", icon: "leaf-outline" },
  { key: "temple", label: "Temple", icon: "bonfire-outline" },
  { key: "himalayan", label: "Himalayan", icon: "snow-outline" },
  { key: "rain", label: "Rain", icon: "rainy-outline" },
  { key: "river", label: "River", icon: "water-outline" },
  { key: "divineGlow", label: "Divine Glow", icon: "sunny-outline" },
  { key: "night", label: "Night", icon: "moon-outline" },
];

type Kind = "cloud" | "line" | "dot" | "petal" | "glow" | "star" | "ember" | "smoke" | "none";
type Dir = "x" | "y" | "up" | "none";

type ParticleCfg = {
  kind: Kind;
  dir: Dir;
  count: number;
  color: string;
  size: [number, number];
  dur: [number, number];
  drift: number;
  rotate?: boolean;
  glow?: boolean;
};

type OverlayType = "rays" | "diyaGlow" | "waterBands" | "coolTint" | "warmTint" | "nightTint";
type Scene = { particles: ParticleCfg[]; overlays: OverlayType[] };

// Reusable base particle layers, composed into named scenes below.
const L: Record<string, ParticleCfg> = {
  cloud: { kind: "cloud", dir: "x", count: 6, color: "rgba(240,244,255,0.16)", size: [110, 210], dur: [22000, 40000], drift: 0 },
  snow: { kind: "dot", dir: "y", count: 40, color: "rgba(255,255,255,0.9)", size: [3, 7], dur: [6000, 12000], drift: 30 },
  rain: { kind: "line", dir: "y", count: 80, color: "rgba(190,205,255,0.5)", size: [12, 24], dur: [600, 1200], drift: 6 },
  goldRise: { kind: "glow", dir: "up", count: 34, color: "#FFD98A", size: [3, 8], dur: [4500, 9000], drift: 24, glow: true },
  embers: { kind: "ember", dir: "up", count: 22, color: "#FFC24D", size: [3, 7], dur: [3200, 7200], drift: 16, glow: true },
  motes: { kind: "glow", dir: "up", count: 20, color: "rgba(255,240,200,0.7)", size: [2, 5], dur: [7000, 13000], drift: 30, glow: true },
  ripple: { kind: "glow", dir: "x", count: 16, color: "rgba(150,200,255,0.5)", size: [4, 9], dur: [9000, 16000], drift: 0, glow: true },
  stars: { kind: "star", dir: "none", count: 60, color: "#FFF6D5", size: [2, 5], dur: [1400, 3400], drift: 0, glow: true },
  raysMotes: { kind: "glow", dir: "up", count: 16, color: "rgba(255,224,150,0.55)", size: [2, 5], dur: [5000, 10000], drift: 10, glow: true },
};

const SCENES: Record<Preset, Scene> = {
  none: { particles: [], overlays: [] },
  peaceful: { particles: [L.motes], overlays: ["warmTint"] },
  temple: { particles: [L.embers, L.goldRise], overlays: ["diyaGlow", "rays"] },
  himalayan: { particles: [L.cloud, L.snow], overlays: ["coolTint"] },
  rain: { particles: [L.rain], overlays: ["coolTint"] },
  river: { particles: [L.ripple, L.motes], overlays: ["waterBands"] },
  divineGlow: { particles: [L.raysMotes, L.goldRise], overlays: ["rays", "warmTint"] },
  night: { particles: [L.stars, L.motes], overlays: ["nightTint"] },
};

const INTENSITY_FACTOR: Record<Intensity, number> = { low: 0.5, medium: 1, high: 1.6 };

const QUALITY_FACTOR: Record<Quality, number> = { high: 1, balanced: 0.6, saver: 0.3 };
const SPEED_FACTOR: Record<Quality, number> = { high: 1, balanced: 1, saver: 1.4 };

const rand = (a: number, b: number) => a + Math.random() * (b - a);

type Def = {
  baseX: number;
  baseY: number;
  size: number;
  dur: number;
  delay: number;
  drift: number;
  rotDir: number;
};

function shapeStyle(kind: Kind, size: number, color: string, glow?: boolean) {
  const base: any = { position: "absolute", backgroundColor: color };
  if (glow) {
    base.shadowColor = color;
    base.shadowOpacity = 0.9;
    base.shadowRadius = size;
    base.shadowOffset = { width: 0, height: 0 };
    base.elevation = 6;
  }
  switch (kind) {
    case "line":
      return { ...base, width: 1.6, height: size, borderRadius: 1 };
    case "petal":
      return {
        ...base,
        width: size,
        height: size * 1.5,
        borderTopLeftRadius: size,
        borderBottomRightRadius: size,
        borderTopRightRadius: size / 3,
        borderBottomLeftRadius: size / 3,
      };
    case "cloud":
    case "smoke":
      return { ...base, width: size, height: size * 0.55, borderRadius: size };
    default:
      return { ...base, width: size, height: size, borderRadius: size / 2 };
  }
}

function Particle({ cfg, def, w, h, paused }: { cfg: ParticleCfg; def: Def; w: number; h: number; paused: boolean }) {
  const p = useSharedValue(0);

  React.useEffect(() => {
    cancelAnimation(p);
    if (paused) return;
    p.value = 0;
    p.value = withDelay(
      def.delay,
      withRepeat(withTiming(1, { duration: def.dur, easing: Easing.linear }), -1, false),
    );
    return () => cancelAnimation(p);
  }, [paused, def.dur, def.delay]);

  const margin = 60;
  const style = useAnimatedStyle(() => {
    let tx = def.baseX;
    let ty = def.baseY;
    let opacity = 1;
    let rotate = "0deg";

    if (cfg.dir === "y") {
      ty = interpolate(p.value, [0, 1], [-margin, h + margin]);
      tx = def.baseX + Math.sin(p.value * Math.PI * 2) * def.drift;
      opacity = interpolate(p.value, [0, 0.08, 0.92, 1], [0, 1, 1, 0], Extrapolation.CLAMP);
    } else if (cfg.dir === "up") {
      ty = interpolate(p.value, [0, 1], [h + margin, -margin]);
      tx = def.baseX + Math.sin(p.value * Math.PI * 2) * def.drift;
      opacity = interpolate(p.value, [0, 0.12, 0.85, 1], [0, 1, 0.7, 0], Extrapolation.CLAMP);
    } else if (cfg.dir === "x") {
      tx = interpolate(p.value, [0, 1], [-def.size * 1.5, w + def.size]);
      ty = def.baseY;
      opacity = interpolate(p.value, [0, 0.15, 0.85, 1], [0, 1, 1, 0], Extrapolation.CLAMP);
    } else {
      // twinkle in place
      opacity = interpolate(p.value, [0, 0.5, 1], [0.15, 1, 0.15]);
    }

    if (cfg.rotate) rotate = `${interpolate(p.value, [0, 1], [0, 360 * def.rotDir])}deg`;

    return {
      opacity,
      transform: [{ translateX: tx }, { translateY: ty }, { rotate }],
    };
  });

  return <Animated.View pointerEvents="none" style={[shapeStyle(cfg.kind, def.size, cfg.color, cfg.glow), style]} />;
}

function FlickerOverlay({ colors, style, paused, min = 0.55 }: any) {
  const f = useSharedValue(1);
  React.useEffect(() => {
    cancelAnimation(f);
    if (paused) return;
    f.value = withRepeat(withTiming(min, { duration: 700, easing: Easing.inOut(Easing.quad) }), -1, true);
    return () => cancelAnimation(f);
  }, [paused]);
  const a = useAnimatedStyle(() => ({ opacity: f.value }));
  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, a]}>
      <LinearGradient colors={colors} style={[StyleSheet.absoluteFill, style]} />
    </Animated.View>
  );
}

function RaysOverlay({ w, h, paused }: { w: number; h: number; paused: boolean }) {
  const r = useSharedValue(0);
  React.useEffect(() => {
    cancelAnimation(r);
    if (paused) return;
    r.value = withRepeat(withTiming(1, { duration: 6000, easing: Easing.inOut(Easing.sin) }), -1, true);
    return () => cancelAnimation(r);
  }, [paused]);
  const a = useAnimatedStyle(() => ({
    opacity: interpolate(r.value, [0, 1], [0.25, 0.6]),
    transform: [{ translateX: interpolate(r.value, [0, 1], [-w * 0.15, w * 0.15]) }, { rotate: "18deg" }],
  }));
  return (
    <Animated.View pointerEvents="none" style={[{ position: "absolute", top: -h * 0.3, left: 0, width: w * 1.4, height: h * 1.6 }, a]}>
      <LinearGradient
        colors={["transparent", "rgba(255,224,150,0.28)", "transparent"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={StyleSheet.absoluteFill}
      />
    </Animated.View>
  );
}

export default function LiveEffect({
  preset,
  intensity = "medium",
  quality = "balanced",
  particlesEnabled = true,
  animationsEnabled = true,
  paused = false,
}: {
  preset: Preset;
  intensity?: Intensity;
  quality?: Quality;
  particlesEnabled?: boolean;
  animationsEnabled?: boolean;
  paused?: boolean;
}) {
  const [size, setSize] = useState({ w: 0, h: 0 });
  const scene = SCENES[preset] || SCENES.none;
  const isPaused = paused || !animationsEnabled;

  const layers = useMemo(() => {
    if (!size.w || !size.h) return [] as { cfg: ParticleCfg; defs: Def[] }[];
    const sf = SPEED_FACTOR[quality];
    const scale = QUALITY_FACTOR[quality] * (INTENSITY_FACTOR[intensity] ?? 1);
    return scene.particles.map((cfg) => {
      const count = particlesEnabled ? Math.max(0, Math.round(cfg.count * scale)) : 0;
      const defs: Def[] = Array.from({ length: count }, () => ({
        baseX: rand(0, size.w),
        baseY: rand(0, size.h),
        size: rand(cfg.size[0], cfg.size[1]),
        dur: rand(cfg.dur[0], cfg.dur[1]) * sf,
        delay: rand(0, cfg.dur[1]),
        drift: rand(-cfg.drift, cfg.drift),
        rotDir: Math.random() > 0.5 ? 1 : -1,
      }));
      return { cfg, defs };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preset, quality, intensity, particlesEnabled, size.w, size.h]);

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (Math.abs(width - size.w) > 1 || Math.abs(height - size.h) > 1) setSize({ w: width, h: height });
  };

  const key = `${preset}-${quality}-${intensity}-${particlesEnabled}`;

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill} onLayout={onLayout}>
      {scene.overlays.includes("coolTint") && (
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(120,150,200,0.10)" }]} />
      )}
      {scene.overlays.includes("warmTint") && (
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(255,180,90,0.06)" }]} />
      )}
      {scene.overlays.includes("nightTint") && (
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(10,20,60,0.28)" }]} />
      )}
      {scene.overlays.includes("rays") && size.w > 0 && <RaysOverlay w={size.w} h={size.h} paused={isPaused} />}
      {scene.overlays.includes("diyaGlow") && (
        <FlickerOverlay paused={isPaused} min={0.6} colors={["transparent", "rgba(255,180,70,0.05)", "rgba(255,190,90,0.32)"]} style={{ top: "55%" }} />
      )}
      {scene.overlays.includes("waterBands") && (
        <>
          <FlickerOverlay paused={isPaused} min={0.4} colors={["transparent", "rgba(60,140,220,0.08)", "rgba(40,120,210,0.35)"]} style={{ top: "50%" }} />
          <FlickerOverlay paused={isPaused} min={0.5} colors={["transparent", "transparent", "rgba(120,190,255,0.22)"]} style={{ top: "65%" }} />
        </>
      )}
      {layers.map((layer, li) =>
        layer.defs.map((d, i) => (
          <Particle key={`${key}-${li}-${i}`} cfg={layer.cfg} def={d} w={size.w} h={size.h} paused={isPaused} />
        )),
      )}
    </View>
  );
}
