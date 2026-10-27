import { useRef } from "react";
import { Text, View } from "react-native";
import { MAX_BPM, MIN_BPM } from "../lib/theory";
import { colors, fonts } from "../theme";

const START = 220;
const SWEEP = 280;
const SIZE = 280;

function angleToBpm(deg: number) {
  let d = deg - START;
  if (d < 0) d += 360;
  if (d > SWEEP) {
    const toMax = d - SWEEP;
    const toMin = 360 - d;
    return toMax < toMin ? MAX_BPM : MIN_BPM;
  }
  return Math.round(MIN_BPM + (d / SWEEP) * (MAX_BPM - MIN_BPM));
}

type Box = { x: number; y: number; w: number; h: number };

export function Knob({ bpm, onChange }: { bpm: number; onChange: (bpm: number) => void }) {
  const ref = useRef<View>(null);
  const box = useRef<Box>({ x: 0, y: 0, w: SIZE, h: SIZE });
  const t = (bpm - MIN_BPM) / (MAX_BPM - MIN_BPM);
  const angle = START + t * SWEEP;

  function scrub(pageX: number, pageY: number) {
    const { x, y, w, h } = box.current;
    const dx = pageX - (x + w / 2);
    const dy = pageY - (y + h / 2);
    let deg = (Math.atan2(dx, -dy) * 180) / Math.PI;
    if (deg < 0) deg += 360;
    onChange(angleToBpm(deg));
  }

  function remember(pageX: number, pageY: number) {
    ref.current?.measureInWindow((x, y, w, h) => {
      box.current = { x, y, w, h };
      scrub(pageX, pageY);
    });
  }

  const ticks = [];
  for (let value = MIN_BPM; value <= MAX_BPM; value += 10) {
    const tt = (value - MIN_BPM) / (MAX_BPM - MIN_BPM);
    const major = value % 40 === 0;
    ticks.push(
      <View
        key={value}
        pointerEvents="none"
        style={{
          position: "absolute",
          left: SIZE / 2 - 1,
          top: 0,
          width: 2,
          height: SIZE,
          alignItems: "center",
          transform: [{ rotate: `${START + tt * SWEEP}deg` }],
        }}
      >
        <View
          style={{
            width: major ? 2 : 1,
            height: major ? 14 : 8,
            marginTop: 10,
            backgroundColor: major ? colors.brass : colors.line,
          }}
        />
      </View>,
    );
  }

  return (
    <View
      ref={ref}
      accessibilityRole="adjustable"
      accessibilityLabel="Tempo in beats per minute"
      accessibilityValue={{ min: MIN_BPM, max: MAX_BPM, now: bpm }}
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      onResponderGrant={(event) => remember(event.nativeEvent.pageX, event.nativeEvent.pageY)}
      onResponderMove={(event) => scrub(event.nativeEvent.pageX, event.nativeEvent.pageY)}
      style={{ width: SIZE, height: SIZE, alignSelf: "center" }}
    >
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          left: 8,
          top: 8,
          width: SIZE - 16,
          height: SIZE - 16,
          borderRadius: SIZE,
          borderWidth: 2,
          borderColor: colors.line,
        }}
      />
      {ticks}
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          left: SIZE / 2 - 1,
          top: 0,
          width: 2,
          height: SIZE,
          alignItems: "center",
          transform: [{ rotate: `${angle}deg` }],
        }}
      >
        <View style={{ width: 2, height: 36, marginTop: 28, backgroundColor: colors.brass, borderRadius: 2 }} />
      </View>
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          left: SIZE / 2 - 5,
          top: SIZE / 2 - 5,
          width: 10,
          height: 10,
          borderRadius: 5,
          backgroundColor: colors.brass,
        }}
      />
      <View pointerEvents="none" style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 8 }}>
        <Text
          style={{
            fontFamily: fonts.display,
            fontSize: 64,
            color: colors.fg,
            fontVariant: ["tabular-nums"],
          }}
        >
          {bpm}
        </Text>
        <Text
          style={{
            marginTop: 2,
            fontFamily: fonts.sansMed,
            fontSize: 12,
            letterSpacing: 2.4,
            color: colors.muted,
          }}
        >
          BPM
        </Text>
      </View>
    </View>
  );
}
