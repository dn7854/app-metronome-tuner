import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { practiceAudio } from "./audio";
import { MetronomeView } from "./components/MetronomeView";
import { Paywall } from "./components/Paywall";
import { SettingsDrawer } from "./components/SettingsDrawer";
import { ChordsView } from "./components/ChordsView";
import { PianoTuner, ViolinTuner } from "./components/TunerViews";
import { useLayout } from "./layout";
import { stopPiano } from "./piano";
import { usePractice } from "./store";
import { colors, fonts } from "./theme";

type Tab = "metro" | "piano" | "violin" | "chords";
type LockRequest = { kind: "mode" | "sound"; id: string } | null;

const tabs: { id: Tab; label: string }[] = [
  { id: "metro", label: "Metronome" },
  { id: "piano", label: "Piano" },
  { id: "violin", label: "Violin" },
  { id: "chords", label: "Chords" },
];

export function Shell() {
  const insets = useSafeAreaInsets();
  const layout = useLayout();
  const [tab, setTab] = useState<Tab>("metro");
  const [settings, setSettings] = useState(false);
  const [pending, setPending] = useState<LockRequest>(null);
  const unlock = usePractice((s) => s.unlock);
  const setModeId = usePractice((s) => s.setModeId);
  const setSoundId = usePractice((s) => s.setSoundId);

  useEffect(() => {
    const engine = practiceAudio();
    if (tab !== "metro") engine.stop();
    if (tab !== "violin") engine.stopTone();
    if (tab !== "chords") stopPiano();
  }, [tab]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View
        style={{
          paddingTop: insets.top + (layout.tablet ? 16 : 8),
          paddingHorizontal: layout.pad,
          paddingBottom: layout.tablet ? 16 : 12,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <View
            style={{
              width: 14,
              height: 14,
              borderWidth: 1.5,
              borderColor: colors.brass,
              alignItems: "center",
            }}
          >
            <View style={{ width: 1.5, flex: 1, marginVertical: 2, backgroundColor: colors.brass }} />
          </View>
          <Text style={{ fontFamily: fonts.sansSemi, letterSpacing: 2.4, fontSize: layout.tablet ? 16 : 14, color: colors.fg }}>
            D8R<Text style={{ color: colors.muted }}>{" METRONOME & TUNER"}</Text>
          </Text>
        </View>
        <Pressable
          accessibilityLabel="Open settings"
          onPress={() => setSettings(true)}
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            borderWidth: 1,
            borderColor: colors.line,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <View style={{ width: 16, gap: 3 }}>
            <View style={{ height: 1.5, backgroundColor: colors.fg }} />
            <View style={{ height: 1.5, backgroundColor: colors.fg, width: 12 }} />
            <View style={{ height: 1.5, backgroundColor: colors.fg }} />
          </View>
        </Pressable>
      </View>

      <View style={{ flex: 1 }}>
        {tab === "metro" ? <MetronomeView onLocked={setPending} /> : null}
        {tab === "piano" ? <PianoTuner /> : null}
        {tab === "violin" ? <ViolinTuner /> : null}
        {tab === "chords" ? <ChordsView /> : null}
      </View>

      <View
        style={{
          flexDirection: "row",
          borderTopWidth: 1,
          borderTopColor: colors.line,
          paddingBottom: insets.bottom,
          paddingHorizontal: layout.tablet ? 24 : 0,
        }}
      >
        {tabs.map((item) => {
          const selected = tab === item.id;
          return (
            <Pressable
              key={item.id}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              onPress={() => setTab(item.id)}
              style={{ flex: 1, height: layout.tablet ? 72 : 64, alignItems: "center", justifyContent: "center", gap: 4 }}
            >
              <View
                style={{
                  width: item.id === "violin" ? 16 : 18,
                  height: 10,
                  borderTopWidth: item.id === "metro" || item.id === "chords" ? 0 : 1.5,
                  borderColor: selected ? colors.brass : colors.muted,
                  justifyContent: "space-between",
                }}
              >
                {item.id === "metro" ? (
                  <View style={{ flexDirection: "row", justifyContent: "space-between", width: 18 }}>
                    <View style={{ width: 2, height: 12, backgroundColor: selected ? colors.brass : colors.muted }} />
                    <View style={{ width: 2, height: 8, marginTop: 4, backgroundColor: selected ? colors.brass : colors.muted }} />
                    <View style={{ width: 2, height: 12, backgroundColor: selected ? colors.brass : colors.muted }} />
                  </View>
                ) : item.id === "piano" ? (
                  <View style={{ flexDirection: "row", gap: 2 }}>
                    <View style={{ width: 3, height: 12, backgroundColor: selected ? colors.brass : colors.muted }} />
                    <View style={{ width: 3, height: 12, backgroundColor: selected ? colors.brass : colors.muted }} />
                    <View style={{ width: 3, height: 8, backgroundColor: selected ? colors.brass : colors.muted }} />
                  </View>
                ) : item.id === "chords" ? (
                  <View style={{ alignItems: "center", gap: 1, marginTop: -2 }}>
                    <View style={{ width: 4, height: 4, borderRadius: 2, marginLeft: 6, backgroundColor: selected ? colors.brass : colors.muted }} />
                    <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: selected ? colors.brass : colors.muted }} />
                    <View style={{ width: 4, height: 4, borderRadius: 2, marginLeft: -6, backgroundColor: selected ? colors.brass : colors.muted }} />
                  </View>
                ) : (
                  <View style={{ flexDirection: "row", gap: 3 }}>
                    <View style={{ width: 1.5, height: 14, backgroundColor: selected ? colors.brass : colors.muted }} />
                    <View style={{ width: 1.5, height: 14, backgroundColor: selected ? colors.brass : colors.muted }} />
                    <View style={{ width: 1.5, height: 14, backgroundColor: selected ? colors.brass : colors.muted }} />
                  </View>
                )}
              </View>
              <Text style={{ fontFamily: fonts.sans, fontSize: layout.tablet ? 14 : 12, color: selected ? colors.brass : colors.muted }}>
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {settings ? <SettingsDrawer onClose={() => setSettings(false)} /> : null}
      {pending ? (
        <Paywall
          onClose={() => setPending(null)}
          onUnlock={() => {
            unlock();
            if (pending.kind === "mode") setModeId(pending.id);
            else setSoundId(pending.id);
            setPending(null);
          }}
        />
      ) : null}
    </View>
  );
}
