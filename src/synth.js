const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

export class Synth {
  constructor(volume = 0.6) {
    this.voices = new Map(); // key -> { oscs, g, midi }
    this.listeners = new Set();
    const ctx = (this.ctx = new AudioContext());

    this.master = ctx.createGain();
    this.master.gain.value = volume * 0.5;
    this.filter = ctx.createBiquadFilter();
    this.filter.type = "lowpass";
    this.filter.frequency.value = 2500;
    this.filter.Q.value = 2;

    // generated reverb impulse
    const verb = ctx.createConvolver();
    const len = ctx.sampleRate * 2.2;
    const ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = ir.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
    }
    verb.buffer = ir;
    const wet = ctx.createGain();
    wet.gain.value = 0.28;
    const comp = ctx.createDynamicsCompressor();

    this.filter.connect(this.master);
    this.filter.connect(verb).connect(wet).connect(this.master);
    this.master.connect(comp).connect(ctx.destination);
  }

  subscribe(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  emit() {
    const active = new Map(); // midi -> side ("L" | "R" | "X")
    for (const [key, v] of this.voices) active.set(v.midi, key[0] === "L" ? "L" : key[0] === "R" ? "R" : "X");
    this.listeners.forEach((fn) => fn(active));
  }

  setVolume(v) {
    this.master.gain.setTargetAtTime(v * 0.5, this.ctx.currentTime, 0.02);
  }

  // y: 0 (top) … 1 (bottom) → higher hand = brighter
  setBrightness(y) {
    const clamped = Math.min(Math.max(y, 0), 1);
    this.filter.frequency.setTargetAtTime(300 + (1 - clamped) ** 2 * 6000, this.ctx.currentTime, 0.08);
  }

  noteOn(key, midi, vel = 0.18) {
    if (this.voices.has(key)) return;
    const { ctx } = this;
    const t = ctx.currentTime;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vel, t + 0.03);
    g.gain.linearRampToValueAtTime(vel * 0.7, t + 0.3);
    g.connect(this.filter);
    const oscs = [-7, 7, 0].map((detune, i) => {
      const o = ctx.createOscillator();
      o.type = i === 2 ? "triangle" : "sawtooth";
      o.frequency.value = mtof(i === 2 ? midi - 12 : midi);
      o.detune.value = detune;
      const og = ctx.createGain();
      og.gain.value = i === 2 ? 0.5 : 0.35;
      o.connect(og).connect(g);
      o.start(t);
      return o;
    });
    this.voices.set(key, { oscs, g, midi });
    this.emit();
  }

  noteOff(key) {
    const v = this.voices.get(key);
    if (!v) return;
    const t = this.ctx.currentTime;
    v.g.gain.cancelScheduledValues(t);
    v.g.gain.setValueAtTime(v.g.gain.value, t);
    v.g.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
    v.oscs.forEach((o) => o.stop(t + 0.65));
    this.voices.delete(key);
    this.emit();
  }

  close() {
    this.ctx.close();
  }
}
