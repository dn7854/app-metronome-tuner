import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, Text, View, type LayoutChangeEvent } from "react-native";
import { isBlack, midiLabel } from "../lib/chords";
import { colors, fonts } from "../theme";

const WHITE_W = 46;
const BLACK_W = 30;
const KEY_H = 188;
const BLACK_H = 118;

export type PianoKeyboardHandle = {
  /** Scroll so the given keys sit in the middle of the visible part. */
  reveal: (midis: number[], animated?: boolean) => void;
};

type Props = {
  low: number;
  high: number;
  lit: number[];
  root: number | null;
  onKey: (midi: number) => void;
};

export const PianoKeyboard = forwardRef<PianoKeyboardHandle, Props>(function PianoKeyboard(
  { low, high, lit, root, onKey },
  ref,
) {
  const scroller = useRef<ScrollView>(null);
  const [viewport, setViewport] = useState(0);
  const pendingReveal = useRef<number[] | null>(null);

  const layout = useMemo(() => {
    const whites: { midi: number; x: number }[] = [];
    const blacks: { midi: number; x: number }[] = [];
    let x = 0;
    for (let midi = low; midi <= high; midi++) {
      if (isBlack(midi)) {
        blacks.push({ midi, x: x - BLACK_W / 2 });
      } else {
        whites.push({ midi, x });
        x += WHITE_W;
      }
    }
    return { whites, blacks, width: x };
  }, [low, high]);

  const centreOf = useCallback(
    (midi: number) => {
      const key = layout.whites.find((k) => k.midi === midi) ?? layout.blacks.find((k) => k.midi === midi);
      if (!key) return 0;
      return key.x + (isBlack(midi) ? BLACK_W : WHITE_W) / 2;
    },
    [layout],
  );

  const reveal = useCallback(
    (midis: number[], animated = true) => {
      if (!midis.length) return;
      if (!viewport) {
        pendingReveal.current = midis;
        return;
      }
      const left = centreOf(Math.min(...midis));
      const right = centreOf(Math.max(...midis));
      const target = (left + right) / 2 - viewport / 2;
      const max = Math.max(0, layout.width - viewport);
      scroller.current?.scrollTo({ x: Math.min(max, Math.max(0, target)), animated });
    },
    [viewport, centreOf, layout.width],
  );

  useImperativeHandle(ref, () => ({ reveal }), [reveal]);

  useEffect(() => {
    if (viewport && pendingReveal.current) {
      const midis = pendingReveal.current;
      pendingReveal.current = null;
      reveal(midis, false);
    }
  }, [viewport, reveal]);

  const litSet = useMemo(() => new Set(lit), [lit]);

  return (
    <View
      onLayout={(event: LayoutChangeEvent) => setViewport(event.nativeEvent.layout.width)}
      style={{ borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.line, backgroundColor: colors.surface }}
    >
      <ScrollView
        ref={scroller}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ width: layout.width, height: KEY_H + 10, paddingTop: 4 }}
      >
        {layout.whites.map(({ midi, x }) => {
          const on = litSet.has(midi);
          const isRoot = on && midi === root;
          const name = midiLabel(midi);
          return (
            <Pressable
              key={midi}
              accessibilityRole="button"
              accessibilityLabel={`Play ${name}`}
              onPressIn={() => onKey(midi)}
              style={({ pressed }) => ({
                position: "absolute",
                left: x,
                top: 4,
                width: WHITE_W - 2,
                marginLeft: 1,
                height: KEY_H,
                borderBottomLeftRadius: 8,
                borderBottomRightRadius: 8,
                backgroundColor: on ? colors.brass : pressed ? "#d8cbbb" : colors.fg,
                borderWidth: isRoot ? 2 : 0,
                borderColor: colors.brassInk,
                alignItems: "center",
                justifyContent: "flex-end",
                paddingBottom: 8,
              })}
            >
              {on || midi % 12 === 0 ? (
                <Text
                  style={{
                    fontFamily: on ? fonts.sansSemi : fonts.sans,
                    fontSize: 11,
                    color: on ? colors.brassInk : colors.muted,
                  }}
                >
                  {name}
                </Text>
              ) : null}
            </Pressable>
          );
        })}
        {layout.blacks.map(({ midi, x }) => {
          const on = litSet.has(midi);
          const isRoot = on && midi === root;
          return (
            <Pressable
              key={midi}
              accessibilityRole="button"
              accessibilityLabel={`Play ${midiLabel(midi)}`}
              onPressIn={() => onKey(midi)}
              style={({ pressed }) => ({
                position: "absolute",
                left: x,
                top: 4,
                width: BLACK_W,
                height: BLACK_H,
                borderBottomLeftRadius: 6,
                borderBottomRightRadius: 6,
                backgroundColor: on ? colors.brass : pressed ? colors.surface2 : colors.bg,
                borderWidth: isRoot ? 2 : 1,
                borderColor: isRoot ? colors.fg : colors.line,
                alignItems: "center",
                justifyContent: "flex-end",
                paddingBottom: 6,
                zIndex: 2,
                elevation: 2,
              })}
            >
              {on ? (
                <Text style={{ fontFamily: fonts.sansSemi, fontSize: 9, color: colors.brassInk }}>
                  {midiLabel(midi).replace(/\d+$/, "")}
                </Text>
              ) : null}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
});
