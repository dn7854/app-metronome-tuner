export type ChordQuality = "maj" | "min" | "dom7";

export const QUALITIES: { id: ChordQuality; label: string; long: string; suffix: string; intervals: number[] }[] = [
  { id: "maj", label: "Major", long: "major", suffix: "", intervals: [0, 4, 7] },
  { id: "min", label: "Minor", long: "minor", suffix: "m", intervals: [0, 3, 7] },
  { id: "dom7", label: "Dom 7", long: "dominant seventh", suffix: "7", intervals: [0, 4, 7, 10] },
];

/** Lowest and highest keys on the chord piano: the full 88, A0 to C8, one sample per key. */
export const PIANO_LOW = 21;
export const PIANO_HIGH = 108;

const LETTERS = ["C", "D", "E", "F", "G", "A", "B"] as const;
const LETTER_PC = [0, 2, 4, 5, 7, 9, 11];
const SHARP = "\u266F";
const FLAT = "\u266D";
const SHARP_NAMES = ["C", `C${SHARP}`, "D", `D${SHARP}`, "E", "F", `F${SHARP}`, "G", `G${SHARP}`, "A", `A${SHARP}`, "B"];

/** Root spellings that keep each chord on the usual side of the circle of fifths. */
const MAJOR_ROOTS = ["C", `D${FLAT}`, "D", `E${FLAT}`, "E", "F", `F${SHARP}`, "G", `A${FLAT}`, "A", `B${FLAT}`, "B"];
const MINOR_ROOTS = ["C", `C${SHARP}`, "D", `E${FLAT}`, "E", "F", `F${SHARP}`, "G", `G${SHARP}`, "A", `B${FLAT}`, "B"];

/** Chord tones sit this many letters above the root: root, third, fifth, seventh. */
const DEGREE_STEPS = [0, 2, 4, 6];

export function getQuality(id: ChordQuality) {
  return QUALITIES.find((q) => q.id === id) ?? QUALITIES[0]!;
}

export function rootName(pc: number, quality: ChordQuality) {
  const names = quality === "min" ? MINOR_ROOTS : MAJOR_ROOTS;
  return names[((pc % 12) + 12) % 12]!;
}

function accidental(offset: number) {
  if (offset === 0) return "";
  if (offset === 1) return SHARP;
  if (offset === 2) return SHARP + SHARP;
  if (offset === -1) return FLAT;
  if (offset === -2) return FLAT + FLAT;
  return "";
}

export function midiLabel(midi: number) {
  return `${SHARP_NAMES[((midi % 12) + 12) % 12]}${Math.floor(midi / 12) - 1}`;
}

export function isBlack(midi: number) {
  return [1, 3, 6, 8, 10].includes(((midi % 12) + 12) % 12);
}

export type Chord = {
  symbol: string;
  name: string;
  notes: number[];
  spelled: string[];
};

/** Close-position chord with the root in the given octave (4 = middle C octave). */
export function buildChord(rootPc: number, quality: ChordQuality, octave: number): Chord {
  const q = getQuality(quality);
  const root = rootName(rootPc, quality);
  const rootLetter = LETTERS.indexOf(root[0] as (typeof LETTERS)[number]);
  const rootMidi = Math.min(PIANO_HIGH - 10, Math.max(PIANO_LOW, (octave + 1) * 12 + rootPc));
  const notes = q.intervals.map((interval) => rootMidi + interval);
  const spelled = q.intervals.map((interval, index) => {
    const letterIndex = (rootLetter + DEGREE_STEPS[index]!) % 7;
    const pc = (rootPc + interval) % 12;
    let offset = pc - LETTER_PC[letterIndex]!;
    if (offset > 6) offset -= 12;
    if (offset < -6) offset += 12;
    return `${LETTERS[letterIndex]}${accidental(offset)}`;
  });
  return {
    symbol: `${root}${q.suffix}`,
    name: `${root} ${q.long}`,
    notes,
    spelled,
  };
}
