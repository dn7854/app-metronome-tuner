import { useEffect, useMemo, useRef, useState } from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { buildChord, PIANO_HIGH, PIANO_LOW, QUALITIES, rootName, type ChordQuality } from "../lib/chords";
import { useLayout } from "../layout";
import { playNotes, preloadPiano, stopPiano } from "../piano";
import { colors, fonts } from "../theme";
import { PianoKeyboard, type PianoKeyboardHandle } from "./PianoKeyboard";

const MIN_OCTAVE = 2;
const MAX_OCTAVE = 6;
/** Gap between notes when arpeggio is on, low to high. */
const ARPEGGIO_MS = 28;
const ROOTS = Array.from({ length: 12 }, (_, pc) => pc);

export function ChordsView() {
  const [rootPc, setRootPc] = useState(0);
  const [quality, setQuality] = useState<ChordQuality>("maj");
  const [octave, setOctave] = useState(4);
  const [arpeggio, setArpeggio] = useState(false);
  const [picking, setPicking] = useState(false);
  const keyboard = useRef<PianoKeyboardHandle>(null);
  const layout = useLayout();
  const chord = useMemo(() => buildChord(rootPc, quality, octave), [rootPc, quality, octave]);

  useEffect(() => {
    keyboard.current?.reveal(chord.notes);
  }, [chord]);

  useEffect(() => {
    void preloadPiano(buildChord(0, "maj", 4).notes);
    return () => stopPiano();
  }, []);

  function play(next = chord) {
    void playNotes(next.notes, { strumMs: arpeggio ? ARPEGGIO_MS : 0 });
  }

  function choose(nextRoot: number, nextQuality: ChordQuality, nextOctave: number) {
    setRootPc(nextRoot);
    setQuality(nextQuality);
    setOctave(nextOctave);
  }

  const qualityLong = QUALITIES.find((q) => q.id === quality)?.long ?? "";

  return (
    <View style={{ flex: 1 }}>
      <View
        style={{
          width: layout.content,
          alignSelf: "center",
          paddingHorizontal: layout.pad,
          gap: 2,
          marginBottom: layout.tablet ? 20 : 14,
        }}
      >
        <Text style={eyebrow}>Chords {"\u00B7"} Major, minor, dominant 7</Text>
        <Text style={hero}>{chord.symbol}</Text>
        <Text style={sub}>{chord.name}</Text>
        <Text style={hint}>{chord.spelled.join("  \u00B7  ")}</Text>
      </View>

      <View style={{ marginBottom: layout.tablet ? 44 : 14 }}>
        <PianoKeyboard
          ref={keyboard}
          low={PIANO_LOW}
          high={PIANO_HIGH}
          lit={chord.notes}
          root={chord.notes[0] ?? null}
          onKey={(midi) => void playNotes([midi], { replace: false })}
        />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          flexGrow: 1,
          paddingBottom: 16,
          width: layout.content,
          alignSelf: "center",
          paddingHorizontal: layout.pad,
          gap: 10,
        }}
      >
        <View style={{ flexDirection: "row", gap: 8 }}>
          {QUALITIES.map((item) => {
            const selected = quality === item.id;
            return (
              <Pressable
                key={item.id}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => choose(rootPc, item.id, octave)}
                style={{
                  flex: 1,
                  height: 48,
                  borderRadius: 24,
                  borderWidth: 1,
                  alignItems: "center",
                  justifyContent: "center",
                  borderColor: selected ? colors.brass : colors.line,
                  backgroundColor: selected ? colors.brass : colors.surface,
                }}
              >
                <Text style={{ fontFamily: fonts.sansSemi, fontSize: 15, color: selected ? colors.brassInk : colors.fg }}>
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={{ flexDirection: "row", gap: 8 }}>
          <Stepper
            title="Chord"
            value={rootName(rootPc, quality)}
            valueLabel={`${rootName(rootPc, quality)} ${qualityLong}, tap to pick a chord`}
            onValuePress={() => setPicking(true)}
            caret
            downLabel="Previous chord"
            upLabel="Next chord"
            downText={"\u2039"}
            upText={"\u203A"}
            onDown={() => choose((rootPc + 11) % 12, quality, octave)}
            onUp={() => choose((rootPc + 1) % 12, quality, octave)}
          />
          <Stepper
            title="Octave"
            value={String(octave)}
            valueLabel={`Octave ${octave}`}
            downLabel="Octave down"
            upLabel="Octave up"
            downText={"\u2212"}
            upText="+"
            downDisabled={octave <= MIN_OCTAVE}
            upDisabled={octave >= MAX_OCTAVE}
            onDown={() => choose(rootPc, quality, Math.max(MIN_OCTAVE, octave - 1))}
            onUp={() => choose(rootPc, quality, Math.min(MAX_OCTAVE, octave + 1))}
          />
        </View>

        <View style={{ flexDirection: "row", gap: 12 }}>
          <Pressable
            accessibilityRole="switch"
            accessibilityState={{ checked: arpeggio }}
            onPress={() => setArpeggio((value) => !value)}
            style={{
              flex: 1,
              height: 56,
              borderRadius: 28,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: colors.surface,
              borderWidth: 1,
              borderColor: arpeggio ? colors.brass : colors.line,
            }}
          >
            <Text style={{ fontFamily: fonts.sansSemi, fontSize: 16, color: arpeggio ? colors.brass : colors.fg }}>
              {arpeggio ? "Arpeggio on" : "Arpeggio off"}
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => play()}
            style={{
              flex: 1,
              height: 56,
              borderRadius: 28,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: colors.brass,
            }}
          >
            <Text style={{ fontFamily: fonts.sansSemi, fontSize: 16, color: colors.brassInk }}>Play {chord.symbol}</Text>
          </Pressable>
        </View>

        <Text style={[hint, { fontSize: 12, lineHeight: 16 }]}>
          Swipe the keys to move along the piano. Tap a key to play it, or hold several keys at once.
        </Text>
      </ScrollView>

      <Modal visible={picking} transparent animationType="fade" onRequestClose={() => setPicking(false)}>
        <Pressable
          accessibilityLabel="Close chord picker"
          onPress={() => setPicking(false)}
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", alignItems: "center", padding: 24 }}
        >
          <Pressable
            onPress={() => {}}
            style={{
              backgroundColor: colors.surface,
              borderRadius: 22,
              borderWidth: 1,
              borderColor: colors.line,
              padding: 16,
              gap: 12,
              width: "100%",
              maxWidth: 520,
            }}
          >
            <Text style={eyebrow}>Pick a chord {"\u00B7"} {qualityLong}</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {ROOTS.map((pc) => {
                const selected = rootPc === pc;
                return (
                  <Pressable
                    key={pc}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    accessibilityLabel={`${rootName(pc, quality)} ${qualityLong}`}
                    onPress={() => {
                      setPicking(false);
                      choose(pc, quality, octave);
                    }}
                    style={{
                      width: "22%",
                      flexGrow: 1,
                      height: 52,
                      borderRadius: 14,
                      borderWidth: 1,
                      alignItems: "center",
                      justifyContent: "center",
                      borderColor: selected ? colors.brass : colors.line,
                      backgroundColor: selected ? colors.brass : colors.surface2,
                    }}
                  >
                    <Text style={{ fontFamily: fonts.display, fontSize: 20, color: selected ? colors.brassInk : colors.fg }}>
                      {rootName(pc, quality)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function Stepper({
  title,
  value,
  valueLabel,
  onValuePress,
  caret,
  downLabel,
  upLabel,
  downText,
  upText,
  downDisabled,
  upDisabled,
  onDown,
  onUp,
}: {
  title: string;
  value: string;
  valueLabel: string;
  onValuePress?: () => void;
  caret?: boolean;
  downLabel: string;
  upLabel: string;
  downText: string;
  upText: string;
  downDisabled?: boolean;
  upDisabled?: boolean;
  onDown: () => void;
  onUp: () => void;
}) {
  return (
    <View
      style={{
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        borderWidth: 1,
        borderColor: colors.line,
        backgroundColor: colors.surface,
        borderRadius: 18,
        paddingHorizontal: 6,
        paddingVertical: 6,
      }}
    >
      <Step label={downLabel} text={downText} disabled={downDisabled} onPress={onDown} />
      <Pressable
        accessibilityRole={onValuePress ? "button" : "text"}
        accessibilityLabel={valueLabel}
        disabled={!onValuePress}
        onPress={onValuePress}
        style={{ flex: 1, alignItems: "center", justifyContent: "center", minHeight: 44 }}
      >
        <Text style={{ fontFamily: fonts.sans, fontSize: 11, color: colors.muted }}>{title}</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
          <Text style={{ fontFamily: fonts.display, fontSize: 22, lineHeight: 26, color: colors.fg, fontVariant: ["tabular-nums"] }}>
            {value}
          </Text>
          {caret ? <Text style={{ fontFamily: fonts.sans, fontSize: 11, color: colors.brass }}>{"\u25BE"}</Text> : null}
        </View>
      </Pressable>
      <Step label={upLabel} text={upText} disabled={upDisabled} onPress={onUp} />
    </View>
  );
}

function Step({ label, text, onPress, disabled }: { label: string; text: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={{
        height: 40,
        width: 40,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: colors.line,
        alignItems: "center",
        justifyContent: "center",
        opacity: disabled ? 0.4 : 1,
      }}
    >
      <Text style={{ fontFamily: fonts.sansMed, fontSize: 18, color: colors.fg }}>{text}</Text>
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
  fontSize: 44,
  lineHeight: 50,
  color: colors.fg,
  textAlign: "center" as const,
};

const sub = {
  fontFamily: fonts.displaySoft,
  fontSize: 18,
  color: colors.fg,
  textAlign: "center" as const,
};

const hint = {
  fontFamily: fonts.sans,
  fontSize: 14,
  lineHeight: 20,
  color: colors.muted,
  textAlign: "center" as const,
};
