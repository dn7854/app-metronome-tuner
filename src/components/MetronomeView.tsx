import { useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, Text, View, Vibration, useWindowDimensions } from "react-native";
import { practiceAudio } from "../audio";
import { accentAt, getMode, getSound, MODES, SOUNDS, tempoName } from "../lib/theory";
import { usePractice } from "../store";
import { colors, fonts } from "../theme";
import { Knob, KNOB_MAX, KNOB_MIN } from "./Knob";

type LockRequest = { kind: "mode" | "sound"; id: string };

/** Height of the tempo name line above the dial, plus its gap. */
const TEMPO_LABEL = 34;
/** Width of a +/- button beside the dial, plus its gap. */
const SIDE_BUTTON = 44 + 12;

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
  const screen = useWindowDimensions();
  // Space left for the dial once everything else is laid out (measured), with a
  // window-based first guess so the first frame is already close.
  const [dialArea, setDialArea] = useState<number | null>(null);
  const widthLimit = screen.width - 40 - SIDE_BUTTON * 2;
  const heightGuess = screen.height * 0.3;
  const knobSize = Math.max(
    KNOB_MIN,
    Math.min(KNOB_MAX, widthLimit, (dialArea ?? heightGuess + TEMPO_LABEL) - TEMPO_LABEL),
  );

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
    <ScrollView contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 20, paddingBottom: 16, gap: 12 }}>
      <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 4 }}>
        {Array.from({ length: mode.steps }, (_, index) => {
          const accent = accentAt(mode, index);
          const on = step === index;
          const height = accent === "down" ? 32 : accent === "beat" ? 24 : 16;
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

      <View style={{ gap: 6 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {MODES.map((item) => {
            const locked = item.isPremium && !premium;
            const selected = item.id === mode.id;
            return (
              <Chip
                key={item.id}
                label={item.label}
                selected={selected}
                locked={locked}
                onPress={() => {
                  if (locked) onLocked({ kind: "mode", id: item.id });
                  else setModeId(item.id);
                }}
              />
            );
          })}
        </ScrollView>
        <Text numberOfLines={2} style={{ fontFamily: fonts.sans, color: colors.muted }}>
          {mode.blurb}
        </Text>
      </View>

      <View
        onLayout={(event) => setDialArea(Math.floor(event.nativeEvent.layout.height))}
        style={{ flex: 1, minHeight: KNOB_MIN + TEMPO_LABEL, alignItems: "center", justifyContent: "center" }}
      >
        <Text style={{ fontFamily: fonts.displaySoft, fontSize: 22, lineHeight: 26, marginBottom: 8, color: colors.muted }}>
          {tempoName(bpm)}
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <Round label="Decrease tempo" onPress={() => setBpm(bpm - 1)} text={"\u2212"} />
          <Knob bpm={bpm} onChange={setBpm} size={knobSize} />
          <Round label="Increase tempo" onPress={() => setBpm(bpm + 1)} text="+" />
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {SOUNDS.map((item) => {
          const locked = item.isPremium && !premium;
          const selected = item.id === sound.id;
          return (
            <Chip
              key={item.id}
              label={item.label}
              selected={selected}
              locked={locked}
              onPress={() => {
                if (locked) onLocked({ kind: "sound", id: item.id });
                else setSoundId(item.id);
              }}
            />
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

function Chip({
  label,
  selected,
  locked,
  onPress,
}: {
  label: string;
  selected: boolean;
  locked: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
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
      <Text style={{ fontFamily: fonts.sansMed, color: selected ? colors.brassInk : colors.fg }}>{label}</Text>
      {locked ? (
        <Text style={{ fontFamily: fonts.sans, fontSize: 11, color: selected ? colors.brassInk : colors.brass }}>Kit</Text>
      ) : null}
    </Pressable>
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
