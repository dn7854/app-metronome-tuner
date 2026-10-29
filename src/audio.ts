import { AudioContext, AudioManager } from "react-native-audio-api";
import { accentAt, type Accent, type Mode, type SoundId, secondsPerClick } from "./lib/theory";

type StepListener = (step: number) => void;

/**
 * Look-ahead metronome and a quiet A4 reference tone.
 * Clicks are synthesized near full scale. The settings fader only trims them.
 */
export class PracticeAudio {
  private ctx: InstanceType<typeof AudioContext> | null = null;
  private clickGain: any = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private nextTime = 0;
  private step = 0;
  private timeouts: Array<ReturnType<typeof setTimeout>> = [];
  private tone: { stop: () => void; set: (hz: number) => void } | null = null;
  private listener: StepListener | null = null;

  bpm = 120;
  mode: Mode | null = null;
  sound: SoundId = "wood";
  volume = 0.8;
  playing = false;

  setVolume(volume: number) {
    this.volume = volume;
    const ctx = this.ctx as any;
    if (ctx && this.clickGain) {
      this.clickGain.gain.setTargetAtTime(volume, ctx.currentTime, 0.03);
    }
  }

  setListener(listener: StepListener | null) {
    this.listener = listener;
  }

  start() {
    if (!this.mode || this.playing) return;
    this.playing = true;
    void this.arm();
  }

  private async arm() {
    await this.prepare("playback");
    if (!this.playing || !this.ctx) return;
    this.stopTone();
    const ctx = this.ctx as any;
    this.step = 0;
    this.nextTime = ctx.currentTime + 0.06;
    if (this.timer) clearInterval(this.timer);
    this.timer = setInterval(() => this.pump(), 25);
    this.pump();
  }

  stop() {
    this.playing = false;
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    for (const id of this.timeouts) clearTimeout(id);
    this.timeouts = [];
    this.listener?.(-1);
  }

  toggle() {
    if (this.playing) this.stop();
    else this.start();
  }

  /** Shared context for the Chords piano, set up for playback (not the tuner mic). */
  async pianoContext() {
    await this.prepare("playback");
    return this.ctx as any;
  }

  currentContext() {
    return this.ctx as any;
  }

  private async prepare(kind: "playback" | "tone") {
    try {
      AudioManager.setAudioSessionOptions({
        iosCategory: "playback",
        iosMode: kind === "tone" ? "measurement" : "default",
        iosOptions: ["mixWithOthers"],
      });
      await AudioManager.setAudioSessionActivity(true);
    } catch {
      // Android ignores unknown session keys.
    }
    const ctx = (this.ctx ?? new AudioContext({ sampleRate: 44100 })) as any;
    this.ctx = ctx;
    if (ctx.state === "suspended") await ctx.resume?.();
    if (!this.clickGain) {
      const clickGain = ctx.createGain();
      clickGain.gain.value = this.volume;
      clickGain.connect(ctx.destination);
      this.clickGain = clickGain;
    }
  }

  private pump() {
    const ctx = this.ctx as any;
    const mode = this.mode;
    if (!ctx || !mode || !this.playing) return;
    const horizon = ctx.currentTime + 0.12;
    while (this.nextTime < horizon) {
      this.knock(this.nextTime, accentAt(mode, this.step));
      const when = this.step;
      const delay = Math.max(0, (this.nextTime - ctx.currentTime) * 1000);
      const id = setTimeout(() => {
        if (this.playing) this.listener?.(when);
      }, delay);
      this.timeouts.push(id);
      this.nextTime += secondsPerClick(mode, this.bpm);
      this.step = (this.step + 1) % mode.steps;
    }
    if (this.timeouts.length > 64) this.timeouts.splice(0, this.timeouts.length - 32);
  }

  private knock(time: number, accent: Accent) {
    const ctx = this.ctx as any;
    const out = this.clickGain;
    if (!ctx || !out) return;
    const strong = accent === "down" ? 1 : accent === "beat" ? 0.72 : 0.4;
    if (this.sound === "wood") this.wood(ctx, out, time, strong, accent === "sub");
    else if (this.sound === "knock") this.knockSound(ctx, out, time, strong, accent);
    else if (this.sound === "tick") this.tick(ctx, out, time, strong);
    else if (this.sound === "clave") this.clave(ctx, out, time, strong);
    else if (this.sound === "rim") this.rim(ctx, out, time, strong);
    else if (this.sound === "bell") this.bell(ctx, out, time, strong);
    else this.shaker(ctx, out, time, strong);
  }

  private env(ctx: any, out: any, time: number, peak: number, decay: number) {
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, time);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), time + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, time + decay);
    g.connect(out);
    return g;
  }

  private wood(ctx: any, out: any, time: number, strong: number, sub: boolean) {
    const osc = ctx.createOscillator();
    const body = this.env(ctx, out, time, 0.28 * strong, sub ? 0.045 : 0.07);
    osc.type = "sine";
    const startF = sub ? 760 : strong > 0.9 ? 640 : 540;
    osc.frequency.setValueAtTime(startF, time);
    osc.frequency.exponentialRampToValueAtTime(sub ? 280 : 170, time + 0.06);
    osc.connect(body);
    osc.start(time);
    osc.stop(time + 0.09);

    const noise = ctx.createBufferSource();
    const len = Math.floor(ctx.sampleRate * 0.018);
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    noise.buffer = buffer;
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = sub ? 2400 : 1800;
    bp.Q.value = 5;
    const ng = this.env(ctx, out, time, 0.55 * strong, 0.03);
    noise.connect(bp);
    bp.connect(ng);
    noise.start(time);
    noise.stop(time + 0.03);
  }

  private knockSound(ctx: any, out: any, time: number, strong: number, accent: Accent) {
    const noise = ctx.createBufferSource();
    const len = Math.floor(ctx.sampleRate * 0.008);
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    noise.buffer = buffer;
    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 800;
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 3500;
    noise.connect(hp);
    hp.connect(lp);
    lp.connect(this.env(ctx, out, time, 0.48 * strong, 0.02));
    noise.start(time);
    noise.stop(time + 0.025);

    const body = ctx.createOscillator();
    body.type = "sine";
    body.frequency.setValueAtTime(220, time);
    body.frequency.exponentialRampToValueAtTime(90, time + 0.04);
    body.connect(this.env(ctx, out, time, 0.15 * strong, 0.05));
    body.start(time);
    body.stop(time + 0.06);

    const beepHz = accent === "down" ? 988 : accent === "beat" ? 880 : 740;
    const beep = ctx.createOscillator();
    beep.type = "sine";
    beep.frequency.value = beepHz;
    beep.connect(this.env(ctx, out, time, 0.22 * strong, 0.055));
    beep.start(time);
    beep.stop(time + 0.07);
  }

  private tick(ctx: any, out: any, time: number, strong: number) {
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = strong > 0.9 ? 1480 : 1120;
    osc.connect(this.env(ctx, out, time, 0.72 * strong, 0.028));
    osc.start(time);
    osc.stop(time + 0.04);
  }

  private clave(ctx: any, out: any, time: number, strong: number) {
    for (const [freq, mix] of [
      [2100, 0.5],
      [1560, 0.3],
    ] as const) {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = freq;
      osc.connect(this.env(ctx, out, time, mix * strong, 0.045));
      osc.start(time);
      osc.stop(time + 0.06);
    }
  }

  private rim(ctx: any, out: any, time: number, strong: number) {
    const osc = ctx.createOscillator();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(420, time);
    osc.frequency.exponentialRampToValueAtTime(180, time + 0.04);
    osc.connect(this.env(ctx, out, time, 0.4 * strong, 0.05));
    osc.start(time);
    osc.stop(time + 0.06);
    const noise = ctx.createBufferSource();
    const len = Math.floor(ctx.sampleRate * 0.02);
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    noise.buffer = buffer;
    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 2200;
    noise.connect(hp);
    hp.connect(this.env(ctx, out, time, 0.32 * strong, 0.025));
    noise.start(time);
    noise.stop(time + 0.03);
  }

  private bell(ctx: any, out: any, time: number, strong: number) {
    for (const [freq, peak] of [
      [880, 0.32],
      [1320, 0.18],
      [1760, 0.12],
    ] as const) {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = freq;
      osc.connect(this.env(ctx, out, time, peak * strong, 0.22));
      osc.start(time);
      osc.stop(time + 0.24);
    }
  }

  private shaker(ctx: any, out: any, time: number, strong: number) {
    const noise = ctx.createBufferSource();
    const len = Math.floor(ctx.sampleRate * 0.05);
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) {
      const gate = Math.random() > 0.45 ? 1 : 0.15;
      data[i] = (Math.random() * 2 - 1) * gate;
    }
    noise.buffer = buffer;
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 5400;
    bp.Q.value = 0.8;
    noise.connect(bp);
    bp.connect(this.env(ctx, out, time, 0.5 * strong, 0.05));
    noise.start(time);
    noise.stop(time + 0.06);
  }

  async toneOn(hz: number) {
    await this.prepare("tone");
    if (this.playing) this.stop();
    const ctx = this.ctx as any;
    if (!ctx) return;
    if (this.tone) {
      this.tone.set(hz);
      return;
    }
    const o1 = ctx.createOscillator();
    const o2 = ctx.createOscillator();
    const mix = ctx.createGain();
    const second = ctx.createGain();
    o1.type = "sine";
    o2.type = "sine";
    o1.frequency.value = hz;
    o2.frequency.value = hz * 2;
    second.gain.value = 0.18;
    mix.gain.setValueAtTime(0.0001, ctx.currentTime);
    mix.gain.exponentialRampToValueAtTime(0.08, ctx.currentTime + 0.04);
    o1.connect(mix);
    o2.connect(second);
    second.connect(mix);
    mix.connect(ctx.destination);
    o1.start();
    o2.start();
    this.tone = {
      set: (next) => {
        const t = ctx.currentTime;
        o1.frequency.setTargetAtTime(next, t, 0.02);
        o2.frequency.setTargetAtTime(next * 2, t, 0.02);
      },
      stop: () => {
        const t = ctx.currentTime;
        mix.gain.cancelScheduledValues(t);
        mix.gain.setTargetAtTime(0.0001, t, 0.02);
        try {
          o1.stop(t + 0.08);
          o2.stop(t + 0.08);
        } catch {
          // already stopped
        }
      },
    };
  }

  stopTone() {
    this.tone?.stop();
    this.tone = null;
  }
}

let singleton: PracticeAudio | null = null;

export function practiceAudio() {
  if (!singleton) singleton = new PracticeAudio();
  return singleton;
}
