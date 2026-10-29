import { useRef, useState } from "react";
import { Linking, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { usePractice } from "../store";
import { colors, fonts } from "../theme";

export function SettingsDrawer({ onClose }: { onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const volume = usePractice((s) => s.volume);
  const setVolume = usePractice((s) => s.setVolume);
  const a4 = usePractice((s) => s.a4);
  const nudgeA4 = usePractice((s) => s.nudgeA4);
  const haptics = usePractice((s) => s.haptics);
  const setHaptics = usePractice((s) => s.setHaptics);
  const premium = usePractice((s) => s.premium);
  const [about, setAbout] = useState(false);

  return (
    <View style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }}>
      <Pressable accessibilityLabel="Close settings" onPress={onClose} style={{ flex: 1, backgroundColor: "rgba(16,14,12,0.82)" }} />
      <View
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          bottom: 0,
          width: "86%",
          maxWidth: 480,
          backgroundColor: colors.surface,
          borderLeftWidth: 1,
          borderLeftColor: colors.line,
          paddingTop: insets.top + 8,
          paddingBottom: insets.bottom + 16,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingBottom: 12 }}>
          <Text style={{ fontFamily: fonts.display, fontSize: 28, color: colors.fg }}>{about ? "About" : "Settings"}</Text>
          <Pressable
            accessibilityLabel="Close"
            onPress={onClose}
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
            <Text style={{ fontFamily: fonts.sansMed, fontSize: 18, color: colors.fg }}>×</Text>
          </Pressable>
        </View>

        {about ? (
          <ScrollView contentContainerStyle={{ paddingHorizontal: 20, gap: 14 }}>
            <Text style={{ fontFamily: fonts.display, fontSize: 34, color: colors.fg }}>{"D8R Metronome&Tuner"}</Text>
            <Text style={body}>
              A practice metronome, tuner and chord piano. The tuners wait until a note holds still, so talking in the
              room does not move the marker.
            </Text>
            <Text style={body}>Tuning stays on this device. Nothing you play is uploaded.</Text>
            <Text style={body}>Made by Danijel Brecelj.</Text>
            <Pressable onPress={() => void Linking.openURL("https://danijelbrecelj.com")}>
              <Text style={link}>danijelbrecelj.com</Text>
            </Pressable>
            <Pressable onPress={() => void Linking.openURL("https://danijelbrecelj.com/privacy")}>
              <Text style={link}>Privacy Policy</Text>
            </Pressable>
            <Pressable onPress={() => void Linking.openURL("https://danijelbrecelj.com/terms")}>
              <Text style={link}>Terms of Use</Text>
            </Pressable>
            <Pressable
              onPress={() => setAbout(false)}
              style={{
                marginTop: 8,
                alignSelf: "flex-start",
                height: 44,
                paddingHorizontal: 16,
                borderRadius: 22,
                borderWidth: 1,
                borderColor: colors.line,
                justifyContent: "center",
              }}
            >
              <Text style={{ fontFamily: fonts.sansMed, color: colors.fg }}>Back</Text>
            </Pressable>
          </ScrollView>
        ) : (
          <ScrollView contentContainerStyle={{ paddingHorizontal: 20, gap: 18 }}>
            <View style={{ gap: 8 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={label}>Metronome level</Text>
                <Text style={label}>{Math.round(volume * 100)}</Text>
              </View>
              <Fader value={volume} onChange={setVolume} />
              <Text style={body}>Metronome loudness. 80 is the starting point.</Text>
            </View>

            <View style={card}>
              <Text style={label}>Reference A4</Text>
              <Text style={body}>Half-hertz steps, 432 to 448</Text>
              <View style={{ marginTop: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <Mini text="−0.5" onPress={() => nudgeA4(-1)} label="Lower A4 by 0.5 hertz" />
                <Text style={{ fontFamily: fonts.display, fontSize: 32, color: colors.fg, fontVariant: ["tabular-nums"] }}>
                  {a4.toFixed(1)}
                </Text>
                <Mini text="+0.5" onPress={() => nudgeA4(1)} label="Raise A4 by 0.5 hertz" />
              </View>
            </View>

            <Pressable onPress={() => setHaptics(!haptics)} style={[card, { flexDirection: "row", justifyContent: "space-between" }]}>
              <Text style={label}>Buzz on the downbeat</Text>
              <Text style={{ fontFamily: fonts.sansMed, color: haptics ? colors.brass : colors.muted }}>
                {haptics ? "On" : "Off"}
              </Text>
            </Pressable>

            <View style={card}>
              <Text style={label}>Premium kit</Text>
              <Text style={body}>
                {premium
                  ? "Unlocked on this device. Extra sounds and time signatures are open."
                  : "Extra sounds and additional time signatures are a $2.99 one-time purchase."}
              </Text>
            </View>

            <Pressable
              onPress={() => setAbout(true)}
              style={{
                height: 48,
                borderRadius: 24,
                borderWidth: 1,
                borderColor: colors.line,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ fontFamily: fonts.sansMed, color: colors.fg }}>About</Text>
            </Pressable>
          </ScrollView>
        )}
      </View>
    </View>
  );
}

function Fader({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  const ref = useRef<View>(null);
  function fromPage(pageX: number) {
    ref.current?.measureInWindow((x, _y, width) => {
      const next = Math.min(1, Math.max(0.05, (pageX - x) / Math.max(1, width)));
      onChange(Math.round(next * 100) / 100);
    });
  }
  return (
    <View
      ref={ref}
      accessibilityRole="adjustable"
      accessibilityLabel="Metronome level"
      accessibilityValue={{ min: 5, max: 100, now: Math.round(value * 100) }}
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      onResponderGrant={(event) => fromPage(event.nativeEvent.pageX)}
      onResponderMove={(event) => fromPage(event.nativeEvent.pageX)}
      style={{ height: 44, justifyContent: "center" }}
    >
      <View style={{ height: 4, borderRadius: 2, backgroundColor: colors.line }}>
        <View style={{ width: `${value * 100}%`, height: 4, borderRadius: 2, backgroundColor: colors.brass }} />
      </View>
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          left: `${value * 100}%`,
          marginLeft: -11,
          width: 22,
          height: 22,
          borderRadius: 11,
          backgroundColor: colors.brass,
          borderWidth: 2,
          borderColor: colors.brassInk,
        }}
      />
    </View>
  );
}

function Mini({ text, onPress, label }: { text: string; onPress: () => void; label: string }) {
  return (
    <Pressable
      accessibilityLabel={label}
      onPress={onPress}
      style={{
        height: 44,
        paddingHorizontal: 12,
        borderRadius: 22,
        borderWidth: 1,
        borderColor: colors.line,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text style={{ fontFamily: fonts.sansMed, color: colors.fg }}>{text}</Text>
    </Pressable>
  );
}

const label = { fontFamily: fonts.sansMed, fontSize: 15, color: colors.fg };
const body = { fontFamily: fonts.sans, fontSize: 14, lineHeight: 20, color: colors.muted };
const link = {
  fontFamily: fonts.sansMed,
  fontSize: 16,
  color: colors.brass,
  textDecorationLine: "underline" as const,
};
const card = {
  borderWidth: 1,
  borderColor: colors.line,
  borderRadius: 16,
  paddingHorizontal: 16,
  paddingVertical: 14,
  gap: 6,
};
