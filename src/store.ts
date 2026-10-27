import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { clampA4, clampBpm, MODES, SOUNDS } from "./lib/theory";

const KEY = "aurel-v1";

type Persisted = {
  bpm: number;
  modeId: string;
  soundId: string;
  volume: number;
  a4: number;
  premium: boolean;
  haptics: boolean;
};

type PracticeState = Persisted & {
  ready: boolean;
  setBpm: (bpm: number) => void;
  setModeId: (modeId: string) => void;
  setSoundId: (soundId: string) => void;
  setVolume: (volume: number) => void;
  nudgeA4: (direction: -1 | 1) => void;
  setHaptics: (haptics: boolean) => void;
  setPremium: (premium: boolean) => void;
  unlock: () => void;
};

const defaults: Persisted = {
  bpm: 120,
  modeId: "4/4",
  soundId: "wood",
  volume: 0.38,
  a4: 440,
  premium: false,
  haptics: true,
};

function sanitize(parsed: Partial<Persisted>): Persisted {
  return {
    bpm: clampBpm(typeof parsed.bpm === "number" ? parsed.bpm : defaults.bpm),
    modeId: MODES.some((mode) => mode.id === parsed.modeId) ? parsed.modeId! : defaults.modeId,
    soundId: SOUNDS.some((sound) => sound.id === parsed.soundId) ? parsed.soundId! : defaults.soundId,
    volume:
      typeof parsed.volume === "number" ? Math.min(1, Math.max(0, parsed.volume)) : defaults.volume,
    a4: clampA4(typeof parsed.a4 === "number" ? parsed.a4 : defaults.a4),
    premium: parsed.premium === true,
    haptics: parsed.haptics !== false,
  };
}

function write(state: Persisted) {
  const slice: Persisted = {
    bpm: state.bpm,
    modeId: state.modeId,
    soundId: state.soundId,
    volume: state.volume,
    a4: state.a4,
    premium: state.premium,
    haptics: state.haptics,
  };
  void AsyncStorage.setItem(KEY, JSON.stringify(slice));
}

export const usePractice = create<PracticeState>((set, get) => ({
  ...defaults,
  ready: false,
  setBpm: (bpm) => {
    set({ bpm: clampBpm(bpm) });
    write(get());
  },
  setModeId: (modeId) => {
    set({ modeId });
    write(get());
  },
  setSoundId: (soundId) => {
    set({ soundId });
    write(get());
  },
  setVolume: (volume) => {
    set({ volume: Math.min(1, Math.max(0, volume)) });
    write(get());
  },
  nudgeA4: (direction) => {
    set({ a4: clampA4(get().a4 + direction * 0.5) });
    write(get());
  },
  setHaptics: (haptics) => {
    set({ haptics });
    write(get());
  },
  setPremium: (premium) => {
    set({ premium });
    write(get());
  },
  unlock: () => {
    set({ premium: true });
    write(get());
  },
}));

export async function hydratePractice() {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (raw) usePractice.setState(sanitize(JSON.parse(raw) as Partial<Persisted>));
  } catch {
    // keep defaults
  }
  usePractice.setState({ ready: true });
}
