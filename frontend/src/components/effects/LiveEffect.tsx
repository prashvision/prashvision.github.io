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
  | "clouds"
  | "rain"
  | "snow"
  | "petals"
  | "fire"
  | "smoke"
  | "water"
  | "lightRays"
  | "particles"
  | "stars"
  | "diya";

export const PRESET_META: { key: Preset; label: string; icon: string }[] = [
  { key: "none", label: "None (Static)", icon: "remove-circle-outline" },
  { key: "clouds", label: "Clouds", icon: "cloud-outline" },
  { key: "rain", label: "Rain", icon: "rainy-outline" },
  { key: "snow", label: "Snow", icon: "snow-outline" },
  { key: "petals", label: "Flower Petals", icon: "flower-outline" },
  { key: "fire", label: "Fire", icon: "flame-outline" },
  { key: "smoke", label: "Smoke", icon: "cloudy-outline" },
  { key: "water", label: "Water", icon: "water-outline" },
  { key: "lightRays", label: "Light Rays", icon: "sunny-outline" },
  { key: "particles", label: "Particles", icon: "sparkles-outline" },
  { key: "stars", label: "Stars", icon: "star-outline" },
  { key: "diya", label: "Diya Glow", icon: "bonfire-outline" },
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

const CFG: Record<Preset, ParticleCfg> = {
  none: { kind: "none", dir: "none", count: 0, color: "#fff", size: [0, 0], dur: [1, 1], drift: 0 },
  clouds: { kind: "cloud", dir: "x", count: 6, color: "rgba(240,244,255,0.16)", size: [110, 210], dur: [22000, 40000], drift: 0 },
  rain: { kind: "line", dir: "y", count: 80, color: "rgba(190,205,255,0.5)", size: [12, 24], dur: [600, 1200], drift: 6 },
  snow: { kind: "dot", dir: "y", count: 55, color: "rgba(255,255,255,0.9)", size: [3, 7], dur: [6000, 12000], drift: 30 },
  petals: { kind: "petal", dir: "y", count: 28, color: "#F4A6C0", size: [9, 16], dur: [5000, 9500], drift: 40, rotate: true },
  particles: { kind: "glow", dir: "up", count: 44, color: "#FFD98A", size: [3, 8], dur: [4500, 9000], drift: 24, glow: true },
  stars: { kind: "star", dir: "none", count: 70, color: "#FFF6D5", size: [2, 5], dur: [1400, 3400], drift: 0, glow: true },
  fire: { kind: "ember", dir: "up", count: 30, color: "#FF7A2D", size: [3, 9], dur: [1400, 2800], drift: 18, glow: true },
  smoke: { kind: "smoke", dir: "up", count: 16, color: "rgba(190,190,205,0.16)", size: [45, 95], dur: [6500, 12000], drift: 20 },
  water: { kind: "none", dir: "none", count: 0, color: "#fff", size: [0, 0], dur: [1, 1], drift: 0 },
  lightRays: { kind: "glow", dir: "up", count: 18, color: "rgba(255,224,150,0.55)", size: [2, 5], dur: [5000, 10000], drift: 10, glow: true },
  diya: { kind: "glow", dir: "up", count: 24, color: "#FFC24D", size: [3, 7], dur: [3200, 7200], drift: 16, glow: true },
};

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
  quality = "balanced",
  particlesEnabled = true,
  animationsEnabled = true,
  paused = false,
}: {
  preset: Preset;
  quality?: Quality;
  particlesEnabled?: boolean;
  animationsEnabled?: boolean;
  paused?: boolean;
}) {
  const [size, setSize] = useState({ w: 0, h: 0 });
  const cfg = CFG[preset] || CFG.none;
  const isPaused = paused || !animationsEnabled;

  const defs = useMemo<Def[]>(() => {
    if (!size.w || !size.h) return [];
    const count = particlesEnabled ? Math.round(cfg.count * QUALITY_FACTOR[quality]) : 0;
    const sf = SPEED_FACTOR[quality];
    return Array.from({ length: count }, () => ({
      baseX: rand(0, size.w),
      baseY: rand(0, size.h),
      size: rand(cfg.size[0], cfg.size[1]),
      dur: rand(cfg.dur[0], cfg.dur[1]) * sf,
      delay: rand(0, cfg.dur[1]),
      drift: rand(-cfg.drift, cfg.drift),
      rotDir: Math.random() > 0.5 ? 1 : -1,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preset, quality, particlesEnabled, size.w, size.h]);

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (Math.abs(width - size.w) > 1 || Math.abs(height - size.h) > 1) setSize({ w: width, h: height });
  };

  const key = `${preset}-${quality}-${particlesEnabled}`;

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill} onLayout={onLayout}>
      {preset === "lightRays" && size.w > 0 && <RaysOverlay w={size.w} h={size.h} paused={isPaused} />}
      {preset === "fire" && (
        <FlickerOverlay
          paused={isPaused}
          colors={["transparent", "rgba(255,90,20,0.06)", "rgba(255,120,30,0.4)"]}
          style={{ top: "45%" }}
        />
      )}
      {preset === "diya" && (
        <FlickerOverlay
          paused={isPaused}
          min={0.6}
          colors={["transparent", "rgba(255,180,70,0.05)", "rgba(255,190,90,0.3)"]}
          style={{ top: "55%" }}
        />
      )}
      {preset === "water" && (
        <>
          <FlickerOverlay
            paused={isPaused}
            min={0.4}
            colors={["transparent", "rgba(60,140,220,0.08)", "rgba(40,120,210,0.35)"]}
            style={{ top: "50%" }}
          />
          <FlickerOverlay
            paused={isPaused}
            min={0.5}
            colors={["transparent", "transparent", "rgba(120,190,255,0.22)"]}
            style={{ top: "65%" }}
          />
        </>
      )}
      {defs.map((d, i) => (
        <Particle key={`${key}-${i}`} cfg={cfg} def={d} w={size.w} h={size.h} paused={isPaused} />
      ))}
    </View>
  );
}
