import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { ScrollView, Text, View, type GestureResponderEvent, type LayoutChangeEvent } from "react-native";
import { isBlack, midiLabel } from "../lib/chords";
import { TABLET_MIN } from "../layout";
import { colors, fonts } from "../theme";

const WHITE_W = 46;
const BLACK_W = 30;
const KEY_H = 188;
const BLACK_H = 118;
const TABLET_WHITE_W = 62;
const TABLET_BLACK_W = 40;
const TABLET_KEY_H = 248;
const TABLET_BLACK_H = 156;
/** A finger that travels farther than this is scrolling, not playing. */
const TAP_SLOP = 12;

type Finger = {
  midi: number | null;
  x: number;
  y: number;
  scroll: number;
  moved: boolean;
  played: boolean;
};

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
  const tablet = viewport >= TABLET_MIN;
  const whiteW = tablet ? TABLET_WHITE_W : WHITE_W;
  const blackW = tablet ? TABLET_BLACK_W : BLACK_W;
  const keyH = tablet ? TABLET_KEY_H : KEY_H;
  const blackH = tablet ? TABLET_BLACK_H : BLACK_H;
  const pendingReveal = useRef<number[] | null>(null);
  const fingers = useRef(new Map<string, Finger>());
  const scrollX = useRef(0);
  const widthRef = useRef(0);
  const viewportRef = useRef(0);
  const origin = useRef({ x: 0, y: 0 });
  const velocity = useRef(0);
  const lastSample = useRef({ x: 0, t: 0 });
  const flingRef = useRef(0);
  const onKeyRef = useRef(onKey);
  onKeyRef.current = onKey;
  const [held, setHeld] = useState<Set<number>>(() => new Set());

  const syncHeld = useCallback(() => {
    const next = new Set<number>();
    for (const finger of fingers.current.values()) {
      if (!finger.moved && finger.midi != null) next.add(finger.midi);
    }
    setHeld(next);
  }, []);

  const play = useCallback((finger: Finger) => {
    if (finger.moved || finger.played || finger.midi == null) return;
    if (Math.abs(scrollX.current - finger.scroll) > 2) {
      finger.moved = true;
      return;
    }
    finger.played = true;
    onKeyRef.current(finger.midi);
  }, []);

  const stopFling = useCallback(() => {
    if (flingRef.current) cancelAnimationFrame(flingRef.current);
    flingRef.current = 0;
  }, []);

  const scrollTo = useCallback((x: number, animated = false) => {
    const max = Math.max(0, widthRef.current - viewportRef.current);
    const next = Math.min(max, Math.max(0, x));
    scrollX.current = next;
    scroller.current?.scrollTo({ x: next, animated });
    return next;
  }, []);

  const startFling = useCallback(
    (pagePxPerMs: number) => {
      let speed = -pagePxPerMs;
      if (Math.abs(speed) < 0.25) return;
      let prev = Date.now();
      const step = () => {
        const now = Date.now();
        const dt = Math.min(34, now - prev);
        prev = now;
        speed *= Math.exp(-dt / 220);
        const before = scrollX.current;
        const next = scrollTo(before + speed * dt);
        if (next === before || Math.abs(speed) < 0.02) return;
        flingRef.current = requestAnimationFrame(step);
      };
      flingRef.current = requestAnimationFrame(step);
    },
    [scrollTo],
  );

  useEffect(() => {
    const live = fingers.current;
    return () => {
      if (flingRef.current) cancelAnimationFrame(flingRef.current);
      live.clear();
    };
  }, []);

  const layout = useMemo(() => {
    const whites: { midi: number; x: number }[] = [];
    const blacks: { midi: number; x: number }[] = [];
    let x = 0;
    for (let midi = low; midi <= high; midi++) {
      if (isBlack(midi)) {
        blacks.push({ midi, x: x - blackW / 2 });
      } else {
        whites.push({ midi, x });
        x += whiteW;
      }
    }
    return { whites, blacks, width: x };
  }, [low, high, whiteW, blackW]);

  widthRef.current = layout.width;
  viewportRef.current = viewport;

  const centreOf = useCallback(
    (midi: number) => {
      const key = layout.whites.find((k) => k.midi === midi) ?? layout.blacks.find((k) => k.midi === midi);
      if (!key) return 0;
      return key.x + (isBlack(midi) ? blackW : whiteW) / 2;
    },
    [layout, blackW, whiteW],
  );

  const reveal = useCallback(
    (midis: number[], animated = true) => {
      if (!midis.length) return;
      if (!viewport) {
        pendingReveal.current = midis;
        return;
      }
      stopFling();
      const left = centreOf(Math.min(...midis));
      const right = centreOf(Math.max(...midis));
      scrollTo((left + right) / 2 - viewport / 2, animated);
    },
    [viewport, centreOf, stopFling, scrollTo],
  );

  const keyAt = useCallback(
    (x: number, y: number) => {
      for (const key of layout.blacks) {
        if (y >= 4 && y <= 4 + blackH && x >= key.x && x <= key.x + blackW) return key.midi;
      }
      for (const key of layout.whites) {
        const left = key.x + 1;
        if (y >= 4 && y <= 4 + keyH && x >= left && x <= left + whiteW - 2) return key.midi;
      }
      return null;
    },
    [layout, blackH, blackW, keyH, whiteW],
  );

  const place = useCallback((touch: { pageX: number; pageY: number }) => {
    return {
      x: touch.pageX - origin.current.x + scrollX.current,
      y: touch.pageY - origin.current.y,
    };
  }, []);

  const beginTouch = useCallback(
    (event: GestureResponderEvent) => {
      stopFling();
      const touches = event.nativeEvent.changedTouches;
      // The first finger's location is relative to the keyboard. Later fingers use
      // page coordinates so a second key still resolves while the first is held.
      if (fingers.current.size === 0 && touches[0]) {
        origin.current = {
          x: touches[0].pageX - touches[0].locationX,
          y: touches[0].pageY - touches[0].locationY,
        };
      }
      for (const touch of touches) {
        const point = place(touch);
        fingers.current.set(String(touch.identifier), {
          midi: keyAt(point.x, point.y),
          x: touch.pageX,
          y: touch.pageY,
          scroll: scrollX.current,
          moved: false,
          played: false,
        });
        lastSample.current = { x: touch.pageX, t: Date.now() };
        velocity.current = 0;
      }
      // One finger may be starting a scroll, so it stays silent until it lifts as a tap.
      // A second finger is a chord: sound every key still held.
      const still = [...fingers.current.values()].filter((finger) => finger.midi != null && !finger.moved);
      if (still.length >= 2) {
        for (const finger of still) play(finger);
      }
      syncHeld();
    },
    [stopFling, place, keyAt, play, syncHeld],
  );

  const moveTouch = useCallback(
    (event: GestureResponderEvent) => {
      let changed = false;
      for (const touch of event.nativeEvent.changedTouches) {
        const finger = fingers.current.get(String(touch.identifier));
        if (!finger) continue;
        const dx = touch.pageX - finger.x;
        const dy = touch.pageY - finger.y;
        if (!finger.moved && dx * dx + dy * dy > TAP_SLOP * TAP_SLOP) {
          finger.moved = true;
          changed = true;
        }
        const now = Date.now();
        const dt = now - lastSample.current.t;
        if (dt > 0) velocity.current = (touch.pageX - lastSample.current.x) / dt;
        lastSample.current = { x: touch.pageX, t: now };
      }
      if (fingers.current.size === 1) {
        const finger = [...fingers.current.values()][0];
        const touch = event.nativeEvent.touches[0];
        if (finger?.moved && touch) scrollTo(finger.scroll - (touch.pageX - finger.x));
      }
      if (changed) syncHeld();
    },
    [scrollTo, syncHeld],
  );

  const endTouch = useCallback(
    (event: GestureResponderEvent) => {
      let dragged = false;
      for (const touch of event.nativeEvent.changedTouches) {
        const finger = fingers.current.get(String(touch.identifier));
        fingers.current.delete(String(touch.identifier));
        if (!finger) continue;
        if (finger.moved || Math.abs(scrollX.current - finger.scroll) > 2) {
          finger.moved = true;
          dragged = true;
        }
        play(finger);
      }
      syncHeld();
      if (fingers.current.size === 0 && dragged && Date.now() - lastSample.current.t < 50) {
        startFling(velocity.current);
      }
    },
    [play, syncHeld, startFling],
  );

  const cancelTouch = useCallback(
    (event: GestureResponderEvent) => {
      for (const touch of event.nativeEvent.changedTouches) {
        const finger = fingers.current.get(String(touch.identifier));
        if (finger) finger.moved = true;
        fingers.current.delete(String(touch.identifier));
      }
      syncHeld();
    },
    [syncHeld],
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
      style={{
        height: keyH + 10,
        borderTopWidth: 1,
        borderBottomWidth: 1,
        borderColor: colors.line,
        backgroundColor: colors.surface,
      }}
    >
      <ScrollView
        ref={scroller}
        horizontal
        scrollEnabled={false}
        pointerEvents="none"
        showsHorizontalScrollIndicator={false}
        style={{ height: keyH + 10 }}
        contentContainerStyle={{ width: layout.width, height: keyH + 10, paddingTop: 4 }}
      >
        {layout.whites.map(({ midi, x }) => {
          const on = litSet.has(midi);
          const down = held.has(midi);
          const isRoot = on && midi === root;
          const name = midiLabel(midi);
          return (
            <View
              key={midi}
              accessible
              accessibilityRole="button"
              accessibilityLabel={`Play ${name}`}
              onAccessibilityTap={() => onKeyRef.current(midi)}
              style={{
                position: "absolute",
                left: x,
                top: 4,
                width: whiteW - 2,
                marginLeft: 1,
                height: keyH,
                borderBottomLeftRadius: 8,
                borderBottomRightRadius: 8,
                backgroundColor: on ? colors.brass : down ? "#d8cbbb" : colors.fg,
                borderWidth: isRoot ? 2 : 0,
                borderColor: colors.brassInk,
                alignItems: "center",
                justifyContent: "flex-end",
                paddingBottom: 8,
              }}
            >
              {on || midi % 12 === 0 ? (
                <Text
                  style={{
                    fontFamily: on ? fonts.sansSemi : fonts.sans,
                    fontSize: tablet ? 13 : 11,
                    color: on ? colors.brassInk : colors.muted,
                  }}
                >
                  {name}
                </Text>
              ) : null}
            </View>
          );
        })}
        {layout.blacks.map(({ midi, x }) => {
          const on = litSet.has(midi);
          const down = held.has(midi);
          const isRoot = on && midi === root;
          const name = midiLabel(midi);
          return (
            <View
              key={midi}
              accessible
              accessibilityRole="button"
              accessibilityLabel={`Play ${name}`}
              onAccessibilityTap={() => onKeyRef.current(midi)}
              style={{
                position: "absolute",
                left: x,
                top: 4,
                width: blackW,
                height: blackH,
                borderBottomLeftRadius: 6,
                borderBottomRightRadius: 6,
                backgroundColor: on ? colors.brass : down ? colors.surface2 : colors.bg,
                borderWidth: isRoot ? 2 : 1,
                borderColor: isRoot ? colors.fg : colors.line,
                alignItems: "center",
                justifyContent: "flex-end",
                paddingBottom: 6,
                zIndex: 2,
                elevation: 2,
              }}
            >
              {on ? (
                <Text style={{ fontFamily: fonts.sansSemi, fontSize: tablet ? 11 : 9, color: colors.brassInk }}>
                  {name.replace(/\d+$/, "")}
                </Text>
              ) : null}
            </View>
          );
        })}
      </ScrollView>
      <View
        accessible={false}
        importantForAccessibility="no"
        accessibilityElementsHidden
        onTouchStart={beginTouch}
        onTouchMove={moveTouch}
        onTouchEnd={endTouch}
        onTouchCancel={cancelTouch}
        style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}
      />
    </View>
  );
});
