/**
 * Arrival sound — ported verbatim from the approved Variant E arrival source.
 *
 * Presentation only. Generated at runtime with the Web Audio API; there is no
 * audio file, no network call, no storage. Frequencies, gains and timings are
 * exactly as authored — the emotional arc of the build is the point.
 */

type Ctx = AudioContext;

export function createArrivalAudio(): Ctx | null {
  if (typeof window === "undefined") return null;
  const AC =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  try {
    return new AC();
  } catch {
    return null;
  }
}

export function playAmbientBuild(audioCtx: Ctx) {
  const t0 = audioCtx.currentTime;
  const master = audioCtx.createGain();
  master.gain.setValueAtTime(0.0001, t0);
  master.connect(audioCtx.destination);
  master.gain.exponentialRampToValueAtTime(0.7, t0 + 5.5);
  master.gain.setValueAtTime(0.7, t0 + 7);
  master.gain.linearRampToValueAtTime(0.12, t0 + 9.5);

  const notes = [55, 82.5, 110];
  notes.forEach((freq, i) => {
    [0, 5].forEach((detune) => {
      const osc = audioCtx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = freq;
      osc.detune.value = detune;
      const g = audioCtx.createGain();
      g.gain.setValueAtTime(0, t0);
      g.gain.linearRampToValueAtTime(0.04, t0 + 4.5 + i * 0.35);
      osc.connect(g);
      g.connect(master);
      osc.start(t0);
      osc.stop(t0 + 9.8);
    });
  });

  const shimmer = audioCtx.createOscillator();
  shimmer.type = "triangle";
  shimmer.frequency.value = 1760;
  const shimmerGain = audioCtx.createGain();
  shimmerGain.gain.setValueAtTime(0, t0);
  shimmerGain.gain.linearRampToValueAtTime(0.006, t0 + 4);
  shimmerGain.gain.linearRampToValueAtTime(0.003, t0 + 5.5);
  const filter = audioCtx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 2000;
  shimmer.connect(filter);
  filter.connect(shimmerGain);
  shimmerGain.connect(master);
  shimmer.start(t0);
  shimmer.stop(t0 + 7);

  const pulseTimes = [1.8, 3.8, 5.6];
  pulseTimes.forEach((pt) => {
    const osc = audioCtx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = 58;
    const g = audioCtx.createGain();
    g.gain.setValueAtTime(0, t0 + pt);
    g.gain.linearRampToValueAtTime(0.09, t0 + pt + 0.06);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + pt + 0.9);
    osc.connect(g);
    g.connect(master);
    osc.start(t0 + pt);
    osc.stop(t0 + pt + 1);
  });
}

export function playPairChime(audioCtx: Ctx) {
  const t0 = audioCtx.currentTime;
  const g = audioCtx.createGain();
  g.connect(audioCtx.destination);
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(0.06, t0 + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0006, t0 + 1.2);
  [880, 1108.73].forEach((freq, i) => {
    const osc = audioCtx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = freq;
    osc.detune.value = i === 0 ? -4 : 4;
    osc.connect(g);
    osc.start(t0 + i * 0.05);
    osc.stop(t0 + 1.3);
  });
}

export function playResolveChord(audioCtx: Ctx) {
  const t0 = audioCtx.currentTime;
  const master = audioCtx.createGain();
  master.gain.setValueAtTime(0, t0);
  master.connect(audioCtx.destination);
  master.gain.linearRampToValueAtTime(0.09, t0 + 0.15);
  master.gain.exponentialRampToValueAtTime(0.0008, t0 + 4.8);

  const chord = [440, 554.37, 659.25, 880];
  chord.forEach((freq, i) => {
    [0, 4, -4].forEach((detune) => {
      const osc = audioCtx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = freq;
      osc.detune.value = detune;
      const g = audioCtx.createGain();
      g.gain.setValueAtTime(0, t0);
      g.gain.linearRampToValueAtTime(0.015, t0 + 0.2 + i * 0.04);
      g.gain.exponentialRampToValueAtTime(0.0004, t0 + 4.3);
      osc.connect(g);
      g.connect(master);
      osc.start(t0);
      osc.stop(t0 + 4.5);
    });
  });
}
