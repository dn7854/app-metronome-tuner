import { useEffect, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { practiceAudio } from "../audio";
import {
  centsBetween,
  describePitch,
  IN_TUNE_HZ,
  nearestString,
  stringFrequency,
  VIOLIN_STRINGS,
  type ViolinStringId,
} from "../lib/theory";
import { usePractice } from "../store";
import { colors, fonts } from "../theme";
import { usePitch } from "../usePitch";

function windowCents(target: number) {
  return Math.min(50, Math.abs(1200 * Math.log2((target + IN_TUNE_HZ) / target)));
}

function Gauge({ cents, zone }: { cents: number | null; zone: number }) {
  const shown = cents === null ? 0 : Math.max(-50, Math.min(50, cents));
  const pos = ((shown + 50) / 100) * 100;
  const zoneWidth = (Math.min(50, zone) / 50) * 50;
  return (
    <View style={{ height: 36, justifyContent: "center" }}>
      <View style={{ height: 8, borderRadius: 4, backgroundColor: colors.surface2, overflow: "hidden" }}>
        <View
          style={{
            position: "absolute",
            left: `${50 - zoneWidth / 2}%`,
            width: `${zoneWidth}%`,
            top: 0,
            bottom: 0,
            backgroundColor: colors.brass,
            opacity: 0.85,
          }}
        />
      </View>
      <View
        style={{
          position: "absolute",
          left: `${pos}%`,
          marginLeft: -7,
          width: 14,
          height: 14,
          borderRadius: 7,
          backgroundColor: cents === null ? colors.muted : colors.fg,
          borderWidth: 2,
          borderColor: colors.brass,
        }}
      />
    </View>
  );
}

function Level({ rms }: { rms: number }) {
  return (
    <View style={{ height: 6, borderRadius: 3, backgroundColor: colors.surface2, overflow: "hidden" }}>
      <View style={{ width: `${Math.round(rms * 100)}%`, height: "100%", backgroundColor: colors.brass }} />
    </View>
  );
}

function ListenButton({ on, onPress }: { on: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={{
        height: 56,
        borderRadius: 28,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: on ? colors.surface : colors.brass,
        borderWidth: on ? 1 : 0,
        borderColor: colors.line,
      }}
    >
      <Text style={{ fontFamily: fonts.sansSemi, fontSize: 16, color: on ? colors.fg : colors.brassInk }}>
        {on ? "Stop listening" : "Listen"}
      </Text>
    </Pressable>
  );
}

export function PianoTuner() {
  const a4 = usePractice((s) => s.a4);
  const [on, setOn] = useState(false);
  const reading = usePitch(on);
  const note = reading.hz ? describePitch(reading.hz, a4) : null;
  const shownHz = reading.liveHz;

  return (
    <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 28, gap: 16 }}>
      <Text style={eyebrow}>Piano</Text>
      <Text style={hero}>{note ? note.label : "—"}</Text>
      <Text style={hzStyle}>{shownHz ? `${shownHz.toFixed(1)} Hz` : "— Hz"}</Text>
      <Gauge cents={note ? note.cents : null} zone={note ? windowCents(note.target) : 12} />
      <Text style={hint}>
        {note
          ? note.inTune
            ? `In tune · within ${IN_TUNE_HZ} Hz of ${note.target.toFixed(1)}`
            : `${note.deltaHz > 0 ? "Sharp" : "Flat"} · ${note.deltaHz > 0 ? "+" : ""}${note.deltaHz.toFixed(1)} Hz · ${note.cents > 0 ? "+" : ""}${note.cents.toFixed(0)} cents`
          : reading.status === "listening"
            ? shownHz
              ? "Holding… the name appears when the pitch stays still."
              : "Play a note and hold it. Talking and noise are ignored."
            : "The marker locks when a pitch holds still."}
      </Text>
      <Level rms={reading.rms} />
      {reading.message ? <Text style={hint}>{reading.message}</Text> : null}
      <ListenButton on={on} onPress={() => setOn((value) => !value)} />
      <Text style={hint}>Reference A4 is {a4.toFixed(1)} Hz. Change it here on Violin, or in Settings.</Text>
    </ScrollView>
  );
}

export function ViolinTuner() {
  const a4 = usePractice((s) => s.a4);
  const nudgeA4 = usePractice((s) => s.nudgeA4);
  const [on, setOn] = useState(false);
  const [tone, setTone] = useState(false);
  const [armed, setArmed] = useState<ViolinStringId | null>(null);
  const reading = usePitch(on && !tone);
  const shownHz = reading.liveHz;

  useEffect(() => {
    if (!tone) {
      practiceAudio().stopTone();
      return;
    }
    void practiceAudio().toneOn(a4);
  }, [tone, a4]);

  useEffect(() => () => practiceAudio().stopTone(), []);

  const targetString = armed ? (VIOLIN_STRINGS.find((item) => item.id === armed) ?? null) : null;
  const heard = reading.hz
    ? targetString
      ? {
          id: targetString.id,
          name: targetString.name,
          target: stringFrequency(targetString.midi, a4),
          cents: centsBetween(reading.hz, stringFrequency(targetString.midi, a4)),
        }
      : nearestString(reading.hz, a4)
    : null;
  const deltaHz = reading.hz && heard ? reading.hz - heard.target : null;
  const inTune = deltaHz !== null && Math.abs(deltaHz) <= IN_TUNE_HZ;

  return (
    <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 28, gap: 16 }}>
      <Text style={eyebrow}>Violin · G D A E</Text>
      <Text style={hero}>{heard ? heard.id : "—"}</Text>
      <Text style={hzStyle}>{shownHz ? `${shownHz.toFixed(1)} Hz` : "— Hz"}</Text>

      <View style={{ flexDirection: "row", gap: 8 }}>
        {VIOLIN_STRINGS.map((item) => {
          const selected = armed === item.id;
          const hz = stringFrequency(item.midi, a4);
          return (
            <Pressable
              key={item.id}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => setArmed((current) => (current === item.id ? null : item.id))}
              style={{
                flex: 1,
                height: 76,
                borderRadius: 16,
                borderWidth: 1,
                alignItems: "center",
                justifyContent: "center",
                borderColor: selected ? colors.brass : colors.line,
                backgroundColor: selected ? colors.brass : colors.surface,
              }}
            >
              <Text style={{ fontFamily: fonts.display, fontSize: 24, color: selected ? colors.brassInk : colors.fg }}>
                {item.id}
              </Text>
              <Text
                style={{
                  marginTop: 2,
                  fontFamily: fonts.sans,
                  fontSize: 12,
                  color: selected ? colors.brassInk : colors.muted,
                  fontVariant: ["tabular-nums"],
                }}
              >
                {hz.toFixed(1)}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Gauge cents={heard ? heard.cents : null} zone={heard ? windowCents(heard.target) : 12} />
      <Text style={hint}>
        {!on || tone
          ? armed
            ? `Armed on ${armed}. Open strings only.`
            : "Tap a string to aim at it, or leave them open for auto."
          : !reading.hz
            ? shownHz
              ? "Holding… waiting until it sits on a string."
              : "Hold the string. Speech and room noise stay off the marker."
            : !heard
              ? "Heard, but it is not close to G, D, A, or E."
              : inTune
                ? `In tune · ${heard.name} within ${IN_TUNE_HZ} Hz`
                : `${deltaHz! > 0 ? "Sharp" : "Flat"} of ${heard.name} · ${deltaHz! > 0 ? "+" : ""}${deltaHz!.toFixed(1)} Hz`}
      </Text>
      <Level rms={on && !tone ? reading.rms : 0} />
      {reading.message ? <Text style={hint}>{reading.message}</Text> : null}

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          borderWidth: 1,
          borderColor: colors.line,
          backgroundColor: colors.surface,
          borderRadius: 18,
          paddingHorizontal: 12,
          paddingVertical: 8,
        }}
      >
        <Step label="Lower reference by 0.5 hertz" text="−0.5" onPress={() => nudgeA4(-1)} />
        <View style={{ alignItems: "center" }}>
          <Text style={{ fontFamily: fonts.sans, fontSize: 12, color: colors.muted }}>Reference A4</Text>
          <Text style={{ fontFamily: fonts.display, fontSize: 28, color: colors.fg, fontVariant: ["tabular-nums"] }}>
            {a4.toFixed(1)}
          </Text>
        </View>
        <Step label="Raise reference by 0.5 hertz" text="+0.5" onPress={() => nudgeA4(1)} />
      </View>

      <View style={{ flexDirection: "row", gap: 12 }}>
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            setTone((value) => !value);
            if (!tone) setOn(false);
          }}
          style={{
            flex: 1,
            height: 56,
            borderRadius: 28,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: tone ? colors.brass : colors.surface,
            borderWidth: tone ? 0 : 1,
            borderColor: colors.line,
          }}
        >
          <Text style={{ fontFamily: fonts.sansSemi, fontSize: 16, color: tone ? colors.brassInk : colors.fg }}>
            {tone ? "Stop A" : "Play A"}
          </Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <ListenButton
            on={on && !tone}
            onPress={() => {
              if (tone) practiceAudio().stopTone();
              setTone(false);
              setOn((value) => !value);
            }}
          />
        </View>
      </View>
    </ScrollView>
  );
}

function Step({ label, text, onPress }: { label: string; text: string; onPress: () => void }) {
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

const eyebrow = {
  fontFamily: fonts.sansMed,
  fontSize: 12,
  letterSpacing: 2.2,
  textTransform: "uppercase" as const,
  color: colors.muted,
  textAlign: "center" as const,
};

const hero = {
  fontFamily: fonts.display,
  fontSize: 72,
  lineHeight: 76,
  color: colors.fg,
  textAlign: "center" as const,
  fontVariant: ["tabular-nums" as const],
};

const hzStyle = {
  fontFamily: fonts.displaySoft,
  fontSize: 32,
  color: colors.fg,
  textAlign: "center" as const,
  fontVariant: ["tabular-nums" as const],
};

const hint = {
  fontFamily: fonts.sans,
  fontSize: 14,
  lineHeight: 20,
  color: colors.muted,
  textAlign: "center" as const,
};
