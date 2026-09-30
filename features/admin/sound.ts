"use client";

/**
 * Suara notifikasi pesanan baru, disintesis dengan Web Audio (tanpa file audio).
 * Browser hanya mengizinkan audio setelah interaksi pengguna, jadi AudioContext
 * dibuka pada klik/ketukan pertama di panel admin (`primeAudio`).
 */
let ctx: AudioContext | null = null;

function context(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  ctx ??= new Ctor();
  return ctx;
}

export function primeAudio() {
  const c = context();
  if (c?.state === "suspended") void c.resume();
}

export function audioReady(): boolean {
  return ctx?.state === "running";
}

/** Dua nada "ding-dong" hangat, ±0,9 detik. */
export function playNewOrderChime(volume = 0.25) {
  const c = context();
  if (!c || c.state !== "running") return false;
  const now = c.currentTime;
  const notes: [number, number][] = [
    [880, 0], // A5
    [1318.5, 0.16], // E6
    [1760, 0.32], // A6
  ];
  for (const [freq, offset] of notes) {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, now + offset);
    gain.gain.exponentialRampToValueAtTime(volume, now + offset + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.55);
    osc.connect(gain).connect(c.destination);
    osc.start(now + offset);
    osc.stop(now + offset + 0.6);
  }
  return true;
}
