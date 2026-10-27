import { useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, Text, View, Vibration } from "react-native";
import { practiceAudio } from "../audio";
import { accentAt, getMode, getSound, MODES, SOUNDS, tempoName } from "../lib/theory";
import { usePractice } from "../store";
import { colors, fonts } from "../theme";
import { Knob } from "./Knob";

type LockRequest = { kind: "mode" | "sound"; id: string };

export function MetronomeView({ onLocked }: { onLocked: (request: LockRequest) => void }) {
  const bpm = usePractice((s) => s.bpm);
  const modeId = usePractice((s) => s.modeId);
  const soundId = usePractice((s) => s.soundId);
  const volume = usePractice((s) => s.volume);
  const premium = usePractice((s) => s.premium);
  const haptics = usePractice((s) => s.haptics);
  const setBpm = usePractice((s) => s.setBpm);
  const setModeId = usePractice((s) => s.setModeId);
  const setSoundId = usePractice((s) => s.setSoundId);
  const [playing, setPlaying] = useState(false);
  const [step, setStep] = useState(-1);
  const taps = useRef<number[]>([]);
  const mode = getMode(modeId);
  const sound = getSound(soundId);

  useEffect(() => {
    const engine = practiceAudio();
    engine.bpm = bpm;
    engine.mode = mode;
    engine.sound = sound.id;
    engine.setVolume(volume);
    engine.setListener((next) => {
      setStep(next);
      if (next >= 0 && haptics && accentAt(mode, next) === "down") Vibration.vibrate(12);
    });
    return () => engine.setListener(null);
  }, [bpm, mode, sound.id, volume, haptics]);

  function toggle() {
    const engine = practiceAudio();
    engine.toggle();
    setPlaying(engine.playing);
    if (!engine.playing) setStep(-1);
  }

  function tap() {
    const now = Date.now();
    const recent = taps.current.filter((t) => now - t < 2000);
    recent.push(now);
    taps.current = recent.slice(-5);
    if (taps.current.length < 2) return;
    const gaps: number[] = [];
    for (let i = 1; i < taps.current.length; i++) gaps.push(taps.current[i]! - taps.current[i - 1]!);
    const avg = gaps.reduce((a, b) => a + b, 0) / gaps.length;
    setBpm(60000 / avg);
  }

  return (
    <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 28, gap: 18 }}>
      <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 4 }}>
        {Array.from({ length: mode.steps }, (_, index) => {
          const accent = accentAt(mode, index);
          const on = step === index;
          const height = accent === "down" ? 36 : accent === "beat" ? 28 : 18;
          return (
            <View
              key={index}
              style={{
                flex: 1,
                height,
                borderRadius: 3,
                borderWidth: 1,
                borderColor: on ? colors.brass : colors.line,
                backgroundColor: on ? colors.brass : colors.surface2,
              }}
            />
          );
        })}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {MODES.map((item) => {
          const locked = item.isPremium && !premium;
          const selected = item.id === mode.id;
          return (
            <Pressable
              key={item.id}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => {
                if (locked) onLocked({ kind: "mode", id: item.id });
                else setModeId(item.id);
              }}
              style={{
                height: 44,
                paddingHorizontal: 14,
                borderRadius: 22,
                borderWidth: 1,
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                borderColor: selected ? colors.brass : colors.line,
                backgroundColor: selected ? colors.brass : colors.surface,
              }}
            >
              <Text style={{ fontFamily: fonts.sansMed, color: selected ? colors.brassInk : colors.fg }}>
                {item.label}
              </Text>
              {locked ? (
                <Text style={{ fontFamily: fonts.sans, fontSize: 11, color: selected ? colors.brassInk : colors.brass }}>
                  Kit
                </Text>
              ) : null}
            </Pressable>
          );
        })}
      </ScrollView>
      <Text style={{ fontFamily: fonts.sans, color: colors.muted }}>{mode.blurb}</Text>

      <View style={{ alignItems: "center", gap: 8 }}>
        <Text style={{ fontFamily: fonts.displaySoft, fontSize: 22, color: colors.muted }}>{tempoName(bpm)}</Text>
        <Knob bpm={bpm} onChange={setBpm} />
        <View style={{ flexDirection: "row", gap: 12 }}>
          <Round label="Decrease tempo" onPress={() => setBpm(bpm - 1)} text="−" />
          <Round label="Increase tempo" onPress={() => setBpm(bpm + 1)} text="+" />
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {SOUNDS.map((item) => {
          const locked = item.isPremium && !premium;
          const selected = item.id === sound.id;
          return (
            <Pressable
              key={item.id}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => {
                if (locked) onLocked({ kind: "sound", id: item.id });
                else setSoundId(item.id);
              }}
              style={{
                height: 44,
                paddingHorizontal: 14,
                borderRadius: 22,
                borderWidth: 1,
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                borderColor: selected ? colors.brass : colors.line,
                backgroundColor: selected ? colors.brass : colors.surface,
              }}
            >
              <Text style={{ fontFamily: fonts.sansMed, color: selected ? colors.brassInk : colors.fg }}>
                {item.label}
              </Text>
              {locked ? (
                <Text style={{ fontFamily: fonts.sans, fontSize: 11, color: selected ? colors.brassInk : colors.brass }}>
                  Kit
                </Text>
              ) : null}
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={{ flexDirection: "row", gap: 12 }}>
        <Pressable
          accessibilityRole="button"
          onPress={toggle}
          style={{
            flex: 1,
            height: 56,
            borderRadius: 28,
            backgroundColor: colors.brass,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={{ fontFamily: fonts.sansSemi, fontSize: 16, color: colors.brassInk }}>
            {playing ? "Pause" : "Play"}
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={tap}
          style={{
            flex: 1,
            height: 56,
            borderRadius: 28,
            borderWidth: 1,
            borderColor: colors.line,
            backgroundColor: colors.surface,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={{ fontFamily: fonts.sansMed, fontSize: 16, color: colors.fg }}>Tap</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

function Round({ label, text, onPress }: { label: string; text: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityLabel={label}
      onPress={onPress}
      style={{
        width: 44,
        height: 44,
        borderRadius: 22,
        borderWidth: 1,
        borderColor: colors.line,
        backgroundColor: colors.surface,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text style={{ fontFamily: fonts.sansMed, fontSize: 20, color: colors.fg }}>{text}</Text>
    </Pressable>
  );
}
