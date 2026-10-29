export const MIN_BPM = 40;
export const MAX_BPM = 240;
export const MIN_A4 = 432;
export const MAX_A4 = 448;
export const IN_TUNE_HZ = 3;

export type Mode = {
  id: string;
  label: string;
  isPremium: boolean;
  steps: number;
  downbeats: number[];
  beats: number[];
  /** Click length measured in quarter notes. BPM is always a quarter-note tempo. */
  quartersPerClick: number;
  blurb: string;
};

export const MODES: Mode[] = [
  {
    id: "1/4",
    label: "1/4",
    isPremium: false,
    steps: 1,
    downbeats: [0],
    beats: [],
    quartersPerClick: 1,
    blurb: "One knock per bar",
  },
  {
    id: "2/4",
    label: "2/4",
    isPremium: false,
    steps: 2,
    downbeats: [0],
    beats: [],
    quartersPerClick: 1,
    blurb: "Two beats, accent on one",
  },
  {
    id: "4/4",
    label: "4/4",
    isPremium: false,
    steps: 4,
    downbeats: [0],
    beats: [2],
    quartersPerClick: 1,
    blurb: "Four beats, a lighter three",
  },
  {
    id: "eighths",
    label: "Eighths",
    isPremium: true,
    steps: 8,
    downbeats: [0],
    beats: [2, 4, 6],
    quartersPerClick: 0.5,
    blurb: "Eight taps in four-four",
  },
  {
    id: "triplets",
    label: "Triplets",
    isPremium: true,
    steps: 12,
    downbeats: [0],
    beats: [3, 6, 9],
    quartersPerClick: 1 / 3,
    blurb: "Triplet division of four-four",
  },
  {
    id: "3/4",
    label: "3/4",
    isPremium: true,
    steps: 3,
    downbeats: [0],
    beats: [],
    quartersPerClick: 1,
    blurb: "Waltz",
  },
  {
    id: "5/4",
    label: "5/4",
    isPremium: true,
    steps: 5,
    downbeats: [0],
    beats: [],
    quartersPerClick: 1,
    blurb: "Five beats",
  },
  {
    id: "6/8",
    label: "6/8",
    isPremium: true,
    steps: 6,
    downbeats: [0],
    beats: [3],
    quartersPerClick: 0.5,
    blurb: "Six eighths, lift on four",
  },
  {
    id: "7/8",
    label: "7/8",
    isPremium: true,
    steps: 7,
    downbeats: [0],
    beats: [2, 4],
    quartersPerClick: 0.5,
    blurb: "2 + 2 + 3",
  },
  {
    id: "9/8",
    label: "9/8",
    isPremium: true,
    steps: 9,
    downbeats: [0],
    beats: [3, 6],
    quartersPerClick: 0.5,
    blurb: "Three groups of three",
  },
  {
    id: "12/8",
    label: "12/8",
    isPremium: true,
    steps: 12,
    downbeats: [0],
    beats: [3, 6, 9],
    quartersPerClick: 0.5,
    blurb: "Four groups of three",
  },
];

export type SoundId = "wood" | "knock" | "tick" | "clave" | "rim" | "bell" | "shaker";

export type Sound = {
  id: SoundId;
  label: string;
  isPremium: boolean;
};

export const SOUNDS: Sound[] = [
  { id: "wood", label: "Woodblock", isPremium: false },
  { id: "knock", label: "Knock", isPremium: false },
  { id: "tick", label: "Tick", isPremium: true },
  { id: "clave", label: "Clave", isPremium: true },
  { id: "rim", label: "Rim", isPremium: true },
  { id: "bell", label: "Bell", isPremium: true },
  { id: "shaker", label: "Shaker", isPremium: true },
];

export type Accent = "down" | "beat" | "sub";

export function getMode(id: string): Mode {
  return MODES.find((m) => m.id === id) ?? MODES[2];
}

export function getSound(id: string): Sound {
  return SOUNDS.find((s) => s.id === id) ?? SOUNDS[0];
}

export function accentAt(mode: Mode, step: number): Accent {
  if (mode.downbeats.includes(step)) return "down";
  if (mode.beats.includes(step)) return "beat";
  return "sub";
}

export function secondsPerClick(mode: Mode, bpm: number) {
  return (60 / Math.min(MAX_BPM, Math.max(MIN_BPM, bpm))) * mode.quartersPerClick;
}

export function tempoName(bpm: number) {
  if (bpm < 56) return "Largo";
  if (bpm < 66) return "Larghetto";
  if (bpm < 76) return "Adagio";
  if (bpm < 108) return "Andante";
  if (bpm < 120) return "Moderato";
  if (bpm < 156) return "Allegro";
  if (bpm < 176) return "Vivace";
  if (bpm < 200) return "Presto";
  return "Prestissimo";
}

export function clampBpm(bpm: number) {
  return Math.min(MAX_BPM, Math.max(MIN_BPM, Math.round(bpm)));
}

export function clampA4(hz: number) {
  const stepped = Math.round(hz * 2) / 2;
  return Math.min(MAX_A4, Math.max(MIN_A4, stepped));
}

const NAMES = ["C", "C♯", "D", "D♯", "E", "F", "F♯", "G", "G♯", "A", "A♯", "B"] as const;

export type NoteRead = {
  label: string;
  name: string;
  octave: number;
  target: number;
  cents: number;
  deltaHz: number;
  inTune: boolean;
};

export function describePitch(freq: number, a4: number): NoteRead {
  const midi = Math.round(69 + 12 * Math.log2(freq / a4));
  const name = NAMES[((midi % 12) + 12) % 12];
  const octave = Math.floor(midi / 12) - 1;
  const target = a4 * 2 ** ((midi - 69) / 12);
  const cents = 1200 * Math.log2(freq / target);
  const deltaHz = freq - target;
  return {
    label: `${name}${octave}`,
    name,
    octave,
    target,
    cents,
    deltaHz,
    inTune: Math.abs(deltaHz) <= IN_TUNE_HZ,
  };
}

export type ViolinStringId = "G" | "D" | "A" | "E";

export type ViolinString = {
  id: ViolinStringId;
  name: string;
  midi: number;
};

export const VIOLIN_STRINGS: ViolinString[] = [
  { id: "G", name: "G3", midi: 55 },
  { id: "D", name: "D4", midi: 62 },
  { id: "A", name: "A4", midi: 69 },
  { id: "E", name: "E5", midi: 76 },
];

export function stringFrequency(midi: number, a4: number) {
  return a4 * 2 ** ((midi - 69) / 12);
}

export function centsBetween(freq: number, target: number) {
  return 1200 * Math.log2(freq / target);
}

/** Nearest violin string if the note is close enough to be that open string. */
export function nearestString(freq: number, a4: number): (ViolinString & { target: number; cents: number }) | null {
  let best: (ViolinString & { target: number; cents: number }) | null = null;
  for (const s of VIOLIN_STRINGS) {
    const target = stringFrequency(s.midi, a4);
    const cents = centsBetween(freq, target);
    if (Math.abs(cents) > 45) continue;
    if (!best || Math.abs(cents) < Math.abs(best.cents)) best = { ...s, target, cents };
  }
  return best;
}
