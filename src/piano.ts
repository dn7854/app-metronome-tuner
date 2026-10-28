import { practiceAudio } from "./audio";
import { PIANO_SAMPLES } from "./lib/pianoSamples";

/**
 * Sampled piano for the Chords tab. Every key has its own recording, so notes are
 * never pitch-shifted. Buffers decode on first use and a small cache keeps the
 * most recent ones; the shared AudioContext comes from the metronome engine.
 */

type Voice = { source: any; gain: any; endsAt: number };

const MAX_BUFFERS = 40;
const buffers = new Map<number, any>();
const pending = new Map<number, Promise<any>>();
let master: any = null;
let voices: Voice[] = [];
let generation = 0;

async function context() {
  const ctx = await practiceAudio().pianoContext();
  if (ctx && !master) {
    master = ctx.createGain();
    master.gain.value = 0.9;
    master.connect(ctx.destination);
  }
  return ctx;
}

function remember(midi: number, buffer: any) {
  buffers.delete(midi);
  buffers.set(midi, buffer);
  while (buffers.size > MAX_BUFFERS) {
    const oldest = buffers.keys().next().value;
    if (oldest === undefined) break;
    buffers.delete(oldest);
  }
}

async function load(ctx: any, midi: number): Promise<any> {
  const cached = buffers.get(midi);
  if (cached) {
    remember(midi, cached);
    return cached;
  }
  const source = PIANO_SAMPLES[midi];
  if (source == null) return null;
  let job = pending.get(midi);
  if (!job) {
    job = (ctx.decodeAudioData(source) as Promise<any>)
      .then((buffer) => {
        remember(midi, buffer);
        return buffer;
      })
      .catch(() => null)
      .finally(() => pending.delete(midi));
    pending.set(midi, job);
  }
  return job;
}

/** Decode a few keys ahead of time so the first tap is not late. */
export async function preloadPiano(midis: number[]) {
  try {
    const ctx = await context();
    if (!ctx) return;
    for (const midi of midis) await load(ctx, midi);
  } catch {
    // playback will retry on demand
  }
}

function fade(voice: Voice, ctx: any, seconds: number) {
  const t = ctx.currentTime;
  try {
    voice.gain.gain.cancelScheduledValues(t);
    voice.gain.gain.setTargetAtTime(0.0001, t, seconds / 3);
    voice.source.stop(t + seconds);
  } catch {
    // already stopped
  }
}

/**
 * Play notes together. `strumMs` spreads them low to high, like a quick roll.
 * `replace` releases whatever is still ringing first, so chords do not pile up.
 */
export async function playNotes(midis: number[], { strumMs = 0, replace = true }: { strumMs?: number; replace?: boolean } = {}) {
  const ticket = replace ? ++generation : generation;
  const ctx = await context();
  if (!ctx || !master) return;
  const loaded = await Promise.all(midis.map((midi) => load(ctx, midi)));
  if (ticket !== generation) return;
  const now = ctx.currentTime;
  voices = voices.filter((voice) => voice.endsAt > now);
  if (replace) {
    for (const voice of voices) fade(voice, ctx, 0.12);
    voices = [];
  }
  const level = 0.85 / Math.sqrt(Math.max(1, midis.length));
  const start = now + 0.015;
  loaded.forEach((buffer, index) => {
    if (!buffer) return;
    const when = start + (index * strumMs) / 1000;
    const source = ctx.createBufferSource();
    const gain = ctx.createGain();
    source.buffer = buffer;
    gain.gain.setValueAtTime(level, when);
    source.connect(gain);
    gain.connect(master);
    source.start(when);
    voices.push({ source, gain, endsAt: when + (buffer.duration ?? 2) });
  });
  if (voices.length > 24) {
    for (const voice of voices.splice(0, voices.length - 24)) fade(voice, ctx, 0.08);
  }
}

/** Release everything that is still ringing. Called when leaving the Chords tab. */
export function stopPiano() {
  generation++;
  const ctx = practiceAudio().currentContext();
  if (!ctx) {
    voices = [];
    return;
  }
  for (const voice of voices) fade(voice, ctx, 0.1);
  voices = [];
}
