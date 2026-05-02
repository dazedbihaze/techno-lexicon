import { useState, useEffect, useRef } from "react";

// ── Responsive hook ─────────────────────────────────────────
function useIsMobile() {
  const [mobile, setMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 768);
  useEffect(() => {
    const handler = () => setMobile(window.innerWidth < 768);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  return mobile;
}

// ═══════════════════════════════════════════════════════════════
// SYNTH PRIMITIVES — Web Audio API building blocks
// ═══════════════════════════════════════════════════════════════

function distCurve(amt = 200) {
  const n = 256, c = new Float32Array(n);
  for (let i = 0; i < n; i++) { const x = (i * 2) / n - 1; c[i] = ((Math.PI + amt) * x) / (Math.PI + amt * Math.abs(x)); }
  return c;
}

function sKick(ctx, out, t, { freq = 55, decay = 0.45, gain = 0.9, pitchMult = 3.5, hard = false } = {}) {
  const osc = ctx.createOscillator(), g = ctx.createGain();
  osc.frequency.setValueAtTime(freq * pitchMult, t);
  osc.frequency.exponentialRampToValueAtTime(freq, t + 0.07);
  g.gain.setValueAtTime(gain, t + 0.001);
  g.gain.exponentialRampToValueAtTime(0.001, t + decay);
  if (hard) { const ws = ctx.createWaveShaper(); ws.curve = distCurve(280); osc.connect(ws); ws.connect(g); }
  else osc.connect(g);
  g.connect(out); osc.start(t); osc.stop(t + decay + 0.1);
}

function sHat(ctx, out, t, { open = false, gain = 0.22, tone = 7500 } = {}) {
  const sz = Math.floor(ctx.sampleRate * 0.3), buf = ctx.createBuffer(1, sz, ctx.sampleRate);
  const d = buf.getChannelData(0); for (let i = 0; i < sz; i++) d[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource(); src.buffer = buf;
  const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = tone;
  const g = ctx.createGain(); const dec = open ? 0.18 : 0.038;
  g.gain.setValueAtTime(gain, t + 0.001); g.gain.exponentialRampToValueAtTime(0.001, t + dec);
  src.connect(hp); hp.connect(g); g.connect(out); src.start(t); src.stop(t + dec + 0.05);
}

function sBass(ctx, out, t, { freq = 55, type = 'sawtooth', filt = 600, q = 8, decay = 0.18, gain = 0.45 } = {}) {
  const osc = ctx.createOscillator(); osc.type = type; osc.frequency.value = freq;
  const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.Q.value = q;
  f.frequency.setValueAtTime(filt * 3, t); f.frequency.exponentialRampToValueAtTime(filt, t + decay * 0.6);
  const g = ctx.createGain(); g.gain.setValueAtTime(gain, t + 0.001); g.gain.exponentialRampToValueAtTime(0.001, t + decay);
  osc.connect(f); f.connect(g); g.connect(out); osc.start(t); osc.stop(t + decay + 0.05);
}

function sAcid(ctx, out, t, { freq = 55, filt = 400, q = 20, decay = 0.16, gain = 0.48 } = {}) {
  const osc = ctx.createOscillator(); osc.type = 'sawtooth'; osc.frequency.value = freq;
  const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.Q.value = q;
  f.frequency.setValueAtTime(filt * 6, t); f.frequency.exponentialRampToValueAtTime(filt, t + decay * 0.8);
  const g = ctx.createGain(); g.gain.setValueAtTime(gain, t + 0.001); g.gain.exponentialRampToValueAtTime(0.001, t + decay);
  osc.connect(f); f.connect(g); g.connect(out); osc.start(t); osc.stop(t + decay + 0.05);
}

function sPad(ctx, out, t, { freq = 55, dur = 2, gain = 0.1 } = {}) {
  [1, 1.498, 1.998, 2.503].forEach((r, i) => {
    const osc = ctx.createOscillator(); osc.type = 'sine'; osc.frequency.value = freq * r + i * 0.4;
    const g = ctx.createGain(); g.gain.setValueAtTime(0.001, t); g.gain.linearRampToValueAtTime(gain * (1 - i * 0.2), t + 0.5);
    g.gain.linearRampToValueAtTime(0.001, t + dur); osc.connect(g); g.connect(out); osc.start(t); osc.stop(t + dur + 0.1);
  });
}

function sMetal(ctx, out, t, { gain = 0.2, decay = 0.1 } = {}) {
  [323, 482, 718, 952, 1337].forEach(f => {
    const osc = ctx.createOscillator(); osc.type = 'square'; osc.frequency.value = f;
    const g = ctx.createGain(); g.gain.setValueAtTime(gain / 5, t + 0.001); g.gain.exponentialRampToValueAtTime(0.001, t + decay);
    osc.connect(g); g.connect(out); osc.start(t); osc.stop(t + decay + 0.05);
  });
}

// Snare — white noise burst with tone body
function sSnare(ctx, out, t, { gain = 0.38, ghost = false } = {}) {
  const actualGain = ghost ? gain * 0.11 : gain;
  const sz = Math.floor(ctx.sampleRate * 0.14);
  const buf = ctx.createBuffer(1, sz, ctx.sampleRate);
  const d = buf.getChannelData(0); for (let i = 0; i < sz; i++) d[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource(); src.buffer = buf;
  const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1800; bp.Q.value = 0.7;
  const g = ctx.createGain(); g.gain.setValueAtTime(actualGain, t + 0.001); g.gain.exponentialRampToValueAtTime(0.001, t + 0.11);
  src.connect(bp); bp.connect(g); g.connect(out); src.start(t); src.stop(t + 0.13);
  // Body tone
  const tone = ctx.createOscillator(); tone.frequency.value = 185;
  const tg = ctx.createGain(); tg.gain.setValueAtTime(actualGain * 0.25, t + 0.001); tg.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
  tone.connect(tg); tg.connect(out); tone.start(t); tone.stop(t + 0.07);
}

// Click / woodblock — for counting beats clearly
function sClick(ctx, out, t, { gain = 0.25, accent = false } = {}) {
  const osc = ctx.createOscillator(); osc.type = 'sine';
  osc.frequency.value = accent ? 900 : 600;
  const g = ctx.createGain(); g.gain.setValueAtTime(accent ? gain * 1.6 : gain, t + 0.001); g.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
  osc.connect(g); g.connect(out); osc.start(t); osc.stop(t + 0.05);
}

// ═══════════════════════════════════════════════════════════════
// NOTE FREQUENCIES
// ═══════════════════════════════════════════════════════════════
const N = { A1:55, B1:61.7, C2:65.4, D2:73.4, E2:82.4, F2:87.3, G2:98, A2:110, B2:123.5, C3:130.8, D3:146.8, E3:164.8, G3:196, A3:220, C4:261.6, E4:329.6 };

// ═══════════════════════════════════════════════════════════════
// GENRE AUDIO PATTERNS — 16 steps = 1 bar (4 beats x 4 subdivisions)
// ═══════════════════════════════════════════════════════════════
const GENRE_AUDIO = {
  'Detroit Techno': {
    bpm: 132, color: '#00e5ff', emoji: '🔩', label: '132 BPM · Soulful & deep',
    playStep: (s, ctx, t, out) => {
      if (s % 4 === 0) sKick(ctx, out, t, { freq: 50, decay: 0.55 });
      if (s % 4 === 2) sHat(ctx, out, t, { gain: 0.12 });
      if (s === 15) sHat(ctx, out, t, { open: true, gain: 0.1 });
      if (s === 0) sPad(ctx, out, t, { freq: N.A1, dur: 2.0, gain: 0.09 });
      if (s === 0 || s === 10) sBass(ctx, out, t, { freq: N.A1, filt: 280, q: 4, decay: 0.4, gain: 0.28 });
    }
  },
  'Minimal Techno': {
    bpm: 130, color: '#80deea', emoji: '▪️', label: '130 BPM · Hypnotic & stripped',
    playStep: (s, ctx, t, out) => {
      if (s === 0 || s === 8) sKick(ctx, out, t, { freq: 52, decay: 0.4, gain: 0.6 });
      if (s === 6 || s === 14) sHat(ctx, out, t, { gain: 0.09 });
      if (s === 3 || s === 11) sHat(ctx, out, t, { open: true, gain: 0.07 });
      if (s === 0) sBass(ctx, out, t, { freq: N.A1, filt: 240, q: 5, decay: 1.9, gain: 0.14 });
    }
  },
  'Hard Techno': {
    bpm: 148, color: '#ff6d00', emoji: '⚡', label: '148 BPM · Aggressive & rolling',
    playStep: (s, ctx, t, out) => {
      if (s % 4 === 0) sKick(ctx, out, t, { freq: 55, decay: 0.32, hard: true, gain: 0.95 });
      if (s === 2 || s === 3 || s === 11) sKick(ctx, out, t, { freq: 52, decay: 0.12, hard: true, gain: 0.35 });
      sHat(ctx, out, t, { gain: 0.1 + (s % 2) * 0.06 });
      if (s % 8 === 0) sBass(ctx, out, t, { freq: N.A2, filt: 900, q: 14, decay: 0.09, gain: 0.38, type: 'square' });
    }
  },
  'Industrial Techno': {
    bpm: 140, color: '#90a4ae', emoji: '🏭', label: '140 BPM · Metallic & brutal',
    playStep: (s, ctx, t, out) => {
      if (s % 4 === 0) sKick(ctx, out, t, { freq: 46, decay: 0.42, hard: true, gain: 0.95, pitchMult: 4.5 });
      if (s === 2 || s === 10) sMetal(ctx, out, t, { gain: 0.22, decay: 0.15 });
      if (s === 4 || s === 12) sMetal(ctx, out, t, { gain: 0.14, decay: 0.07 });
      if (s % 4 === 3) sHat(ctx, out, t, { gain: 0.18, tone: 9500 });
      if (s === 0) sPad(ctx, out, t, { freq: N.A1, dur: 1.8, gain: 0.05 });
    }
  },
  'Acid Techno': {
    bpm: 138, color: '#ffe082', emoji: '🎸', label: '138 BPM · Squelchy 303 acid',
    playStep: (s, ctx, t, out) => {
      if (s % 4 === 0) sKick(ctx, out, t, { freq: 50, decay: 0.42 });
      if (s % 4 === 2) sHat(ctx, out, t, { gain: 0.16 });
      const AP = [
        { f: N.A1, filt: 300, q: 22 }, null, { f: N.E2, filt: 520, q: 26 }, null,
        { f: N.A1, filt: 280, q: 20 }, { f: N.D2, filt: 460, q: 24 }, null, { f: N.A1, filt: 340, q: 22 },
        { f: N.C2, filt: 510, q: 28 }, null, { f: N.A1, filt: 260, q: 18 }, null,
        { f: N.A1, filt: 300, q: 22 }, null, { f: N.G2, filt: 640, q: 30 }, { f: N.A1, filt: 200, q: 16 },
      ];
      if (AP[s]) sAcid(ctx, out, t, { freq: AP[s].f, filt: AP[s].filt, q: AP[s].q });
    }
  },
  'Dub Techno': {
    bpm: 124, color: '#4dd0e1', emoji: '🌊', label: '124 BPM · Deep oceanic dub',
    playStep: (s, ctx, t, out) => {
      if (s === 0 || s === 8) sKick(ctx, out, t, { freq: 44, decay: 0.65, gain: 0.7 });
      if (s === 6 || s === 14) sHat(ctx, out, t, { open: true, gain: 0.09 });
      if (s === 0) { sPad(ctx, out, t, { freq: N.A1, dur: 3.8, gain: 0.13 }); sBass(ctx, out, t, { freq: N.A1, filt: 160, q: 6, decay: 2.8, gain: 0.42 }); }
    }
  },
  'Psytrance': {
    bpm: 143, color: '#ce93d8', emoji: '🌀', label: '143 BPM · Rolling festival energy',
    playStep: (s, ctx, t, out) => {
      if (s % 4 === 0) sKick(ctx, out, t, { freq: 52, decay: 0.38, gain: 0.88 });
      if (s % 4 === 2) sHat(ctx, out, t, { gain: 0.14 });
      const PF = [N.A1,N.A1,N.E2,N.A1, N.A1,N.D2,N.E2,N.A1, N.A1,N.A1,N.E2,N.D2, N.G2,N.D2,N.E2,N.A1];
      const PL = [300,200,520,260, 280,420,510,290, 320,220,490,380, 600,430,520,300];
      sBass(ctx, out, t, { freq: PF[s], filt: PL[s], q: 10, decay: 0.17, gain: 0.52 });
    }
  },
  'Goa Trance': {
    bpm: 138, color: '#f48fb1', emoji: '🏝️', label: '138 BPM · Melodic & euphoric',
    playStep: (s, ctx, t, out) => {
      if (s % 4 === 0) sKick(ctx, out, t, { freq: 52, decay: 0.4 });
      if (s % 4 === 2) sHat(ctx, out, t, { gain: 0.12 });
      const GN = [N.A1,null,N.C2,null,N.E2,null,N.A2,null,N.G2,null,N.E2,null,N.C2,null,N.A1,null];
      if (GN[s]) sBass(ctx, out, t, { freq: GN[s], filt: 720, q: 6, decay: 0.22, gain: 0.45, type: 'sine' });
      if (s === 0) sPad(ctx, out, t, { freq: N.A2, dur: 2.0, gain: 0.08 });
    }
  },
  'Full-On Psy': {
    bpm: 145, color: '#aed581', emoji: '🌞', label: '145 BPM · Peak-hour intensity',
    playStep: (s, ctx, t, out) => {
      if (s % 4 === 0) sKick(ctx, out, t, { freq: 52, decay: 0.36, gain: 0.9 });
      if (s % 4 === 2) sHat(ctx, out, t, { gain: 0.17 });
      if (s % 4 === 1 || s % 4 === 3) sHat(ctx, out, t, { gain: 0.07 });
      const FF = [N.A1,N.A1,N.E2,N.A1, N.D2,N.A1,N.E2,N.A1, N.A1,N.C2,N.E2,N.A1, N.E2,N.D2,N.E2,N.A2];
      sBass(ctx, out, t, { freq: FF[s], filt: 480 + s * 22, q: 9, decay: 0.19, gain: 0.52 });
    }
  },
  'Dark Psy': {
    bpm: 152, color: '#ef9a9a', emoji: '🌑', label: '152 BPM · Sinister & nocturnal',
    playStep: (s, ctx, t, out) => {
      if (s % 4 === 0) sKick(ctx, out, t, { freq: 44, decay: 0.33, hard: true, gain: 0.95 });
      if (s % 4 === 2) sHat(ctx, out, t, { gain: 0.11, tone: 9500 });
      const DF = [N.A1,N.A1,N.A1,N.A1, N.B1,N.A1,N.A1,N.A1, N.A1,N.A1,N.A1,N.B1, N.C2,N.A1,N.B1,N.A1];
      sBass(ctx, out, t, { freq: DF[s], filt: 200 + s * 7, q: 16, decay: 0.17, gain: 0.58 });
      if (s === 0) sPad(ctx, out, t, { freq: N.A1, dur: 1.7, gain: 0.05 });
    }
  },
  'Forest Psy': {
    bpm: 150, color: '#a5d6a7', emoji: '🌲', label: '150 BPM · Organic & earthy',
    playStep: (s, ctx, t, out) => {
      if (s % 4 === 0) sKick(ctx, out, t, { freq: 48, decay: 0.36 });
      if (s % 4 === 2) sHat(ctx, out, t, { gain: 0.1 });
      if (s % 8 === 4) sMetal(ctx, out, t, { gain: 0.07, decay: 0.06 });
      const ForF = [N.A1,null,N.A1,N.B1, N.C2,null,N.A1,null, N.A1,N.B1,N.A1,null, N.C2,null,N.B1,null];
      if (ForF[s]) sBass(ctx, out, t, { freq: ForF[s], filt: 270, q: 9, decay: 0.22, gain: 0.46 });
    }
  },
  'Hi-Tech / Nitzhonot': {
    bpm: 175, color: '#ff5252', emoji: '🚀', label: '175 BPM · Extreme & manic',
    playStep: (s, ctx, t, out) => {
      if (s % 4 === 0) sKick(ctx, out, t, { freq: 55, decay: 0.26, gain: 0.9 });
      if (s % 2 === 1) sHat(ctx, out, t, { gain: 0.18 });
      if (s % 4 === 2) sHat(ctx, out, t, { open: true, gain: 0.11 });
      const HF = [N.A1,N.A2,N.E2,N.A2, N.A1,N.A2,N.D2,N.A2, N.A1,N.A2,N.E2,N.A2, N.G2,N.A2,N.E2,N.A2];
      sBass(ctx, out, t, { freq: HF[s], filt: 700, q: 13, decay: 0.13, gain: 0.52 });
    }
  },
  'Progressive Psy': {
    bpm: 138, color: '#90caf9', emoji: '🌅', label: '138 BPM · Smooth sunrise journey',
    playStep: (s, ctx, t, out) => {
      if (s % 4 === 0) sKick(ctx, out, t, { freq: 50, decay: 0.44, gain: 0.8 });
      if (s % 4 === 2) sHat(ctx, out, t, { gain: 0.1 });
      if (s % 8 === 6) sHat(ctx, out, t, { open: true, gain: 0.08 });
      const ProF = [N.A1,null,N.A1,null, N.E2,null,N.A1,null, N.A1,null,N.C2,null, N.E2,null,N.D2,null];
      if (ProF[s]) sBass(ctx, out, t, { freq: ProF[s], filt: 400, q: 6, decay: 0.26, gain: 0.4, type: 'sine' });
      if (s === 0) sPad(ctx, out, t, { freq: N.A2, dur: 1.9, gain: 0.08 });
    }
  },

  // ── NEW TECHNO GENRES ──
  'Schranz': {
    bpm: 142, color: '#b0bec5', emoji: '⚙️', label: '142 BPM · Grinding machine-gun loops',
    playStep: (s, ctx, t, out) => {
      // Relentless kick every beat, machine-gun hi-hats on every step, metal hits
      if (s % 4 === 0) sKick(ctx, out, t, { freq: 52, decay: 0.28, hard: true, gain: 0.92 });
      if (s % 4 === 2) sKick(ctx, out, t, { freq: 50, decay: 0.12, hard: true, gain: 0.38 });
      sHat(ctx, out, t, { gain: 0.08 + (s % 3 === 0 ? 0.08 : 0), tone: 9000 });
      if (s % 8 === 4 || s % 8 === 7) sMetal(ctx, out, t, { gain: 0.18, decay: 0.06 });
    }
  },
  'Melodic Techno': {
    bpm: 128, color: '#ce93d8', emoji: '🌙', label: '128 BPM · Emotional arpeggios & lush pads',
    playStep: (s, ctx, t, out) => {
      if (s % 4 === 0) sKick(ctx, out, t, { freq: 50, decay: 0.5, gain: 0.65 });
      if (s % 4 === 2) sHat(ctx, out, t, { gain: 0.08, open: true });
      if (s === 0) sPad(ctx, out, t, { freq: N.A2, dur: 3.8, gain: 0.12 });
      if (s === 8) sPad(ctx, out, t, { freq: N.E3, dur: 3.8, gain: 0.09 });
      // Melodic arpeggio lead
      const mel = [null,N.A3,null,N.C4, null,N.E4,null,N.C4, null,N.A3,null,N.E3, N.G3,null,null,null];
      if (mel[s]) sBass(ctx, out, t, { freq: mel[s], filt: 5000, q: 2, decay: 0.22, gain: 0.28, type: 'sawtooth' });
    }
  },
  'Peak Time Techno': {
    bpm: 144, color: '#ffca28', emoji: '🏟️', label: '144 BPM · Festival main stage energy',
    playStep: (s, ctx, t, out) => {
      if (s % 4 === 0) sKick(ctx, out, t, { freq: 53, decay: 0.34, gain: 0.95 });
      if (s === 2 || s === 14) sKick(ctx, out, t, { freq: 50, decay: 0.12, gain: 0.45 });
      if (s % 4 === 2) sHat(ctx, out, t, { gain: 0.15 });
      if (s % 2 === 1) sHat(ctx, out, t, { gain: 0.08 });
      // Driving synth stab
      if (s % 8 === 0) sBass(ctx, out, t, { freq: N.A2, filt: 1800, q: 12, decay: 0.09, gain: 0.42, type: 'square' });
      if (s % 8 === 4) sBass(ctx, out, t, { freq: N.E2, filt: 1600, q: 10, decay: 0.09, gain: 0.36, type: 'square' });
    }
  },
  'Ambient Techno': {
    bpm: 118, color: '#80cbc4', emoji: '🌌', label: '118 BPM · Dreamy, floating atmospheres',
    playStep: (s, ctx, t, out) => {
      // Very sparse rhythm, mostly atmosphere
      if (s === 0) sKick(ctx, out, t, { freq: 46, decay: 0.7, gain: 0.45 });
      if (s === 8) sKick(ctx, out, t, { freq: 44, decay: 0.6, gain: 0.3 });
      if (s === 6 || s === 14) sHat(ctx, out, t, { open: true, gain: 0.06 });
      if (s === 0) { sPad(ctx, out, t, { freq: N.A1, dur: 4.0, gain: 0.14 }); sPad(ctx, out, t, { freq: N.E3, dur: 4.0, gain: 0.09 }); }
    }
  },
  'Bleep Techno': {
    bpm: 130, color: '#80d8ff', emoji: '📟', label: '130 BPM · High bleeps & heavy UK sub-bass',
    playStep: (s, ctx, t, out) => {
      if (s % 4 === 0) sKick(ctx, out, t, { freq: 44, decay: 0.55, gain: 0.88, pitchMult: 2.2 });
      if (s === 4 || s === 12) sHat(ctx, out, t, { open: false, gain: 0.3, tone: 1800 });
      if (s % 2 === 1) sHat(ctx, out, t, { gain: 0.1 });
      // Bleep — high pitched short synth stab
      const bleepSteps = [2, 5, 10, 13];
      if (bleepSteps.includes(s)) {
        const osc = ctx.createOscillator(); osc.type = 'square'; osc.frequency.value = 880 + (s * 44);
        const g = ctx.createGain(); g.gain.setValueAtTime(0.22, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
        osc.connect(g); g.connect(out); osc.start(t); osc.stop(t + 0.14);
      }
      // Deep sub bass
      if (s % 8 === 0) sBass(ctx, out, t, { freq: N.A1, filt: 120, q: 3, decay: 1.6, gain: 0.55 });
    }
  },
  'Gabber': {
    bpm: 185, color: '#ff1744', emoji: '💥', label: '185 BPM · Distorted Dutch hardcore kicks',
    playStep: (s, ctx, t, out) => {
      // Distorted kick on every beat, nothing else matters
      if (s % 4 === 0) sKick(ctx, out, t, { freq: 58, decay: 0.22, hard: true, gain: 1.0, pitchMult: 5 });
      if (s % 4 === 2) sKick(ctx, out, t, { freq: 55, decay: 0.08, hard: true, gain: 0.55 });
      if (s % 4 === 1 || s % 4 === 3) sHat(ctx, out, t, { gain: 0.12, tone: 10000 });
    }
  },
  'Hypnotic Techno': {
    bpm: 132, color: '#7986cb', emoji: '🌀', label: '132 BPM · Repetitive, trance-inducing loops',
    playStep: (s, ctx, t, out) => {
      if (s % 4 === 0) sKick(ctx, out, t, { freq: 50, decay: 0.38, gain: 0.72 });
      if (s % 4 === 2) sHat(ctx, out, t, { gain: 0.09 });
      if (s === 3 || s === 11) sHat(ctx, out, t, { open: true, gain: 0.07 });
      // Very minimal, hypnotic bass note that barely changes
      if (s === 0 || s === 6 || s === 10) sBass(ctx, out, t, { freq: N.A1, filt: 220 + (s * 4), q: 8, decay: 0.35, gain: 0.38 });
    }
  },
  'Dark Techno': {
    bpm: 138, color: '#78909c', emoji: '🖤', label: '138 BPM · Sinister and haunting',
    playStep: (s, ctx, t, out) => {
      if (s % 4 === 0) sKick(ctx, out, t, { freq: 47, decay: 0.4, gain: 0.88 });
      if (s % 4 === 3) sHat(ctx, out, t, { gain: 0.1, tone: 9000 });
      if (s === 0) sPad(ctx, out, t, { freq: N.A1, dur: 1.6, gain: 0.06 });
      const DF = [N.A1,null,N.B1,null, N.A1,null,N.A1,N.B1, N.C2,null,N.A1,null, N.B1,null,N.A1,null];
      if (DF[s]) sBass(ctx, out, t, { freq: DF[s], filt: 180, q: 12, decay: 0.26, gain: 0.52 });
    }
  },
  'EBM': {
    bpm: 128, color: '#ef9a9a', emoji: '⚡', label: '128 BPM · Electronic Body Music — march of machines',
    playStep: (s, ctx, t, out) => {
      // Strong march-like 4/4 kick, synth bass stab, no frills
      if (s % 4 === 0) sKick(ctx, out, t, { freq: 54, decay: 0.32, gain: 0.88 });
      if (s === 4 || s === 12) {
        sHat(ctx, out, t, { open: false, gain: 0.28, tone: 2000 });
        sBass(ctx, out, t, { freq: 220, filt: 1000, q: 2, decay: 0.1, gain: 0.22, type: 'square' });
      }
      if (s % 4 === 2) sHat(ctx, out, t, { gain: 0.12 });
      // Driving synth bass stab
      const EF = [N.A1,null,N.A1,null, N.A1,N.A1,null,N.A1, N.A1,null,N.A1,null, N.A1,null,N.A1,N.G2];
      if (EF[s]) sBass(ctx, out, t, { freq: EF[s], filt: 800, q: 8, decay: 0.1, gain: 0.45, type: 'square' });
    }
  },
  'Freetekno': {
    bpm: 160, color: '#ffab40', emoji: '🏴', label: '160 BPM · Raw underground free party sound',
    playStep: (s, ctx, t, out) => {
      if (s % 4 === 0) sKick(ctx, out, t, { freq: 52, decay: 0.28, hard: true, gain: 0.9 });
      if (s % 4 === 2) sKick(ctx, out, t, { freq: 50, decay: 0.1, hard: true, gain: 0.3 });
      sHat(ctx, out, t, { gain: 0.09, tone: 8500 });
      if (s % 4 === 1) sMetal(ctx, out, t, { gain: 0.12, decay: 0.05 });
      if (s % 8 === 0) sBass(ctx, out, t, { freq: N.A2, filt: 650, q: 11, decay: 0.09, gain: 0.35, type: 'square' });
    }
  },

  // ── NEW PSY GENRES ──
  'Twilight Psy': {
    bpm: 147, color: '#ff7043', emoji: '🌇', label: '147 BPM · Dark Full-On — dusk & danger',
    playStep: (s, ctx, t, out) => {
      if (s % 4 === 0) sKick(ctx, out, t, { freq: 51, decay: 0.35, gain: 0.9 });
      if (s % 4 === 2) sHat(ctx, out, t, { gain: 0.13 });
      const TF = [N.A1,N.A1,N.D2,N.A1, N.B1,N.A1,N.E2,N.A1, N.A1,N.B1,N.D2,N.A1, N.C2,N.A1,N.B1,N.A1];
      const TL = [280,200,480,240, 320,220,500,260, 300,340,460,220, 520,240,380,200];
      sBass(ctx, out, t, { freq: TF[s], filt: TL[s], q: 11, decay: 0.17, gain: 0.54 });
    }
  },
  'Suomi Psy': {
    bpm: 150, color: '#69f0ae', emoji: '🇫🇮', label: '150 BPM · Finnish Sound — quirky & free-form',
    playStep: (s, ctx, t, out) => {
      if (s % 4 === 0) sKick(ctx, out, t, { freq: 50, decay: 0.36, gain: 0.85 });
      if (s % 4 === 2) sHat(ctx, out, t, { gain: 0.11 });
      // Suomi = more melodic, unusual intervals, funky feel
      const SF = [N.A1,null,N.C2,N.A1, N.D2,null,N.A1,null, N.E2,N.D2,N.A1,null, N.G2,null,N.E2,N.D2];
      if (SF[s]) sBass(ctx, out, t, { freq: SF[s], filt: 550 + s * 18, q: 7, decay: 0.18, gain: 0.5 });
      if (s === 0) sPad(ctx, out, t, { freq: N.D3, dur: 1.8, gain: 0.06 });
    }
  },
  'Zenonesque': {
    bpm: 140, color: '#b2dfdb', emoji: '🔬', label: '140 BPM · Minimal Psy — stripped & introspective',
    playStep: (s, ctx, t, out) => {
      if (s % 4 === 0) sKick(ctx, out, t, { freq: 50, decay: 0.4, gain: 0.75 });
      if (s === 6 || s === 14) sHat(ctx, out, t, { gain: 0.07 });
      // Very minimal bass — only 4 hits per bar, slow filter movement
      const ZF = [N.A1,null,null,null, N.A1,null,null,null, N.A1,null,null,N.B1, N.A1,null,null,null];
      if (ZF[s]) sBass(ctx, out, t, { freq: ZF[s], filt: 180 + s * 3, q: 14, decay: 0.35, gain: 0.46 });
    }
  },
  'Psybient': {
    bpm: 95, color: '#e1bee7', emoji: '✨', label: '95 BPM · Psychedelic Ambient — deep chill',
    playStep: (s, ctx, t, out) => {
      if (s === 0) sKick(ctx, out, t, { freq: 44, decay: 0.8, gain: 0.35 });
      if (s === 0) {
        sPad(ctx, out, t, { freq: N.A2, dur: 5.0, gain: 0.15 });
        sPad(ctx, out, t, { freq: N.E3, dur: 5.0, gain: 0.10 });
        sBass(ctx, out, t, { freq: N.A1, filt: 140, q: 4, decay: 4.5, gain: 0.35, type: 'sine' });
      }
    }
  },
  'Tribal Psy': {
    bpm: 143, color: '#ffcc80', emoji: '🥁', label: '143 BPM · Triplet basslines & ethnic energy',
    playStep: (s, ctx, t, out) => {
      if (s % 4 === 0) sKick(ctx, out, t, { freq: 52, decay: 0.37, gain: 0.88 });
      if (s % 4 === 2) sHat(ctx, out, t, { gain: 0.12 });
      // Tribal = triplet-feel bass: hits on 0, 5, 10 in the 16-step bar (approximates triplets)
      const tribalHits = [0, 5, 8, 10, 13];
      const tribalNotes = [N.A1, N.E2, N.A1, N.D2, N.A1];
      if (tribalHits.includes(s)) {
        const idx = tribalHits.indexOf(s);
        sBass(ctx, out, t, { freq: tribalNotes[idx], filt: 400, q: 9, decay: 0.2, gain: 0.52 });
      }
      if (s % 4 === 1) sMetal(ctx, out, t, { gain: 0.09, decay: 0.05 });
    }
  },
  'Psycore': {
    bpm: 172, color: '#e040fb', emoji: '🔥', label: '172 BPM · Psy meets hardcore — extreme',
    playStep: (s, ctx, t, out) => {
      if (s % 4 === 0) sKick(ctx, out, t, { freq: 54, decay: 0.22, hard: true, gain: 0.98 });
      if (s % 4 === 2) sKick(ctx, out, t, { freq: 52, decay: 0.08, hard: true, gain: 0.4 });
      if (s % 2 === 1) sHat(ctx, out, t, { gain: 0.14 });
      const PcF = [N.A1,N.A1,N.B1,N.A1, N.A1,N.B1,N.E2,N.A1, N.A1,N.A1,N.B1,N.C2, N.B1,N.A1,N.E2,N.A1];
      sBass(ctx, out, t, { freq: PcF[s], filt: 280 + s * 8, q: 16, decay: 0.14, gain: 0.58 });
    }
  },
  'Neogoa': {
    bpm: 143, color: '#ffd54f', emoji: '🏺', label: '143 BPM · Modern Goa revival — spiraling melodies',
    playStep: (s, ctx, t, out) => {
      if (s % 4 === 0) sKick(ctx, out, t, { freq: 52, decay: 0.4, gain: 0.86 });
      if (s % 4 === 2) sHat(ctx, out, t, { gain: 0.11 });
      // Neogoa: ascending/descending melodic arpeggios like classic Goa but heavier
      const NG = [N.A1,null,N.C2,null, N.E2,null,N.A2,null, N.G2,null,N.E2,null, N.C2,null,N.A1,null];
      if (NG[s]) sBass(ctx, out, t, { freq: NG[s], filt: 900, q: 6, decay: 0.2, gain: 0.48, type: 'sawtooth' });
      if (s === 0) sPad(ctx, out, t, { freq: N.A2, dur: 2.0, gain: 0.07 });
    }
  },
  'Psychedelic Techno': {
    bpm: 138, color: '#f06292', emoji: '🔀', label: '138 BPM · PsyTech — where psy meets techno',
    playStep: (s, ctx, t, out) => {
      // Techno kick pattern + psy bassline
      if (s % 4 === 0) sKick(ctx, out, t, { freq: 51, decay: 0.36, gain: 0.88 });
      if (s % 4 === 2) sHat(ctx, out, t, { gain: 0.12 });
      if (s === 3 || s === 11) sMetal(ctx, out, t, { gain: 0.08, decay: 0.06 });
      const PTF = [N.A1,N.A1,N.E2,N.A1, N.A1,N.D2,N.A1,N.E2, N.A1,N.A1,N.C2,N.A1, N.E2,N.A1,N.D2,N.A1];
      sBass(ctx, out, t, { freq: PTF[s], filt: 320 + s * 14, q: 11, decay: 0.16, gain: 0.5 });
    }
  },
  'Hard Groove': {
    bpm: 136, color: '#a1887f', emoji: '🕺', label: '136 BPM · Percussive swing — techno that hits the hips',
    playStep: (s, ctx, t, out) => {
      // Hardgroove = heavy swing, dense polyrhythmic percussion, funky groove feel
      if (s % 4 === 0) sKick(ctx, out, t, { freq: 52, decay: 0.36, gain: 0.88 });
      // Swing: main hats on every step, but accented on the "swung" 16ths (odd positions)
      sHat(ctx, out, t, { gain: s % 2 === 1 ? 0.14 : 0.07, tone: 8000 });
      // Shuffle accent on the & of 2 and & of 4
      if (s === 5 || s === 7 || s === 13 || s === 15) sHat(ctx, out, t, { open: true, gain: 0.11 });
      // Layered metallic percussion (tribal/congas feel)
      if (s === 2 || s === 6 || s === 9 || s === 14) sMetal(ctx, out, t, { gain: 0.13, decay: 0.09 });
      // Minimal bass — groove is the point, not the bassline
      if (s === 0 || s === 9) sBass(ctx, out, t, { freq: N.A1, filt: 300, q: 7, decay: 0.3, gain: 0.42 });
    }
  },
  'Hard Bounce': {
    bpm: 155, color: '#ff8a65', emoji: '⬆️', label: '155 BPM · Bouncy, punchy, fast European rave',
    playStep: (s, ctx, t, out) => {
      // Hard Bounce = fast, stomping 4/4 kick with a "bounce" double-hit, punchy stabs
      if (s % 4 === 0) sKick(ctx, out, t, { freq: 54, decay: 0.25, hard: true, gain: 0.95 });
      // The "bounce" — quick follow-up kick gives the bouncy character
      if (s % 4 === 1) sKick(ctx, out, t, { freq: 50, decay: 0.1, hard: true, gain: 0.28 });
      if (s % 4 === 2) sHat(ctx, out, t, { gain: 0.16 });
      if (s % 2 === 1 && s % 4 !== 1) sHat(ctx, out, t, { gain: 0.09 });
      // Punchy synth stab on offbeats
      if (s % 8 === 2 || s % 8 === 6) sBass(ctx, out, t, { freq: N.A2, filt: 1400, q: 14, decay: 0.07, gain: 0.4, type: 'square' });
      if (s % 8 === 0) sBass(ctx, out, t, { freq: N.A1, filt: 500, q: 9, decay: 0.12, gain: 0.38 });
    }
  },
  'Progressive Techno': {
    bpm: 134, color: '#80cbc4', emoji: '📈', label: '134 BPM · Structured builds, evolving layers',
    playStep: (s, ctx, t, out) => {
      // Progressive Techno = clear structure, evolving arrangement, accessible but underground
      if (s % 4 === 0) sKick(ctx, out, t, { freq: 51, decay: 0.42, gain: 0.82 });
      if (s % 4 === 2) sHat(ctx, out, t, { gain: 0.1 });
      if (s % 8 === 6) sHat(ctx, out, t, { open: true, gain: 0.09 });
      // Evolving bassline — gradual filter opening over the bar mimics progressive builds
      const PrF = [N.A1,null,N.A1,null, N.C2,null,N.A1,null, N.E2,null,N.A1,null, N.C2,N.A1,N.E2,null];
      if (PrF[s]) sBass(ctx, out, t, { freq: PrF[s], filt: 280 + s * 25, q: 6, decay: 0.28, gain: 0.44 });
      if (s === 0) sPad(ctx, out, t, { freq: N.A2, dur: 2.5, gain: 0.07 });
    }
  },
};

// ═══════════════════════════════════════════════════════════════
// TERM AUDIO DEMOS — one per Sound Design concept
// ═══════════════════════════════════════════════════════════════
const TERM_AUDIO = {
  'Bassline': {
    bpm: 128, color: '#4ecdc4', emoji: '🔊', label: '128 BPM · Hear a rolling bass groove',
    playStep: (s, ctx, t, out) => {
      if (s % 4 === 0) sKick(ctx, out, t, { freq: 50, decay: 0.38, gain: 0.5 });
      if (s % 4 === 2) sHat(ctx, out, t, { gain: 0.1 });
      const BF = [N.A1,null,N.E2,null, N.D2,null,N.A1,N.A1, N.A1,null,N.C2,null, N.E2,N.D2,null,N.A1];
      if (BF[s]) sBass(ctx, out, t, { freq: BF[s], filt: 450, q: 6, decay: 0.24, gain: 0.58 });
    }
  },
  'Acid Line': {
    bpm: 130, color: '#ffe082', emoji: '〰️', label: '130 BPM · Classic TB-303 squelch',
    playStep: (s, ctx, t, out) => {
      if (s % 4 === 0) sKick(ctx, out, t, { freq: 50, decay: 0.4, gain: 0.45 });
      const AP = [
        {f:N.A1,filt:260,q:22},{f:N.A1,filt:180,q:18},{f:N.E2,filt:520,q:26},null,
        {f:N.A1,filt:280,q:20},{f:N.D2,filt:460,q:24},null,{f:N.A1,filt:340,q:22},
        {f:N.C2,filt:510,q:28},null,{f:N.A1,filt:260,q:18},{f:N.E2,filt:380,q:24},
        {f:N.A1,filt:300,q:22},null,{f:N.G2,filt:640,q:30},{f:N.A1,filt:180,q:16},
      ];
      if (AP[s]) sAcid(ctx, out, t, { freq: AP[s].f, filt: AP[s].filt, q: AP[s].q });
    }
  },
  '808': {
    bpm: 90, color: '#ff6b6b', emoji: '🥁', label: '90 BPM · Boomy 808 drum machine',
    playStep: (s, ctx, t, out) => {
      // 808 = deep, long-decay boom kick — feels slow and heavy
      if (s === 0 || s === 6 || s === 10) sKick(ctx, out, t, { freq: 44, decay: 0.9, gain: 0.9, pitchMult: 2.8 });
      // Snare on beats 2 and 4 (steps 4, 12)
      if (s === 4 || s === 12) {
        sHat(ctx, out, t, { open: false, gain: 0.38, tone: 1400 });
        sBass(ctx, out, t, { freq: 200, filt: 700, q: 2, decay: 0.14, gain: 0.28, type: 'square' });
      }
      if (s % 2 === 1) sHat(ctx, out, t, { gain: 0.1, tone: 8000 });
    }
  },
  '909': {
    bpm: 132, color: '#ff9800', emoji: '🥁', label: '132 BPM · Punchy 909 techno drums',
    playStep: (s, ctx, t, out) => {
      // 909 = tighter, punchier kick — the sound of techno
      if (s % 4 === 0) sKick(ctx, out, t, { freq: 56, decay: 0.28, gain: 0.92, pitchMult: 4.5 });
      // Clap on 2 and 4
      if (s === 4 || s === 12) {
        sHat(ctx, out, t, { open: false, gain: 0.42, tone: 2200 });
        sBass(ctx, out, t, { freq: 240, filt: 1400, q: 1, decay: 0.08, gain: 0.2, type: 'square' });
      }
      if (s % 4 === 2) sHat(ctx, out, t, { open: false, gain: 0.16 });
      if (s % 2 === 1 && s % 4 !== 1) sHat(ctx, out, t, { gain: 0.14, tone: 8500 });
    }
  },
  'Synth': {
    bpm: 120, color: '#ce93d8', emoji: '🎹', label: '120 BPM · A sawtooth synth melody',
    playStep: (s, ctx, t, out) => {
      if (s % 4 === 0) sKick(ctx, out, t, { freq: 50, decay: 0.35, gain: 0.4 });
      if (s % 4 === 2) sHat(ctx, out, t, { gain: 0.09 });
      const mel = [N.A3,null,null,null, N.C4,null,N.E4,null, N.A3,null,N.G3,null, N.E3,null,null,null];
      if (mel[s]) sBass(ctx, out, t, { freq: mel[s], filt: 3500, q: 3, decay: 0.28, gain: 0.32, type: 'sawtooth' });
    }
  },
  'Oscillator': {
    bpm: 52, color: '#80deea', emoji: '📊', label: '52 BPM · Sine → Saw → Square → Triangle',
    playStep: (s, ctx, t, out) => {
      // Each group of 4 steps = one waveform type — hear the difference
      const waveforms = ['sine','sawtooth','square','triangle'];
      const wave = waveforms[Math.floor(s / 4)];
      if (s % 4 === 0) {
        const osc = ctx.createOscillator(); osc.type = wave; osc.frequency.value = N.A3;
        const filt = ctx.createBiquadFilter(); filt.type = 'lowpass'; filt.frequency.value = 2400; filt.Q.value = 1;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.001, t); g.gain.linearRampToValueAtTime(0.3, t + 0.12);
        g.gain.setValueAtTime(0.28, t + 1.5); g.gain.linearRampToValueAtTime(0.001, t + 2.0);
        osc.connect(filt); filt.connect(g); g.connect(out); osc.start(t); osc.stop(t + 2.1);
      }
    }
  },
  'LFO': {
    bpm: 120, color: '#a5d6a7', emoji: '🌊', label: '120 BPM · Filter wobble driven by LFO',
    playStep: (s, ctx, t, out) => {
      if (s % 4 === 0) sKick(ctx, out, t, { freq: 50, decay: 0.35, gain: 0.5 });
      if (s % 8 === 0) {
        // Sustained bass with LFO-style filter sweep
        const osc = ctx.createOscillator(); osc.type = 'sawtooth'; osc.frequency.value = N.A1;
        const filt = ctx.createBiquadFilter(); filt.type = 'lowpass'; filt.Q.value = 14;
        const stepLen = (60 / 120) / 4;
        const barLen = stepLen * 8; // 8 steps = half bar
        filt.frequency.setValueAtTime(140, t);
        filt.frequency.linearRampToValueAtTime(900, t + barLen * 0.25);
        filt.frequency.linearRampToValueAtTime(140, t + barLen * 0.5);
        filt.frequency.linearRampToValueAtTime(700, t + barLen * 0.75);
        filt.frequency.linearRampToValueAtTime(140, t + barLen);
        const g = ctx.createGain(); g.gain.setValueAtTime(0.48, t + 0.01); g.gain.exponentialRampToValueAtTime(0.001, t + barLen + 0.05);
        osc.connect(filt); filt.connect(g); g.connect(out); osc.start(t); osc.stop(t + barLen + 0.1);
      }
    }
  },
  'Filter': {
    bpm: 60, color: '#1de9b6', emoji: '🎚️', label: '60 BPM · Filter sweeping open → closed',
    playStep: (s, ctx, t, out) => {
      if (s === 0 || s === 8) sKick(ctx, out, t, { freq: 48, decay: 0.6, gain: 0.45 });
      // Whole bar: held chord with filter sweep
      if (s === 0) {
        const stepLen = (60 / 60) / 4; // 16th note at 60 BPM
        const barLen = stepLen * 16; // = 4 seconds
        [N.A1, N.E2, N.A2].forEach((freq, i) => {
          const osc = ctx.createOscillator(); osc.type = 'sawtooth'; osc.frequency.value = freq;
          const filt = ctx.createBiquadFilter(); filt.type = 'lowpass'; filt.Q.value = 7;
          // Starts muffled → opens up → closes again
          filt.frequency.setValueAtTime(60, t);
          filt.frequency.exponentialRampToValueAtTime(4000, t + barLen * 0.45);
          filt.frequency.exponentialRampToValueAtTime(60, t + barLen * 0.9);
          const g = ctx.createGain(); g.gain.setValueAtTime(0.22 - i * 0.05, t + 0.01); g.gain.setValueAtTime(0.001, t + barLen - 0.05);
          osc.connect(filt); filt.connect(g); g.connect(out); osc.start(t); osc.stop(t + barLen);
        });
      }
    }
  },
  'Arpeggio': {
    bpm: 140, color: '#f48fb1', emoji: '🎵', label: '140 BPM · Ascending & descending arpeggios',
    playStep: (s, ctx, t, out) => {
      if (s % 4 === 0) sKick(ctx, out, t, { freq: 50, decay: 0.3, gain: 0.4 });
      const arpUp   = [N.A2, N.C3, N.E3, N.A3, N.E3, N.C3, N.A2, null];
      const arpDown = [N.A3, N.E3, N.C3, N.A2, N.C3, N.E3, N.A3, null];
      const note = s < 8 ? arpUp[s] : arpDown[s - 8];
      if (note) sBass(ctx, out, t, { freq: note, filt: 4000, q: 2, decay: 0.13, gain: 0.34, type: 'sawtooth' });
    }
  },
  'Pad': {
    bpm: 60, color: '#90caf9', emoji: '🌫️', label: '60 BPM · Atmospheric sustained pad chord',
    playStep: (s, ctx, t, out) => {
      if (s === 0) {
        // Rich pad chord — A minor voicing
        sPad(ctx, out, t, { freq: N.A2, dur: 4.2, gain: 0.16 });
        sPad(ctx, out, t, { freq: N.E3, dur: 4.2, gain: 0.10 });
      }
      if (s === 0 || s === 8) sKick(ctx, out, t, { freq: 44, decay: 0.65, gain: 0.25 });
    }
  },
};

// ═══════════════════════════════════════════════════════════════
// RHYTHM AUDIO DEMOS — isolated concept demonstrations
// ═══════════════════════════════════════════════════════════════
const RHYTHM_AUDIO = {
  'BPM': {
    bpm: 100, color: '#ff6b6b', emoji: '🎯', label: '100 BPM · Count the kick — that\'s BPM',
    playStep: (s, ctx, t, out) => {
      // Crystal clear: one kick per beat (every 4 steps = 1 beat)
      // Accent click on beat 1, regular click on other beats so you can count
      if (s % 4 === 0) {
        sKick(ctx, out, t, { freq: 52, decay: 0.4, gain: 0.85 });
        sClick(ctx, out, t, { gain: 0.2, accent: s === 0 });
      }
    }
  },
  'Kick Drum': {
    bpm: 80, color: '#ff6b6b', emoji: '💥', label: '80 BPM · The kick drum — isolated & bare',
    playStep: (s, ctx, t, out) => {
      // Just the kick, slow and clear — hear exactly what it sounds like alone
      if (s === 0) sKick(ctx, out, t, { freq: 52, decay: 0.55, gain: 0.9 });
      if (s === 8) sKick(ctx, out, t, { freq: 52, decay: 0.55, gain: 0.9 });
    }
  },
  'Hi-Hat': {
    bpm: 110, color: '#ff6b6b', emoji: '🎩', label: '110 BPM · Closed hats (steps 1-8) then open hats (9-16)',
    playStep: (s, ctx, t, out) => {
      // First 8 steps: closed hi-hat (short, sharp)
      // Last 8 steps: open hi-hat (longer, sizzly) — hear the difference
      if (s < 8) { sHat(ctx, out, t, { open: false, gain: 0.28, tone: 7500 }); }
      else        { sHat(ctx, out, t, { open: true,  gain: 0.20, tone: 7000 }); }
      // Quiet kick for context
      if (s % 4 === 0) sKick(ctx, out, t, { freq: 50, decay: 0.35, gain: 0.4 });
    }
  },
  'Snare': {
    bpm: 100, color: '#ff6b6b', emoji: '🥁', label: '100 BPM · Snare on beats 2 & 4 — the backbeat',
    playStep: (s, ctx, t, out) => {
      // Classic backbeat: kick on 1&3, snare on 2&4
      if (s === 0 || s === 8) sKick(ctx, out, t, { freq: 52, decay: 0.4, gain: 0.8 });
      if (s === 4 || s === 12) sSnare(ctx, out, t, { gain: 0.42 });
      if (s % 2 === 1) sHat(ctx, out, t, { gain: 0.1 });
    }
  },
  '4/4': {
    bpm: 128, color: '#ff6b6b', emoji: '4️⃣', label: '128 BPM · Four kicks per bar — the heartbeat of club music',
    playStep: (s, ctx, t, out) => {
      // The most important pattern in electronic music — 4 kicks per bar, every beat
      if (s % 4 === 0) sKick(ctx, out, t, { freq: 52, decay: 0.4, gain: 0.9 });
      // Offbeat hi-hat between each kick
      if (s % 4 === 2) sHat(ctx, out, t, { gain: 0.2 });
    }
  },
  'Offbeat': {
    bpm: 120, color: '#ff6b6b', emoji: '↔️', label: '120 BPM · Kick ON the beat, hi-hat BETWEEN the beats',
    playStep: (s, ctx, t, out) => {
      // Highlight the contrast: kick = beat, hat = offbeat
      if (s % 4 === 0) sKick(ctx, out, t, { freq: 52, decay: 0.38, gain: 0.88 });
      // Accented open hat on the offbeat to make it really clear
      if (s % 4 === 2) sHat(ctx, out, t, { open: true, gain: 0.26 });
    }
  },
  'Bar / Measure': {
    bpm: 80, color: '#ff6b6b', emoji: '📏', label: '80 BPM · Hear 1 bar = 4 beats cycling',
    playStep: (s, ctx, t, out) => {
      // Slow & clear so you can count: 1 (BOOM) ... 2 (click) ... 3 (click) ... 4 (click) ... repeat
      if (s === 0)  { sKick(ctx, out, t, { freq: 55, decay: 0.5, gain: 0.9 }); sClick(ctx, out, t, { gain: 0.3, accent: true }); }
      if (s === 4)  sClick(ctx, out, t, { gain: 0.2 });
      if (s === 8)  sClick(ctx, out, t, { gain: 0.2 });
      if (s === 12) sClick(ctx, out, t, { gain: 0.2 });
    }
  },
  'Polyrhythm': {
    bpm: 116, color: '#ff6b6b', emoji: '🔀', label: '116 BPM · 4-beat kick vs 3-beat metal — two rhythms at once',
    playStep: (s, ctx, t, out) => {
      // 4-beat rhythm: kick on every beat (0,4,8,12)
      if (s % 4 === 0) sKick(ctx, out, t, { freq: 52, decay: 0.38, gain: 0.82 });
      // 3-beat rhythm: metal hits approximate triplet positions (0, 5, 10)
      // Both play simultaneously — hear them pulling against each other
      if (s === 0 || s === 5 || s === 10) sMetal(ctx, out, t, { gain: 0.28, decay: 0.12 });
    }
  },
  // ── NEW RHYTHM TERMS ──
  'Groove': {
    bpm: 120, color: '#ff6b6b', emoji: '🕺', label: '120 BPM · Dense layered percussion that makes you move',
    playStep: (s, ctx, t, out) => {
      if (s % 4 === 0) sKick(ctx, out, t, { freq: 50, decay: 0.38, gain: 0.85 });
      // Groove = layered, textured percussion — not just kick and hat
      if (s % 4 === 2) sHat(ctx, out, t, { open: true, gain: 0.14 });
      sHat(ctx, out, t, { gain: 0.08 + (s % 3 === 1 ? 0.07 : 0) }); // accented irregular pattern
      if (s === 3 || s === 7 || s === 11 || s === 14) sMetal(ctx, out, t, { gain: 0.1, decay: 0.07 });
      if (s === 4 || s === 12) sSnare(ctx, out, t, { gain: 0.28 });
    }
  },
  'Swing': {
    bpm: 118, color: '#ff6b6b', emoji: '↩️', label: '118 BPM · Straight timing vs swung timing — hear the bounce',
    playStep: (s, ctx, t, out) => {
      if (s % 4 === 0) sKick(ctx, out, t, { freq: 52, decay: 0.38, gain: 0.85 });
      if (s === 4 || s === 12) sSnare(ctx, out, t, { gain: 0.32 });
      // First half (steps 0-7): straight 16th notes — robotic
      // Second half (steps 8-15): swing feel — accented "and" of each beat
      if (s < 8) {
        if (s % 2 === 0) sHat(ctx, out, t, { gain: 0.14 }); // every 16th
      } else {
        // Swung: hit on the beat + delay the "and" — approximated with step placement
        if (s % 4 === 0 || s % 4 === 3) sHat(ctx, out, t, { gain: s % 4 === 3 ? 0.18 : 0.1 });
      }
    }
  },
  'Syncopation': {
    bpm: 118, color: '#ff6b6b', emoji: '⚡', label: '118 BPM · Accents land BETWEEN the main beats',
    playStep: (s, ctx, t, out) => {
      // Regular hi-hat on the beat so you always know where the beat is
      if (s % 4 === 0) sHat(ctx, out, t, { gain: 0.12 });
      // Syncopated kick: lands on the "and" (between beats), not on the beat
      if (s === 2 || s === 9 || s === 14) sKick(ctx, out, t, { freq: 52, decay: 0.28, gain: 0.82 });
      // Syncopated snare
      if (s === 6 || s === 11) sSnare(ctx, out, t, { gain: 0.34 });
    }
  },
  'Ghost Notes': {
    bpm: 112, color: '#ff6b6b', emoji: '👻', label: '112 BPM · Loud snare + barely-audible ghosts between',
    playStep: (s, ctx, t, out) => {
      if (s % 4 === 0) sKick(ctx, out, t, { freq: 50, decay: 0.38, gain: 0.82 });
      sHat(ctx, out, t, { gain: 0.09 });
      // LOUD main snare on 2 and 4
      if (s === 4 || s === 12) sSnare(ctx, out, t, { gain: 0.44, ghost: false });
      // Ghost notes — whisper-quiet snare hits between the main ones
      // You have to listen closely — that texture IS the groove
      if (s === 2 || s === 6 || s === 9 || s === 11 || s === 14) sSnare(ctx, out, t, { gain: 0.44, ghost: true });
    }
  },
  'Half Time': {
    bpm: 138, color: '#ff6b6b', emoji: '🐌', label: '138 BPM clock, half-time feel — groove at double the space',
    playStep: (s, ctx, t, out) => {
      // Same BPM but the kick and snare move to half-time positions
      // Kick only on beat 1 (step 0), snare only on beat 3 (step 8)
      // Fast hi-hats stay at normal rate — so you hear the BPM hasn't changed
      if (s === 0)  sKick(ctx, out, t, { freq: 50, decay: 0.55, gain: 0.9 });
      if (s === 8)  sSnare(ctx, out, t, { gain: 0.42 }); // snare on beat 3 = half-time feel
      sHat(ctx, out, t, { gain: 0.11 }); // every 16th step — the clock keeps running
      if (s % 4 === 2) sHat(ctx, out, t, { open: true, gain: 0.09 });
    }
  },
};

// Unified audio lookup — works for genres, sound design, and rhythm terms
const getAudio = (key) => GENRE_AUDIO[key] || TERM_AUDIO[key] || RHYTHM_AUDIO[key];

// ═══════════════════════════════════════════════════════════════
// ─── Visual pattern helper: 16 steps, 0=off 1=on 2=accent 3=ghost
const terms = [
  // ══ RHYTHM ══
  { id:1, term:"BPM", category:"Rhythm", short:"Beats Per Minute",
    level:"Beginner",
    description:"The speed of a track. 1 BPM = 1 kick drum hit per minute. Higher BPM = faster and more intense.",
    plain:"Think of your heartbeat — doctors measure it in beats per minute. Music works exactly the same way. A resting heart is ~60 BPM. Techno runs at 130–150 BPM. Your heart literally speeds up to match it.",
    visual:[{label:"KICK",p:[2,0,0,0,2,0,0,0,2,0,0,0,2,0,0,0]},{label:"COUNT",p:[2,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0]}],
    why:"BPM determines which genre a track belongs to, whether two tracks can be mixed together, and how intense the dancefloor energy will be. A DJ choosing 132 vs 148 BPM is choosing the mood of the night.",
    listen:"Put on any techno track and tap your finger to the beat for 15 seconds. Count your taps and multiply by 4. That's the BPM. Try it — it works every time.",
    example:"A track at 140 BPM hits 140 kick drum beats every 60 seconds." },

  { id:2, term:"Kick Drum", category:"Rhythm", short:"The heartbeat",
    level:"Beginner",
    description:"The deep, low BOOM that pulses through every techno track. The thud you feel in your chest at a rave.",
    plain:"Imagine someone punching a large drum with their foot — that booming thud that travels through your ribcage. At a club, it's the sound you feel before you hear. It's not just audio, it's physical.",
    visual:[{label:"KICK",p:[2,0,0,0,2,0,0,0,2,0,0,0,2,0,0,0]},{label:"REST",p:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]}],
    why:"The kick is the skeleton of every techno track. Everything else is built around it. Remove the kick and the track collapses. It's why when a DJ drops the kick back in after a breakdown, the crowd explodes.",
    listen:"Stand near a speaker at a rave. The physical pressure you feel against your chest — not just heard, but FELT — that's the kick drum.",
    example:"In techno, the kick usually hits every beat: BOOM BOOM BOOM BOOM — that's 4 kicks per bar." },

  { id:3, term:"Hi-Hat", category:"Rhythm", short:"The sizzle",
    level:"Beginner",
    description:"A sharp metallic tsss or tick sound on top of the kick. Open hi-hats ring long, closed are short and sharp.",
    plain:"Two metal cymbals being clicked together. Closed hi-hat = quick tap (tsss). Open hi-hat = letting them ring (tssssss). Like snapping your fingers vs holding the snap. It's the fastest, highest-pitched, most constant element in any track.",
    visual:[{label:"KICK",p:[2,0,0,0,2,0,0,0,2,0,0,0,2,0,0,0]},{label:"HI-HAT",p:[0,0,1,0,0,0,1,0,0,0,1,0,0,0,1,0]}],
    why:"Hi-hats are the metronome of a techno track. They fill the space between kicks and define the speed of the groove. Hard techno uses rolling 16th-note hi-hats — 4 hats between every kick — creating an unstoppable machine energy.",
    listen:"In any techno track, find the highest-pitched sound that repeats rapidly and consistently. That metallic tsss tsss running under everything — that's the hi-hat. Short and clicky = closed. Sizzling longer = open.",
    example:"Fast rolling hi-hats every 16th note are a signature of hard techno and psy." },

  { id:4, term:"Snare", category:"Rhythm", short:"The crack",
    level:"Beginner",
    description:"A sharp CRACK or CLAP that typically falls on beats 2 and 4. Creates tension and drives the groove forward.",
    plain:"Think of a whipcrack, a handclap, or a book slapped on a table. Sharp and sudden. In virtually all techno it falls on beats 2 and 4 — the off beats. It's the sound you'd naturally clap along to at a concert.",
    visual:[{label:"KICK",p:[2,0,0,0,0,0,0,0,2,0,0,0,0,0,0,0]},{label:"SNARE",p:[0,0,0,0,2,0,0,0,0,0,0,0,2,0,0,0]},{label:"H-HAT",p:[0,0,1,0,0,0,1,0,0,0,1,0,0,0,1,0]}],
    why:"The snare creates the backbeat — the tension and release that makes music feel like it breathes. Without it, a track feels like a running machine. With it, it feels like a living thing.",
    listen:"Put on any track and clap along. Your claps will naturally land on the snare — beats 2 and 4. Try to feel the difference between the low kick (beats 1 and 3) and the sharp snare (beats 2 and 4).",
    example:"A clap snare on beat 3 gives psy its distinctive marching energy." },

  { id:5, term:"4/4", category:"Rhythm", short:"Four on the floor",
    level:"Beginner",
    description:"4 kick drums per bar, one on each beat. The universal pulse of club music.",
    plain:"Four equal kicks in every bar: BOOM BOOM BOOM BOOM. Perfectly regular, perfectly reliable, perfectly hypnotic. Every mainstream club music genre uses it. It's called four on the floor because all 4 beats hit the floor equally hard.",
    visual:[{label:"KICK",p:[2,0,0,0,2,0,0,0,2,0,0,0,2,0,0,0]},{label:"H-HAT",p:[0,0,1,0,0,0,1,0,0,0,1,0,0,0,1,0]},{label:"BEATS",p:[2,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0]}],
    why:"4/4 is the engine of the dancefloor. It's so regular that your brain locks onto it within seconds, triggering involuntary movement.",
    listen:"Put on literally any techno track. Count 1-2-3-4, 1-2-3-4. You'll hear a kick on every number. Every time. That perfect regularity IS 4/4.",
    example:"BOOM BOOM BOOM BOOM — 4 kicks per bar, that's 4/4." },

  { id:6, term:"Offbeat", category:"Rhythm", short:"Between the beats",
    level:"Beginner",
    description:"Notes or hits that land BETWEEN the main beats. Creates the shuffle and groove that makes tracks hypnotic.",
    plain:"If the beats are like a clock — TICK-tock-TICK-tock — the tock is the offbeat. The hi-hat almost always lives on the offbeat, giving techno its forward momentum.",
    visual:[{label:"BEAT",p:[2,0,0,0,2,0,0,0,2,0,0,0,2,0,0,0]},{label:"OFFBEAT",p:[0,0,2,0,0,0,2,0,0,0,2,0,0,0,2,0]}],
    why:"Offbeats create motion and tension. A track with only on-beats feels static. Add offbeat elements and it starts to groove and pull you forward.",
    listen:"Listen for the hi-hat. It usually sits between the kicks. Tap on the kicks, then tap between them — now you're on the offbeat.",
    example:"BOOM-tsss-BOOM-tsss — kick on beat, hi-hat offbeat. The tsss is the offbeat." },

  { id:7, term:"Bar / Measure", category:"Rhythm", short:"One loop cycle",
    level:"Beginner",
    description:"A bar is one full cycle of the beat pattern — 4 beats. Techno builds in multiples of 8 or 16 bars.",
    plain:"One bar is one complete sentence of the rhythm. In 4/4 techno, a bar equals 4 beats — BOOM BOOM BOOM BOOM — then it restarts. Think of it like breathing: inhale is 4 beats, exhale is 4 beats, that's 2 bars.",
    visual:[{label:"BAR 1",p:[2,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0]},{label:"BAR 2",p:[2,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0]}],
    why:"DJs mix tracks in 8-bar or 16-bar phrases. If you mix at the wrong bar position, everything sounds wrong. Bars are the grammar of techno.",
    listen:"Count to 4 then start again: 1-2-3-4, 1-2-3-4. Every time you restart the count = a new bar.",
    example:"A DJ mixes tracks in 8-bar or 16-bar phrases to keep everything sounding smooth." },

  { id:8, term:"Polyrhythm", category:"Rhythm", short:"Multiple rhythms at once",
    level:"Intermediate",
    description:"When two or more different rhythmic patterns play simultaneously, creating a hypnotic, shifting groove.",
    plain:"Two people clapping at different speeds in the same room — one every 4 seconds, one every 3. They start together, drift apart, then come back into sync. That moment of re-syncing feels satisfying and magical. That's polyrhythm.",
    visual:[{label:"4-BEAT",p:[2,0,0,0,2,0,0,0,2,0,0,0,2,0,0,0]},{label:"3-BEAT",p:[2,0,0,0,0,2,0,0,0,0,2,0,0,0,0,2]}],
    why:"Polyrhythm is what separates hypnotic techno from just repetitive techno. When two patterns fight and periodically sync up, your brain gets a tiny hit of satisfaction. It's the mathematical source of trance-like states.",
    listen:"Listen for a hi-hat that seems to move in a different cycle to the kick — it drifts, lands in unexpected places, then snaps back. When it lines up with the kick you'll feel a sense of resolution.",
    example:"A 3-beat hi-hat over a 4-beat kick sync up every 3 bars — that moment of alignment is addictive." },

  { id:71, term:"Groove", category:"Rhythm", short:"The feel that moves you",
    level:"Intermediate",
    description:"The quality that makes rhythm feel alive and compulsive — all elements locking together in a way that triggers movement.",
    plain:"Groove is why some tracks make you dance and others don't at the same BPM. You can't point to one sound and say that's the groove. It's the chemistry between kick, snare, hi-hat, and bass. No groove = robotic. Great groove = you can't stop moving.",
    visual:[{label:"KICK",p:[2,0,0,0,0,0,1,0,2,0,0,0,0,0,0,0]},{label:"SNARE",p:[0,0,0,0,2,0,0,0,0,0,0,0,2,0,1,0]},{label:"H-HAT",p:[1,0,1,0,1,0,1,0,1,2,1,0,1,0,1,2]}],
    why:"Every great techno producer obsesses over groove. It's the difference between a technically correct drum pattern and one that physically moves a dancefloor.",
    listen:"Play two tracks at the same BPM back to back. One will make you move more naturally. The one that gets your body going without you deciding to dance — that's the one with groove.",
    example:"Two tracks at 140 BPM — one robotic, one makes 1000 people dance. The difference is groove." },

  { id:72, term:"Swing", category:"Rhythm", short:"Delayed offbeats equal bounce",
    level:"Intermediate",
    description:"When offbeat 16th notes are played slightly late, giving the rhythm a bouncy, human feel instead of a robotic grid.",
    plain:"A perfectly-programmed drum machine walks in perfectly equal steps. A human drummer with swing walks with a slight strut — that tick lands just a tiny bit late. That lateness is swing and it makes rhythm feel alive.",
    visual:[{label:"STRAIGHT",p:[1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0]},{label:"SWUNG",p:[1,0,0,1,1,0,0,1,1,0,0,1,1,0,0,1]}],
    why:"Swing is the bridge between mechanical electronic music and organic, human-feeling music. Hard Groove techno is almost entirely built around swing.",
    listen:"Find a jazz track then put on a rigid hard techno track. The jazz swings — the 16ths arrive slightly late. The hard techno is straight — every note exactly on the grid.",
    example:"A drum machine with swing sounds like a human drummer. Without swing it sounds like a robot." },

  { id:73, term:"Syncopation", category:"Rhythm", short:"Accent on the unexpected beat",
    level:"Intermediate",
    description:"Placing emphasis on beats that are not normally accented — between the main beats, on the weak beats.",
    plain:"Normally you expect the knock on beats 1 and 3. Syncopation knocks BETWEEN them instead — the surprise is the point. It's musical suspense.",
    visual:[{label:"EXPECTED",p:[2,0,0,0,0,0,0,0,2,0,0,0,0,0,0,0]},{label:"SYNCOPATED",p:[0,0,1,0,2,0,0,0,0,0,0,1,0,2,0,0]}],
    why:"Syncopation is what stops a groove from being predictable. It creates rhythmic tension and forward momentum.",
    listen:"Listen for a kick or snare that hits at a moment you did not expect. That catch — your body reacting to something landing where you weren't prepared — is syncopation doing its job.",
    example:"A kick that lands just BEFORE beat 1 instead of ON beat 1 creates enormous forward tension." },

  { id:74, term:"Ghost Notes", category:"Rhythm", short:"Whisper hits between the loud ones",
    level:"Advanced",
    description:"Extremely quiet drum hits that add invisible texture — if removed, the groove would feel emptier even if you could not name why.",
    plain:"Imagine a main singer and someone whispering the same lyrics just under them. You don't consciously hear the whisper — but if it stopped, you'd feel something was missing. Ghost notes are the whisper.",
    visual:[{label:"SNARE",p:[0,0,0,0,2,0,0,0,0,0,0,0,2,0,0,0]},{label:"GHOST",p:[0,3,0,3,0,0,3,0,3,0,3,0,0,0,3,3]}],
    why:"Ghost notes are what separate good drum programming from great drum programming. They're the invisible scaffolding of a groove.",
    listen:"In a track with a clear snare on 2 and 4, close your eyes and listen in the spaces between snares. If you hear incredibly soft hits — those are ghost notes. Use headphones for this.",
    example:"The main snare everyone hears on 2 and 4. The ghost snares between them — felt but not consciously noticed." },

  { id:75, term:"Half Time", category:"Rhythm", short:"Groove that feels twice as slow",
    level:"Intermediate",
    description:"The snare moves to beat 3 only — making the groove feel half-speed even though the BPM has not changed.",
    plain:"The BPM stays the same but the snare moves from hitting on beats 2 AND 4 to hitting only on beat 3. This single change makes the whole track feel like it's moving at half speed. Like switching from a fast walk to a heavy strut.",
    visual:[{label:"NORMAL",p:[2,0,0,0,0,2,0,0,2,0,0,0,0,2,0,0]},{label:"HALFTIME",p:[2,0,0,0,0,0,0,0,0,2,0,0,0,0,0,0]}],
    why:"Half time drops are some of the most powerful moments in techno. When a track drops into half time in a breakdown, the weight of the groove doubles.",
    listen:"In a breakdown, notice if the snare seems to have moved. If the kicks are still fast but you only hear a crack every 2 bars — that's half time.",
    example:"Still at 140 BPM but the snare only hits once every 2 bars — suddenly it feels massive and slow." },

  // ══ SOUND DESIGN ══
  { id:9, term:"Bassline", category:"Sound Design", short:"The low rumble",
    level:"Beginner",
    description:"A repeating low-frequency melody or groove that drives the energy. In psy, the bassline IS the melody.",
    plain:"If the kick is a heartbeat, the bassline is the bloodstream — a low melodic pulse flowing underneath everything. In psytrance, the bassline tells the whole story. It twists, morphs, and carries all the musical meaning.",
    visual:[{label:"KICK",p:[2,0,0,0,2,0,0,0,2,0,0,0,2,0,0,0]},{label:"BASS",p:[2,0,1,0,1,2,0,1,2,0,1,0,2,1,0,1]}],
    why:"In psytrance especially, the bassline carries the entire musical content. It's simultaneously rhythm and melody. The bassline is what distinguishes one psy track from another.",
    listen:"At a festival or through good headphones, focus on what you feel in your stomach rather than what you hear with your ears. That low rolling, shifting sound with its own pattern — that's the bassline.",
    example:"The rolling pattern you feel in your body at a festival, rising and falling with its own melody, is the bassline." },

  { id:10, term:"Acid Line", category:"Sound Design", short:"Squelchy 303 synth",
    level:"Beginner",
    description:"That iconic squelching, bubbling, resonant sound made originally by the Roland TB-303 bass synthesizer.",
    plain:"Imagine a rubber duck being squeezed underwater while speaking. That wet, rubbery, speaking quality — waaah-waaah-WOW — is an acid line. It came from a cheap 1981 bass machine nobody wanted, until producers discovered its quirky sound was utterly hypnotic.",
    why:"Acid is one of the most recognisable sounds in electronic music. The TB-303's resonant filter sweep defined entire genres — acid house, acid techno, acid psy.",
    listen:"Listen for a sound that seems to speak or bubble — rising and falling in pitch with a squelchy, resonant quality. It sounds wet. In acid techno tracks, it's the main event.",
    example:"That waah-waaah bubbling sound that seems almost like speech — that's the TB-303 acid line." },

  { id:11, term:"808", category:"Sound Design", short:"Classic drum machine",
    level:"Beginner",
    description:"The Roland TR-808 — legendary drum machine with a booming kick, snappy snare, and punchy hi-hats.",
    plain:"A drum machine from 1980 considered a commercial failure. Then hip-hop, house, and techno producers realized the 808 kick was actually the most powerful bass sound ever made. It shakes speakers in a way real drums simply cannot.",
    why:"The 808 shaped almost all modern electronic music. Its kick drum is the blueprint for the deep, chest-punching techno kick.",
    listen:"Compare the demo kick to a real acoustic drum recording. The 808 kick is longer, deeper, more resonant — almost like a bass note. That's why it hits so hard in clubs.",
    example:"That massive kick that shakes speakers? Often derived from an 808 kick sample." },

  { id:12, term:"909", category:"Sound Design", short:"Techno's drum machine",
    level:"Beginner",
    description:"The Roland TR-909 — THE classic techno drum machine with a harder, punchier sound than the 808.",
    plain:"The 808's younger sibling — also a failed drum machine that became the foundation of techno. Where the 808 kick is deep and boomy, the 909 kick is tighter, snappier, and punches harder at high volumes. Detroit techno was built on the 909.",
    why:"The 909 is why techno kicks hit differently to other music. Even today's software copies the 909 because nothing has surpassed it for club impact.",
    listen:"Compare 808 demo vs 909 demo side by side. The 808 has a longer, slower boom. The 909 has a sharper, faster punch.",
    example:"Detroit techno pioneers like Derrick May and Juan Atkins built the entire genre on 909 drums." },

  { id:13, term:"Synth", category:"Sound Design", short:"Electronic sound maker",
    level:"Beginner",
    description:"Short for synthesizer — any electronic instrument that generates sound artificially.",
    plain:"Every sound in a techno track that is not a drum was made by a synthesizer. The warping bassline, the eerie pad, the screaming lead — all synths. A synth generates sound from pure mathematics and electricity. No microphone, no real instrument, no air moving.",
    why:"Synthesizers are the entire palette of techno and psy. The specific synths used defines the character of a genre and an era of music.",
    listen:"In any techno track, identify any sound that is not a drum. That squealing lead, that atmospheric texture, that bass that seems to speak — all synthesizers.",
    example:"The warping, morphing leads and basslines in psy are synthesizers with extreme modulation applied." },

  { id:14, term:"Oscillator", category:"Sound Design", short:"The tone generator inside a synth",
    level:"Advanced",
    description:"The core component of a synthesizer that generates the raw waveform — sine, saw, square, or triangle.",
    plain:"If a synth is a paint kit, the oscillator is the colour. It generates the raw sound before anything else shapes it. Four basic shapes: Sine (smooth, pure), Sawtooth (buzzy, aggressive), Square (hollow, hard), Triangle (in between).",
    visual:[{label:"SINE",p:[0,1,1,1,1,1,0,0,0,0,1,1,1,1,0,0]},{label:"SAW",p:[1,1,2,2,1,1,2,2,1,1,2,2,1,1,2,2]},{label:"SQR",p:[2,2,0,0,2,2,0,0,2,2,0,0,2,2,0,0]}],
    why:"Choosing the right oscillator waveform is the first decision in any sound design. Sawtooth for most techno bass sounds. Sine for sub-bass and kick body. Square for hollow leads and EBM stabs.",
    listen:"The demo cycles through all four waveforms. Close your eyes and notice how each feels different — smooth vs buzzy vs hollow.",
    example:"A saw wave gives a synth that buzzy quality. A sine wave is smooth and pure — like the body of a kick drum." },

  { id:15, term:"LFO", category:"Sound Design", short:"The wobble machine",
    level:"Intermediate",
    description:"Low Frequency Oscillator — a slow wave that controls other parameters, creating movement and wobble.",
    plain:"An LFO is an invisible hand that slowly turns knobs for you. Attach it to the filter and the sound opens and closes rhythmically — wah-wah-wah. You never hear the LFO directly — you hear what it's controlling.",
    why:"LFOs are what give electronic music its sense of life and movement. Without them, synths would just play static notes. Most psytrance basslines are heavily LFO-modulated.",
    listen:"In the demo, the bass opens and closes in a regular pattern — getting brighter then darker. That rhythmic movement is an LFO controlling the filter.",
    example:"An LFO on a filter makes a bassline go wah-wah-wah in sync with the beat." },

  { id:16, term:"Filter", category:"Sound Design", short:"The tone shaper",
    level:"Intermediate",
    description:"Removes certain frequencies from a sound. A low-pass filter cuts the highs. Used for dramatic builds and sweeps.",
    plain:"Imagine putting your hands over your ears — you can still hear but the highs are gone and everything sounds muffled. That's what a low-pass filter does. DJs use filter sweeps for tension: slowly remove all highs to build intensity, then snap everything back at the drop.",
    why:"Filters are the most expressive real-time tool in electronic music. A DJ sweeping a filter over 16 bars creates more tension than any complex arrangement.",
    listen:"In the demo, a chord starts completely muffled, then the filter sweeps all the way open and you hear the full bright sound. That's the build-drop cycle in miniature.",
    example:"When a DJ slowly brings back the bass after stripping it out — they're opening a low-pass filter." },

  { id:17, term:"Arpeggio", category:"Sound Design", short:"Fast note sequences",
    level:"Intermediate",
    description:"Notes of a chord played in rapid sequence, creating a cascading melodic effect.",
    plain:"Instead of playing all 3 notes of a chord at once, play them one after another very quickly. Repeat that at high speed and you get that spiraling, escalating melodic energy. Goa trance and full-on psy are almost entirely built from arpeggiated synths.",
    why:"Arpeggios are the melodic engine of psytrance. The ascending arpeggios create the sense of climbing and euphoria. Descending creates resolution.",
    listen:"In the demo, the notes step through in a sequence — up, up, up, down, down — rather than all at once. That ladder-like climbing is an arpeggio.",
    example:"That rapid dee-dee-dee-dee melody climbing upward in a psy track — that's an arpeggio." },

  { id:18, term:"Pad", category:"Sound Design", short:"Atmospheric texture",
    level:"Beginner",
    description:"A sustained, slowly-evolving atmospheric sound that fills the background and creates mood.",
    plain:"Imagine a sound that does not have a beginning or end — it just exists, holding space. Like the hum of a room. Pads do not hit, they sustain. They are the air behind the main elements. Remove them and the track feels cold and empty.",
    why:"Pads define the emotional character of a track. A bright major-key pad feels euphoric. A dark dissonant pad creates dread. A warm evolving pad creates introspection.",
    listen:"In the demo, the pad is the continuous evolving sound without sharp hits. Close your eyes and notice how it affects your emotional state.",
    example:"The eerie, floating, space-filling sound in dark psy that creates dread = a dark pad." },

  // ══ PRODUCTION ══
  { id:19, term:"DAW", category:"Production", short:"Music making software",
    level:"Beginner",
    description:"Digital Audio Workstation — the software producers use to make music. Ableton Live is the industry standard.",
    plain:"A DAW is Microsoft Word but for music. Instead of writing sentences, you are recording sounds, placing drum hits, drawing basslines, and layering everything together. Every techno track you have heard was assembled in one.",
    why:"Understanding even the basics of DAWs helps you understand why techno sounds the way it does — patterns looping, layers being added, builds and drops all structured in software.",
    listen:"No audio demo — but next time you watch a producer live set on YouTube, look at their laptop screen. That grid they're controlling is their DAW.",
    example:"Ableton Live, Logic Pro, FL Studio, Bitwig Studio — all DAWs used to produce techno and psy." },

  { id:20, term:"VST", category:"Production", short:"Plugin instrument or effect",
    level:"Intermediate",
    description:"Virtual Studio Technology — software plugins that add virtual instruments or effects to a DAW.",
    plain:"VSTs are apps within the app. Your DAW is the shell, VSTs are the instruments. Download a VST synth like Serum and suddenly your DAW can generate any sound imaginable. Serum is how 90% of modern psy basslines are made.",
    why:"The VST you choose defines your sound. Most recognisable psy and techno sounds came from specific VSTs — Serum for modern psy, U-He Diva for vintage sounds.",
    listen:"No audio demo — but if you've wondered why modern psy sounds more polished than 90s Goa, a lot of it is the VSTs available now.",
    example:"Serum, Massive, Sylenth1, and U-He Diva are VST synths used extensively in psy and techno production." },

  { id:21, term:"Sidechain", category:"Production", short:"The pumping effect",
    level:"Intermediate",
    description:"When the kick drum automatically ducks the volume of other elements, creating that pumping, breathing rhythm.",
    plain:"Every time the kick hits, it sends a signal that briefly turns down the volume of everything else. So the bassline, pads, and synths all pulse rhythmically in sync with the kick. The result is that signature pumping effect — like the music is breathing. You have heard this in every techno track.",
    why:"Sidechain compression is so fundamental to techno it's genre-defining. Tracks without it feel flat and congested. With it, there's space, movement, and a physical pulse.",
    listen:"In the demo, the bassline ducks and recovers with every kick hit — pumping in and out. That's sidechaining.",
    example:"That breathing, pumping quality where the music ducks with every kick — that's sidechain compression." },

  { id:22, term:"Reverb", category:"Production", short:"Simulated room sound",
    level:"Beginner",
    description:"Simulates sound bouncing in a physical space. Short reverb = tight room. Long reverb = cathedral.",
    plain:"Clap your hands in a small bathroom versus a large church. The sound bounces around differently. Reverb puts any sound into a virtual space. A dry snare sounds clinical. Add reverb and it sounds like it was recorded in a room.",
    why:"Reverb is how producers create the sense of space and depth in a track. Dark psy uses enormous reverb to create that cavernous feeling. Minimal techno uses very short reverb to keep things tight.",
    listen:"In the demo, listen to how the snare crack continues to decay after the initial hit — that tail is reverb.",
    example:"A snare with massive reverb sounds like it's cracking in an empty warehouse." },

  { id:23, term:"Delay", category:"Production", short:"Rhythmic echo repeat",
    level:"Beginner",
    description:"Repeats a sound with a time offset, creating echo effects. Can be synced to BPM for rhythmic patterns.",
    plain:"Shout in a mountain valley — HELLO... hello... hello — each echo gets quieter. Delay does that to any sound, and you can sync the echo timing to the BPM. A single hi-hat hit can fill an entire bar with rhythmic echoes.",
    why:"Delay is one of the most creative production tools in techno. Dub techno is almost entirely built from delay effects.",
    listen:"In the demo, a hi-hat hits once and then echoes — tick...tick...tick — each quieter. Notice the echoes are rhythmically timed to the beat.",
    example:"A hi-hat with delay: TICK...tick...tick — one hit becomes a rhythmic fill." },

  { id:24, term:"Compression", category:"Production", short:"Volume control and punch",
    level:"Intermediate",
    description:"Automatically smooths out volume differences, making sounds more controlled and punchy.",
    plain:"Imagine automatically turning down every sound that's too loud and turning up every sound that's too quiet — thousands of times per second. That's compression. It makes everything sit at a consistent level. A compressed kick sounds punchier.",
    why:"Compression is why professional techno sounds powerful while bedroom productions sound weak. Most club sound systems are heavily compressed too.",
    listen:"Compare a kick before and after compression — the uncompressed version has wide volume differences. The compressed version sounds focused and controlled.",
    example:"A heavily compressed kick sounds snappy and consistent — it hits the same way every time." },

  { id:25, term:"EQ", category:"Production", short:"Frequency shaping",
    level:"Intermediate",
    description:"Equalizer — boosts or cuts specific frequency ranges. Used by both producers and DJs.",
    plain:"Sound is made of different frequency ranges: sub-bass (you feel it), bass (heard and felt), mids (where instruments live), highs (cymbals, brightness). EQ lets you turn each range up or down independently. DJs use the 3-band EQ on their mixer to blend tracks without clashing.",
    why:"EQ is how DJs mix two tracks seamlessly — cutting the bass on the outgoing track prevents the bass frequencies from fighting. Without EQ mixing would sound like mud.",
    listen:"Notice how the sound changes from full, to muffled, to thin, to bright. Each is EQ targeting different frequency ranges.",
    example:"Cutting the low frequencies on the outgoing track while bringing in the new track = EQ transition. Every DJ does this." },

  { id:26, term:"Sequencer", category:"Production", short:"Pattern programmer",
    level:"Intermediate",
    description:"A tool that programs patterns of notes or beats to loop. The fundamental tool for making electronic music.",
    plain:"A sequencer is like a grid of on/off switches, each representing a 16th note in time. Step 1 on = kick hits. Steps 2, 3, 4 off = silence. You flip switches to build a pattern, press play, and it loops forever. This is literally how all electronic drum patterns are made.",
    visual:[{label:"KICK",p:[2,0,0,0,2,0,0,0,2,0,0,0,2,0,0,0]},{label:"HAT",p:[0,0,1,0,0,0,1,0,0,0,1,0,0,0,1,0]},{label:"BASS",p:[2,0,1,0,0,2,0,1,2,0,0,1,0,2,1,0]}],
    why:"Sequencers are the reason techno is so repetitive — and why that repetition is hypnotic. The pattern loops, but subtle changes over time create the journey.",
    listen:"The step grid shown above IS a sequencer. Each filled square = a hit. Each empty square = silence. Reading left to right = time passing.",
    example:"Programming steps 1, 5, 9, 13 active = a basic 4/4 kick pattern. That's all of techno at its core." },

  { id:27, term:"Stem", category:"Production", short:"Isolated track layer",
    level:"Advanced",
    description:"A single isolated element of a track — just the kick, just the bassline, just the synth.",
    plain:"When a producer finishes a track, they can export it as separate files for each element — kick only, bass only, synths only. These are stems. A DJ with stems can mute individual elements live, creating live remixes in front of the audience.",
    why:"Stems allow DJs to perform more like live musicians — building the track piece by piece, creating tension and release in real time.",
    listen:"No audio demo — but if you've seen a DJ bringing in elements one at a time during a build, they might be using stems.",
    example:"A DJ brings in just the bass and kick first, then layers the synth on top — they're using stems." },

  { id:28, term:"Modulation", category:"Production", short:"Controlled change over time",
    level:"Advanced",
    description:"Automatically changing a parameter — pitch, filter, volume — over time. Heavy modulation gives psy its evolving sound.",
    plain:"Modulation is automation with personality. Instead of setting a filter to one position and leaving it, modulation makes it move — up, down, in rhythmic patterns, in sweeps. Heavy modulation is the single biggest reason psytrance sounds so alive compared to other music.",
    why:"Modulation is the difference between a static synthesizer and a living, breathing instrument. Psy producers often have 10 or more modulation sources on a single bassline.",
    listen:"In the demo, the bassline constantly shifts character — brighter then darker, wider then narrower. All of that is modulation running in the background.",
    example:"When a synth breathes, twists, and evolves throughout a track — that's modulation at work." },

  // ══ DJ SKILLS ══
  { id:29, term:"Beatmatch", category:"DJ Skills", short:"Syncing two tracks",
    level:"Beginner",
    description:"Adjusting the BPM of one track to exactly match another so they can be mixed together seamlessly.",
    plain:"If one track is at 142 BPM and another at 138, playing them together sounds like a car crash. Beatmatching means speeding up or slowing down one until both kick drums hit at exactly the same moment.",
    why:"Beatmatching is the foundational technical skill of DJing. Without it, two tracks playing simultaneously fight each other.",
    listen:"No audio demo — but imagine two songs you know playing simultaneously, slightly out of time. That awful flamming of the kicks is bad beatmatching. Good beatmatching: you can't tell when one track ends and another begins.",
    example:"Slowing the incoming track by 2 BPM until the kicks align perfectly — that's beatmatching." },

  { id:30, term:"Transition", category:"DJ Skills", short:"Moving between tracks",
    level:"Beginner",
    description:"The art of moving from one track to the next — the signature skill that defines a DJ's style.",
    plain:"A DJ set is a journey and transitions are the steps. A long 32-bar blend = smooth. A sharp cut at the drop = dramatic. A filter sweep over 4 bars = cinematic. Transitions are how a DJ controls the crowd's emotional experience.",
    why:"Transitions are where DJs express personality. A set of average tracks but masterful transitions can be transcendent.",
    listen:"Next time you're at a club, notice the moment when one track becomes another. Did you notice it? Did it surprise you? That craft is the transition.",
    example:"A 32-bar blend where you can't tell exactly when one track became another = a masterful transition." },

  { id:31, term:"Drop", category:"DJ Skills", short:"The peak moment",
    level:"Beginner",
    description:"When the full energy of a track kicks in after a build-up. The most powerful moment on the dancefloor.",
    plain:"Everything strips away — kick disappears, bass disappears, just a rising synth — and then BOOM, the full track hits. The drop is the release of all the tension that was built. It's why 2000 people can react simultaneously at exactly the same moment.",
    why:"The drop is the core unit of emotional payoff in electronic music. DJs who perfectly time drops create the moments crowds remember for years.",
    listen:"You have felt a drop. If you have ever been at a rave and had your whole body react to a moment without deciding to — that was a drop.",
    example:"The kick and bass disappear, a riser builds for 8 bars, then BOOM. The drop." },

  { id:32, term:"Build-up", category:"DJ Skills", short:"Tension before the drop",
    level:"Beginner",
    description:"The section where energy accumulates before the drop — rising synths, filter sweeps, drum fills.",
    plain:"A build-up is pure, controlled tension. Elements are added, taken away, and intensified — all leading to the drop. The longer and more effective the build, the more powerful the drop feels.",
    why:"A build-up is a contract with the crowd — something big is coming, hold on. The best DJs know exactly how long to make a crowd wait.",
    listen:"Notice that feeling of anticipation before a drop — hands going up, people leaning forward. That's the build working on you.",
    example:"16 bars of rising filter, removed kick, riser getting louder and louder — then the drop hits." },

  { id:33, term:"Breakdown", category:"DJ Skills", short:"The emotional strip-back",
    level:"Beginner",
    description:"A section where most elements are removed — often just pads and melody — creating emotional contrast.",
    plain:"After an intense section, everything pulls back. The kick is gone. The bass is gone. Just an atmospheric pad breathing in the space. The crowd floats for a moment. This is what makes the subsequent drop hit so hard.",
    why:"Breakdowns are the emotional heart of electronic music. The 2 minutes of pure melody and atmosphere before the machine comes back.",
    listen:"Notice the contrast — from intense, to floating, to intense again. That emotional journey within a single track is the breakdown doing its job.",
    example:"The kick drops out, a pad fades in, the crowd is floating — that's the breakdown." },

  { id:34, term:"Cue Point", category:"DJ Skills", short:"Saved track position",
    level:"Intermediate",
    description:"A bookmarked position in a track that a DJ can jump to instantly.",
    plain:"Imagine bookmarking any moment in a song and jumping to it instantly at the press of a button. DJ software lets you set these cue points anywhere — at the drop, the intro, a key moment.",
    why:"Cue points allow DJs to start tracks at the most impactful moment rather than waiting through long intros.",
    listen:"No audio demo — but if you've seen a DJ press a button and a track suddenly jumps to a specific point, they hit a cue.",
    example:"A DJ sets a cue right before the drop and triggers it at the perfect crowd moment." },

  { id:35, term:"B2B", category:"DJ Skills", short:"Back to Back sets",
    level:"Beginner",
    description:"Two DJs sharing the same decks and alternating tracks — spontaneous, competitive, electric.",
    plain:"One DJ plays a track. Then the other plays the next. They alternate, responding to each other's choices in real time, without planning ahead. It's a live musical conversation between two people who know each other's music deeply.",
    why:"B2B sets are fan favourites because of the spontaneity and chemistry. Two DJs create something neither would create alone.",
    listen:"Next time you are at a festival, notice how a B2B set feels more energetic and unpredictable than a solo set. The DJs are reacting to each other and the crowd feels it.",
    example:"Two DJs on stage together, one mixer, alternating tracks — building off each other's energy." },

  { id:36, term:"Live Set", category:"DJ Skills", short:"Real-time music performance",
    level:"Intermediate",
    description:"An artist creating music live using hardware synths and drum machines — not just playing back finished tracks.",
    plain:"A DJ plays other people's records. A live set performer creates music in front of you. They might have a drum machine running, a synthesizer being played live, an effects unit being twisted. The music doesn't exist anywhere — it's being born in that moment.",
    why:"Live sets represent the highest level of electronic music performance — the artist is creating, not presenting.",
    listen:"Search YouTube for Surgeon live set or Aphex Twin Coachella and watch a performer creating techno in real time.",
    example:"A performer on stage with a TB-303 and TR-909, making music happen in real time — that's a live set." },

  // ══ GENRES ══
  { id:37, term:"Detroit Techno", category:"Genres", short:"The origin", level:"Beginner",
    description:"The original form of techno — born in Detroit, USA in the early 80s/90s. Dark, soulful, mechanical and futuristic.",
    plain:"Three Black teenagers in Detroit — Juan Atkins, Derrick May, Kevin Saunderson — took European electronic music and mixed it with the soul of their city. The result was darker, deeper, and more human than anything before. They called it techno.",
    why:"Detroit Techno is the root of everything. Without it there is no Berlin techno, no psy, no hard techno. All roads lead back to these three men.",
    listen:"Listen for soul inside the machine — melancholic melodies under cold mechanical drums.",
    example:"Deep, melancholic, industrial-sounding techno with soul underneath — the original blueprint." },

  { id:38, term:"Minimal Techno", category:"Genres", short:"Less is more", level:"Intermediate",
    description:"Stripped-back, repetitive techno focused on subtle changes over long durations. Hypnotic and meditative. Berlin.",
    plain:"Imagine a techno track where the drop never really comes. Instead, tiny changes happen every few minutes: a filter opens slightly, a hi-hat appears, the bass shifts 2 Hz. Over 15 minutes you have been taken on a journey you never consciously noticed.",
    why:"Minimal taught electronic music that repetition itself can be the point. Listening to it is closer to meditation than entertainment.",
    listen:"Give it time. The first 2 minutes might seem boring. By minute 8, you might feel a shift. That shift is the point.",
    example:"Ricardo Villalobos — tracks evolving over 10-plus minutes with almost imperceptible changes." },

  { id:39, term:"Hard Techno", category:"Genres", short:"Fast and aggressive", level:"Beginner",
    description:"Faster (140-155 BPM), harder-hitting techno with aggressive kicks and screeching synths.",
    plain:"Techno turned up to 11. The kicks hit harder, the tempo is faster, and the synths scream. It's aggressive and exhausting and exhilarating. The current generation of club culture lives for Hard Techno.",
    why:"Hard Techno is experiencing a massive global revival. SPFDJ, Sara Landry, Alignment — simultaneously underground and festival-sized.",
    listen:"If the kicks make you instinctively flinch and the hi-hats roll so fast they become a blur — that's hard techno.",
    example:"SPFDJ, Alignment — brutal kicks, industrial sounds, relentless energy." },

  { id:40, term:"Industrial Techno", category:"Genres", short:"Factory-floor dark", level:"Intermediate",
    description:"Brutally dark techno that sounds like machinery — harsh metallic textures, distorted kicks, sinister atmospheres.",
    plain:"What if the factory from your nightmares started making music? Industrial techno takes the sound of actual machinery — grinding metal, hydraulic pressure — and turns it into club music.",
    why:"Industrial techno is the darkest corner of the genre — not aggressive like Hard Techno but genuinely menacing.",
    listen:"Listen for metallic sounds that don't sound like traditional instruments. The music might sound like it's breaking.",
    example:"Surgeon, Ancient Methods — sounds like heavy machinery in a dark tunnel." },

  { id:41, term:"Acid Techno", category:"Genres", short:"The squelch genre", level:"Beginner",
    description:"Techno built around the Roland TB-303 acid bassline. Squelchy, bubbling, energetic.",
    plain:"Take Hard Techno and add a rubber duck speaking through a megaphone as the main melody. That speaking, squelching, bubbling TB-303 sound IS acid techno.",
    why:"Acid Techno has a specific sound that does not age — the TB-303 is 40 years old and still sounds like nothing else.",
    listen:"Find the sound that seems to be talking — rising, falling, squelching. Follow that and you have found the acid.",
    example:"That womp womp waah bassline over a hard kick — you have definitely heard this." },

  { id:42, term:"Dub Techno", category:"Genres", short:"Spacious and deep", level:"Intermediate",
    description:"Slow, bass-heavy techno with reggae influences — massive reverb, deep rolling bass, oceanic space.",
    plain:"What if reggae and techno had a baby in an underwater cathedral? Dub Techno is slow, deep, and covered in so much reverb that every sound seems to dissolve into the room.",
    why:"Dub Techno is proof that electronic music can be as emotionally complex as any genre. It sounds like deep space.",
    listen:"Close your eyes. The reverb is so long the sounds float and overlap. It should feel like being in water.",
    example:"Basic Channel, Deepchord — like floating underwater in a Berlin warehouse." },

  { id:43, term:"Psytrance", category:"Genres", short:"Psychedelic trance music", level:"Beginner",
    description:"Electronic music for outdoor festivals — driving basslines, layered psychedelic synths, 138-148 BPM. Born in Goa.",
    plain:"Music designed specifically to be heard in a forest at 4am, surrounded by people in an altered state of consciousness. Fast rolling basslines, complex layered melodies that spiral and evolve, and a tempo that makes your body move without you deciding to.",
    why:"Psytrance is one of the most globally diverse and passionate music communities — on every continent.",
    listen:"The bassline is the star — it moves and evolves throughout the track, almost telling a story.",
    example:"A tribal ceremony in a forest with lasers and a warping synth bassline — that's the psytrance experience." },

  { id:44, term:"Goa Trance", category:"Genres", short:"The original psy", level:"Beginner",
    description:"The precursor to modern psytrance — born on the beaches of Goa, India. More melodic and euphoric.",
    plain:"In the 1980s, hippie travellers arrived on the beaches of Goa and started throwing parties. European and Israeli DJs mixed synth music from Europe with the spiritual energy of India. The result was Goa Trance.",
    why:"Without Goa Trance there is no psytrance. It's the ancestor of the entire psychedelic music movement.",
    listen:"Listen for Eastern musical scales — notes that feel slightly exotic or unfamiliar. There's a strong sense of ascension, almost spiritual.",
    example:"Astral Projection, Man With No Name — melodic, euphoric, spiritual. The origin." },

  { id:45, term:"Full-On Psy", category:"Genres", short:"Peak-hour festival psy", level:"Beginner",
    description:"High-energy psytrance at 143-148 BPM with powerful basslines and uplifting melodies. The festival main floor.",
    plain:"This is what most people picture when they think psytrance — fast, powerful, melodically complex, and energetically intense. Designed for the main stage at noon when the festival is at peak energy.",
    why:"Full-On Psy is the most commercially successful psytrance subgenre and the entry point for most fans.",
    listen:"Notice how many melodic elements are happening simultaneously — two or three arpeggios, a lead melody, the bassline, all interweaving.",
    example:"Infected Mushroom, Ace Ventura — energetic, bright, complex. Festival at peak time." },

  { id:46, term:"Dark Psy", category:"Genres", short:"The night side", level:"Intermediate",
    description:"Darker, more sinister psytrance. Slower but more twisted. Heavy crawling basslines. Played at night.",
    plain:"Psytrance after midnight, in the dark tent at the edge of the festival. Everything is heavier, slower, more twisted. It's not music to feel happy — it's music to go deep.",
    why:"Dark Psy explores the shadow side of the psychedelic experience — introspection, discomfort, confrontation with the unknown.",
    listen:"It should feel slightly uncomfortable. If you feel mild unease and cannot look away — it's doing its job.",
    example:"Being chased through a forest at night by something unseen — that's dark psy." },

  { id:47, term:"Forest Psy", category:"Genres", short:"Organic dark psy", level:"Intermediate",
    description:"Dark psy with organic, earthy textures — nature sounds fused with alien psychedelia.",
    plain:"Dark Psy that feels like it grew from the ground. Forest Psy incorporates natural textures — wood, earth, rustling leaves — into its alien synthesizer landscapes.",
    why:"Forest Psy creates a deeply specific sensory experience — the feeling of being in a living ancient forest that is also somehow made of electronics.",
    listen:"Listen for sounds that feel organic — not quite machine, not quite nature. The space between those two things is Forest Psy.",
    example:"An ancient forest that has come alive and is speaking in synthesized language." },

  { id:48, term:"Hi-Tech / Nitzhonot", category:"Genres", short:"Extreme high BPM psy", level:"Intermediate",
    description:"Ultra-fast psytrance at 160-200-plus BPM. Cartoon-like intensity. Primarily popular in Israel.",
    plain:"Psytrance if someone accidentally pressed fast-forward and left it running. At 175-200 BPM the bass hits so fast it becomes a blur.",
    why:"Hi-Tech is the maximum expression of psy's kinetic energy — speed until the music becomes something else entirely.",
    listen:"At 175 BPM the kicks are so fast they almost feel like a continuous tone rather than individual hits.",
    example:"A rocket ship going through a disco wormhole at maximum speed." },

  { id:49, term:"Progressive Psy", category:"Genres", short:"Smooth, flowing psy", level:"Beginner",
    description:"More melodic, gradual-building psytrance focused on journey and atmosphere. Great for sunrise sets.",
    plain:"Psytrance with patience. Instead of immediately throwing everything at you, Progressive Psy builds slowly — adding elements, building momentum, arriving at peaks that feel earned.",
    why:"Progressive Psy introduced accessibility to psytrance — it's where newcomers often start.",
    listen:"Notice the architecture — layers being added and removed, a sense of journey over 8-10 minutes.",
    example:"Vini Vici, Astrix — builds slowly, peaks feel earned, smooth throughout." },

  { id:50, term:"Schranz", category:"Genres", short:"Grinding loops, no mercy", level:"Intermediate",
    description:"Extremely hard, repetitive German techno. Machine-gun hi-hats, distorted kicks, relentless percussion loops.",
    plain:"Techno with every melodic element removed and the intensity doubled. Nothing but relentless percussion loops layered on top of each other. Named after an Austrian insult.",
    why:"Schranz took minimalism to its logical extreme — strip out everything except the most brutal rhythmic elements.",
    listen:"Notice the absence — no melody, no bassline, almost no identifiable instrument. Just interlocking percussion.",
    example:"Chris Liebing, Stigmata — like being inside a grinding factory that will not stop." },

  { id:51, term:"Melodic Techno", category:"Genres", short:"Emotion over concrete", level:"Beginner",
    description:"Techno with lush harmonic progressions, emotional melodies over driving beats. The Afterlife Records sound.",
    plain:"What if techno could make you cry? Melodic Techno pairs the driving relentless kick of techno with genuinely beautiful, emotionally complex melodies and chords.",
    why:"Melodic Techno brought a new audience to techno — people who love melody and emotion but also want to dance hard.",
    listen:"Notice how the melodies actually affect your emotions — they are designed to create feelings, not just energy.",
    example:"Tale Of Us, Stephan Bodzin — beautiful melody over a driving techno framework." },

  { id:52, term:"Peak Time Techno", category:"Genres", short:"Festival main stage weapon", level:"Beginner",
    description:"Designed for maximum crowd impact — bold structure, explosive drops, massive builds.",
    plain:"This is the techno that 30,000 people lose their minds to simultaneously at a festival. Not complex, not subtle — engineered for one purpose: the drop hitting as hard as physically possible.",
    why:"Peak Time Techno represents techno at its most populist and powerful.",
    listen:"Notice the structure — very clear. Build, drop, groove, build, drop. Designed to be understood instantly by a crowd.",
    example:"Charlotte de Witte, Enrico Sangiuliano — the whole festival raises its hands at the same moment." },

  { id:53, term:"Ambient Techno", category:"Genres", short:"Techno for the mind", level:"Intermediate",
    description:"Blends atmospheric ambient music with techno's rhythmic skeleton. Slower, introspective, immersive.",
    plain:"What if techno slowed down, sat in an armchair, and started thinking? Ambient Techno keeps the rhythmic discipline of techno but opens it into vast atmospheric spaces.",
    why:"Ambient Techno showed that electronic music does not need to be in a club to be powerful — it can be deeply personal headphone music.",
    listen:"Close your eyes. The music should feel like a landscape — something you could walk around inside.",
    example:"Aphex Twin, The Orb, Biosphere — electronic music for dreaming rather than dancing." },

  { id:54, term:"Bleep Techno", category:"Genres", short:"UK's first techno sound", level:"Intermediate",
    description:"The first distinctly British techno style — born in Yorkshire. High-pitched bleeps over massive sub-bass.",
    plain:"Late 80s Yorkshire invented its own techno — massive sub-bass kicks combined with piercing high-pitched bleep synth sounds. Stark, minimal, and completely unlike American techno.",
    why:"Bleep Techno is historically crucial — it proved that techno could evolve in different directions in different cultures.",
    listen:"Notice the contrast — the lowest possible kick combined with the highest possible synth bleeps.",
    example:"Warp Records early output — maximum contrast between sub-bass and high bleeps." },

  { id:55, term:"Gabber", category:"Genres", short:"Dutch hardcore extremism", level:"Beginner",
    description:"Born in Rotterdam in the early 90s. Insanely fast, heavily distorted kicks, aggressively energetic.",
    plain:"What happens when you take a techno kick, distort it beyond recognition, speed the whole thing up to 200 BPM, and fill the dancefloor with people in tracksuits doing a jumping dance? Gabber. It sounds like a joke but has a massive passionate global fanbase.",
    why:"Gabber is proof that electronic music can be completely ridiculous and completely sincere at the same time.",
    listen:"At 185 BPM the individual kicks are so fast they almost blur together.",
    example:"The sound of a photocopier having a breakdown — but it makes 2000 people jump in unison." },

  { id:56, term:"Hypnotic Techno", category:"Genres", short:"Trance-inducing repetition", level:"Intermediate",
    description:"Extremely repetitive, minimalist techno designed to induce an almost trance-like state.",
    plain:"Techno so minimal and repetitive that it becomes meditative. The same pattern for 15 minutes with tiny barely perceptible variations. Your conscious mind gives up. Your body takes over. This is intentional.",
    why:"Hypnotic Techno explores the same psychological mechanism as mantras in meditation — repetition until the analytical mind quietens.",
    listen:"Give it 5 minutes. The first 2 will feel boring. After 5, you might feel a shift. That shift is the point.",
    example:"DJ Stingray, Shifted — the same loop for 15 minutes, but you're in a different state by the end." },

  { id:57, term:"Dark Techno", category:"Genres", short:"Sinister and haunting", level:"Beginner",
    description:"Techno in the shadows — ominous basslines, eerie atmospheres, unsettling frequencies.",
    plain:"Techno with all the light taken out. Dark Techno creates genuine unease — ominous low frequencies, dissonant synth textures, basslines that feel like they're circling you.",
    why:"Dark Techno occupies the emotional space between fear and awe — something genuinely unsettling that you choose not to escape from.",
    listen:"Notice how the synth textures create emotional discomfort. That is intentional sound design.",
    example:"Walking through an abandoned building at night while a machine hums in the walls." },

  { id:58, term:"EBM", category:"Genres", short:"Electronic Body Music", level:"Intermediate",
    description:"Born in Belgium in the 80s — driving march-like electronic music. Ancestor of industrial dance.",
    plain:"Before techno was techno, Belgium invented Electronic Body Music — cold, industrial, driving music that sounded like a military march made by robots. Front 242, Nitzer Ebb.",
    why:"EBM is the grandfather of industrial techno, hard techno, and the darkest electronic music. Its DNA runs through all of it.",
    listen:"Notice the march-like quality — very regular, military, relentless. The bass stabs are the main melody.",
    example:"Front 242 — cold, powerful, makes you want to march. The original aggressive electronic music." },

  { id:59, term:"Freetekno", category:"Genres", short:"Raw DIY free party sound", level:"Beginner",
    description:"The techno of Europe's free party movement — no venues, no money, no rules. Raw, fast, anarchic.",
    plain:"In the 90s, sound systems would set up in fields, warehouses, and under motorway bridges and throw illegal free raves. The music made for these parties was Freetekno — rough, fast, raw, and uncompromising.",
    why:"Freetekno represents the original DIY ethos of rave culture — music completely outside commercial structures.",
    listen:"It sounds deliberately unpolished — rough edges, raw production. That's not a mistake, it's the aesthetic.",
    example:"Techno made at 3am in a field with no electricity and no laws — raw, fast, free." },

  { id:60, term:"Twilight Psy", category:"Genres", short:"Dark Full-On — dusk energy", level:"Intermediate",
    description:"The darker, heavier twin of Full-On — same energy but sinister basslines and menacing design.",
    plain:"Full-On Psy in the late afternoon as the sun starts to set and the mood shifts. Everything gets heavier and darker. Same driving basslines and festival energy but with a shadow cast over them.",
    why:"Twilight Psy sits at the perfect intersection of accessible festival psy and darker underground sounds.",
    listen:"Notice how it has the same energy as Full-On but the emotional tone is different — more tense, less euphoric.",
    example:"Full-On energy but the sun has gone down and something in the forest is watching you." },

  { id:61, term:"Suomi Psy", category:"Genres", short:"Finnish Sound — free and funky", level:"Advanced",
    description:"The experimental, free-form Finnish subgenre. Melodic, quirky, funky — borrows from anything.",
    plain:"Finland invented the most eccentric branch of psytrance. Suomisaundi has no rules — tracks can suddenly go weird, funny, melodic, or completely unexpected. Texas Faggott is the defining artist.",
    why:"Suomi is the experimental laboratory of psytrance — anything is possible, seriousness is optional.",
    listen:"If it suddenly sounds like something completely out of place and then snaps back to psy basslines — that's Suomi.",
    example:"Texas Faggott — like aliens discovered an 80s keyboard and lost their minds." },

  { id:62, term:"Zenonesque", category:"Genres", short:"Minimal Psy", level:"Advanced",
    description:"Stripped-back, introspective psytrance. Heavily reverbed, slowly evolving. Named after Zenon Records.",
    plain:"Minimal techno's closest cousin in the psy world. Very stripped back, lots of space, heavy reverb, slow evolution. Patience required.",
    why:"Zenonesque brought the Berlin minimal aesthetic to psytrance — making the genre accessible to people who liked depth over intensity.",
    listen:"Give it 5 minutes. There is much less happening than any other psy subgenre — the space is intentional.",
    example:"Zenon Records artists — minimal psy that demands patience and rewards it." },

  { id:63, term:"Psybient", category:"Genres", short:"Psychedelic ambient and chill", level:"Beginner",
    description:"Downtempo psychedelic ambient — slow, meditative, designed for deep relaxation.",
    plain:"What psytrance sounds like when you need to sleep after a festival. Slow, beautiful, atmospheric psychedelic music. No dancefloor required. Shpongle invented a sound that blended world music, psychedelia, and electronic ambience.",
    why:"Psybient is proof that the psychedelic music world encompasses more than dancefloors.",
    listen:"Let the music surround you. It should feel like the inside of a cathedral made of sound.",
    example:"Shpongle, Carbon Based Lifeforms — the music for staring at stars after a festival." },

  { id:64, term:"Tribal Psy", category:"Genres", short:"Triplet basslines and primal energy", level:"Intermediate",
    description:"Triplet-pattern basslines, ethnic vocal samples, and a ritual primal quality. Vini Vici's signature.",
    plain:"Psytrance that sounds like an ancient tribal ceremony got access to modern synthesizers. The basslines follow triplet rhythms creating a rocking, swaying motion. Add chanting vocal samples and you have music that feels genuinely ancient.",
    why:"Tribal Psy reconnects the psychedelic music scene to its actual cultural roots — the ritual use of music in ancient societies.",
    listen:"Notice the bassline does not fall on exactly every quarter beat — it has a rolling three-note triplet feel.",
    example:"Vini Vici — the entire crowd raises their hands like a collective ritual." },

  { id:65, term:"Psycore", category:"Genres", short:"Psy meets hardcore", level:"Advanced",
    description:"Fusion of psytrance and hardcore — psychedelic basslines and sound design at extreme BPMs.",
    plain:"Someone decided that psytrance was not fast or intense enough and mixed it with gabber. The result is the most extreme version of either genre — psychedelic sound design at hardcore BPMs.",
    why:"Psycore occupies an extreme niche — too fast for psy ravers and too psychedelic for hardcore ravers. Deeply devoted cult audience.",
    listen:"It should feel genuinely overwhelming. If you are slightly alarmed, it's working.",
    example:"Psytrance had a baby with gabber — screaming at 175 BPM." },

  { id:66, term:"Neogoa", category:"Genres", short:"Modern Goa revival", level:"Intermediate",
    description:"A modern revival of classic Goa Trance aesthetics with contemporary production quality.",
    plain:"Musicians who grew up on Goa Trance decided to recreate that sound with better studio tools. Same spiraling melodies and Eastern influences — but with the clarity and power of modern production.",
    why:"Neogoa proved that the Goa Trance sound is not just nostalgia — it's a genuinely distinctive aesthetic that holds up in any era.",
    listen:"If it sounds like 1990s Goa trance but cleaner and more precise, that's Neogoa.",
    example:"Filteria, Sundial Aeon — Goa recreated for modern ears and sound systems." },

  { id:67, term:"Psychedelic Techno", category:"Genres", short:"PsyTech — the bridge genre", level:"Intermediate",
    description:"A hybrid — techno's minimal structure with psytrance's rolling basslines and psychedelic sound design.",
    plain:"What if psy ravers and techno ravers could love the same track? Psychedelic Techno sits exactly between both worlds — minimal and driving like techno, but with that rolling bassline and psychedelic movement of psy.",
    why:"Psychedelic Techno created a bridge between two massive scenes that rarely crossed.",
    listen:"Notice both the techno structure — minimal, sparse, no big melodies — and the psy character — rolling bass, psychedelic FX.",
    example:"Extrawelt, D-Nox — psy basslines inside a techno framework." },

  { id:68, term:"Hard Groove", category:"Genres", short:"Techno that hits the hips", level:"Intermediate",
    description:"Mid-90s genre defined by shuffling percussion, dense polyrhythms, and soulful swing.",
    plain:"The most danceable techno ever made. Hard Groove makes you move differently to any other genre — not forward aggression, but hip movement, a strut. Fast and raw but with a funky soul underneath.",
    why:"Hard Groove's current revival led by Regal86, 1Morning, Elisa Bee is one of the most exciting things happening in underground techno.",
    listen:"Notice how the hi-hats swing — they do not land perfectly on the grid. That swung feel is why it makes you move differently.",
    example:"Ben Sims, Regal86 — hard, fast, but your hips move before your brain decides to." },

  { id:69, term:"Hard Bounce", category:"Genres", short:"Bouncy Euro rave energy", level:"Beginner",
    description:"Fast, punchy, built for peak-time sets. Stomping 4/4 kicks with a characteristic double-hit bounce.",
    plain:"What happens when UK hard house and European rave culture make a track together at 155 BPM. Very punchy and energetic, with a double-hit kick that creates that bouncing character.",
    why:"Hard Bounce is the accessible face of fast techno — less conceptual than industrial, more instantly physical.",
    listen:"Notice the kick feels like it bounces — there is a follow-up hit just after the main kick creating a bum-dum bum-dum pattern.",
    example:"The crowd jumping in unison to that double-hit kick — that's Hard Bounce." },

  { id:70, term:"Progressive Techno", category:"Genres", short:"Structured builds, evolving journey", level:"Beginner",
    description:"Techno built with progressive architecture — long build-ups, clear breakdowns, evolving layers.",
    plain:"Techno for people who love journey. Progressive Techno is patient — it builds over 10 minutes, earning each new element before adding the next.",
    why:"Progressive Techno is often the entry point for new techno fans — its clear structure is easier to follow than more abstract underground styles.",
    listen:"Notice the architecture — each section clearly leads into the next. There is a narrative you can follow.",
    example:"A track that builds tension for 4 minutes before a drop that feels truly earned." },

  // ══ NEW DJ SKILLS ══
  { id:76, term:"Loop", category:"DJ Skills", short:"Repeating a section perfectly",
    level:"Beginner",
    description:"Locking a section of a track into a seamless, endless repeat. Modern CDJs can loop any 1, 2, 4, 8, or 16-bar section with a single button press.",
    plain:"Imagine pressing pause and rewind on exactly the same half-second every time, perfectly in time, forever. That's a loop. DJs use it to extend an intro, hold a breakdown longer for crowd tension, or create space while they search for the next track.",
    why:"Loops are the DJ's safety net and creative weapon simultaneously. If you're not ready to mix, loop the track and buy yourself time. If a section is working on the dancefloor, loop it and milk the moment.",
    listen:"At a club, if you notice a section repeating identically with no variation — especially a breakdown vocal or a rising riser going forever — the DJ has looped it. Loops are usually invisible to the crowd, which is the whole point.",
    example:"A 4-bar loop of a breakdown held for 2 minutes while 2000 people wait for the drop — peak crowd tension." },

  { id:77, term:"Filter Sweep", category:"DJ Skills", short:"Dramatic tension with one knob",
    level:"Beginner",
    description:"Slowly closing a filter over a build-up section, then snapping it open at the drop. The most reliable crowd technique in DJing.",
    plain:"Turn the filter knob gradually from open to nearly closed over 16-32 bars — the track gets darker and more muffled as the highs disappear. The crowd feels it building. Then at the drop, snap it fully open. The rush of full sound hitting all at once is one of the most physical sensations in club music.",
    why:"Filter sweeps work because they manipulate anticipation. The crowd hears the track getting muffled and their brains fill in what's missing — making the eventual release feel like something ADDED rather than just restored.",
    listen:"Listen for a track that seems to progressively lose its brightness over a build. When the drop hits and all the crisp high frequencies flood back — that's a filter sweep release.",
    example:"16 bars of a track getting progressively darker, then the full bright sound crashes back at the drop." },

  { id:78, term:"Crossfader", category:"DJ Skills", short:"The iconic middle slider",
    level:"Beginner",
    description:"The horizontal fader at the center of a DJ mixer that blends between Deck A (left) and Deck B (right).",
    plain:"Slide it left = only hear Deck A. Slide it right = only hear Deck B. Keep it in the center = both playing equally. It's the most visually dramatic control on any mixer — scratch DJs flick it at rapid speed to cut between tracks.",
    why:"For club DJs, the crossfader often stays in the center and volume faders are used instead. For hip-hop and turntablism, the crossfader is everything — the speed and style of crossfader movements IS the performance.",
    listen:"In the DJ Booth below, try sliding the crossfader fully left and right while both decks are playing. Hear how one deck completely disappears. That sharp transition is the crossfader at its extreme.",
    example:"A scratch DJ snapping the crossfader back and forth creates the 'chi-ki-chi-ki' sound of scratching." },

  { id:79, term:"Gain / Trim", category:"DJ Skills", short:"Input level before the mix",
    level:"Intermediate",
    description:"Controls the incoming signal level of each channel before the EQ and faders. Sets the 'loudness' of a track before it enters the signal chain.",
    plain:"Every track is recorded at a slightly different level. Some are louder, some quieter. Gain/Trim is how you equalize them before mixing — turning up quiet tracks and turning down hot ones so every track enters the mixer at the same level. Without it, every track change would sound like a volume jump.",
    why:"Proper gain structure is the foundation of clean DJing. If gain is too high, the signal clips (distorts). Too low and the mix sounds weak. Getting gain staging right is what separates technically clean DJs from messy ones.",
    listen:"On professional DJ mixers, there's a VU meter (volume indicator) per channel. Ideal gain keeps the meter hitting -6dB to 0dB on loud sections — never into the red clip zone.",
    example:"A quiet techno intro needs its gain turned up so the first kick hits the same level as the previous track's kick." },

  { id:80, term:"Key Lock", category:"DJ Skills", short:"Speed without pitch shift",
    level:"Intermediate",
    description:"Keeps the musical pitch of a track constant when you adjust the tempo with the pitch fader. Also called Master Tempo.",
    plain:"Without Key Lock: slow down a track and it sounds like a deeper, lower version (like playing vinyl at the wrong speed). With Key Lock: slow it down and it's still in the same key — just slower. DJs use this constantly so tracks don't sound out of tune after beatmatching.",
    why:"Key Lock means a DJ can beatmatch tracks at very different BPMs (say 140 to 134) without the track sounding like it's being played in the wrong key. Modern CDJs and DJ software do this with timestretching algorithms.",
    listen:"Disable key lock and push the pitch fader significantly — hear the track get lower in pitch. Enable key lock and do the same — same tempo change but pitch stays constant. The algorithm doing that 'magic' is timestretching.",
    example:"Slowing a track from 140 to 134 BPM with Key Lock — it plays 4% slower but still sounds in the same key." },

  { id:81, term:"Phrase Mixing", category:"DJ Skills", short:"Mixing at the right musical moment",
    level:"Intermediate",
    description:"Bringing in a new track exactly at the start of an 8 or 16-bar phrase — so both tracks' structures align, not just their beats.",
    plain:"Two tracks can be perfectly beatmatched (kicks in time) but still sound wrong if they don't align musically. If Track A is in the middle of a build and Track B is at the start of a groove section, they fight each other. Phrase mixing means waiting for the right 8 or 16-bar boundary before making the transition.",
    why:"Phrase mixing is the difference between a technically competent DJ and a musically intelligent one. Beatmatching gets the kicks in time. Phrase mixing gets the structures in time.",
    listen:"Notice in club sets when a new track seems to 'arrive' at exactly the right moment — no confusion, instant clarity. The DJ waited for the phrase boundary. When a mix sounds clunky even though the beats are in time, the phrases weren't matched.",
    example:"Waiting for the 16-bar build on Track A to complete before bringing in Track B at its own beginning." },

  { id:82, term:"Harmonic Mixing", category:"DJ Skills", short:"Mixing in musical key",
    level:"Advanced",
    description:"Selecting tracks that are in musically compatible keys so they blend without clashing harmonically. Uses the Camelot Wheel system.",
    plain:"Every track is in a musical key (A minor, C major etc.). Mix two tracks in clashing keys and the basslines and synths fight each other horribly — even if the BPMs are perfectly matched. Harmonic mixing means only mixing tracks in the same key or compatible adjacent keys.",
    why:"Harmonic mixing is why some DJ sets sound like one continuous emotional journey while others sound like a random collection of tracks. Mixed Keys (software) and Rekordbox both detect and display the key of every track.",
    listen:"Two techno tracks at 140 BPM in clashing keys: the basslines create dissonance and the mix sounds off even when the kicks are perfectly aligned. In the same key: the basslines complement each other and the transition is seamless.",
    example:"The Camelot Wheel: 8A → 9A → 8B → 7A are all compatible. Moving more than 2 steps on the wheel risks harmonic clash." },

  { id:83, term:"EQ Kill", category:"DJ Skills", short:"Completely removing a frequency band",
    level:"Beginner",
    description:"Turning an EQ band completely off — to zero — removing that frequency entirely from the mix.",
    plain:"A kill isn't just turning a knob down — it's removing something completely. Kill the lows on the outgoing track = zero bass, just the mids and highs. The incoming track then brings in its own bass cleanly. This EQ kill technique is the most fundamental DJ transition skill — used in every single mix.",
    why:"Two kick drums at the same time = muddy disaster. One kick drum at a time = clarity and power. EQ kills make this possible without stopping either track.",
    listen:"In the DJ Booth, while both decks are playing, turn the LOW EQ on one deck all the way down to minimum. Hear how the bass completely disappears from that channel? Now there's only one kick drum in the mix. That's an EQ kill — used in every professional mix.",
    example:"Drop A's bass completely while raising B. B's kick enters the mix alone. Then gradually bring A's bass back in over 4 bars." },

];

const bpmRanges = [
  { genre:"Psybient", min:85, max:120, color:"#e1bee7", desc:"Deep chill, meditative" },
  { genre:"Ambient Techno", min:110, max:125, color:"#80cbc4", desc:"Atmospheric, dreamlike" },
  { genre:"Dub Techno", min:120, max:128, color:"#4dd0e1", desc:"Deep, oceanic, minimal" },
  { genre:"EBM", min:118, max:135, color:"#ef9a9a", desc:"Body-driving, march-like" },
  { genre:"Melodic Techno", min:123, max:132, color:"#ce93d8", desc:"Emotional, lush, Afterlife" },
  { genre:"Minimal Techno", min:128, max:135, color:"#80deea", desc:"Hypnotic, subtle, Berlin" },
  { genre:"Hypnotic Techno", min:128, max:138, color:"#7986cb", desc:"Repetitive, trance-inducing" },
  { genre:"Bleep Techno", min:125, max:135, color:"#80d8ff", desc:"UK bleeps, sub-bass" },
  { genre:"Techno", min:130, max:145, color:"#1de9b6", desc:"The classic range" },
  { genre:"Dark Techno", min:130, max:145, color:"#78909c", desc:"Sinister, haunting" },
  { genre:"Progressive Techno", min:130, max:140, color:"#80cbc4", desc:"Structured builds, evolving layers" },
  { genre:"Hard Groove", min:130, max:140, color:"#a1887f", desc:"Swing, funk, groovy percussion" },
  { genre:"Hard Bounce", min:148, max:165, color:"#ff8a65", desc:"Bouncy double-kick, Euro rave" },
  { genre:"Zenonesque", min:136, max:144, color:"#b2dfdb", desc:"Minimal psy, introspective" },
  { genre:"Psychedelic Techno", min:133, max:143, color:"#f06292", desc:"PsyTech hybrid" },
  { genre:"Schranz", min:135, max:150, color:"#b0bec5", desc:"Grinding, relentless loops" },
  { genre:"Neogoa", min:140, max:148, color:"#ffd54f", desc:"Modern Goa revival" },
  { genre:"Psytrance", min:138, max:148, color:"#b39ddb", desc:"Festival energy" },
  { genre:"Tribal Psy", min:140, max:148, color:"#ffcc80", desc:"Triplet basslines, primal" },
  { genre:"Full-On Psy", min:143, max:150, color:"#aed581", desc:"Peak hour intensity" },
  { genre:"Twilight Psy", min:144, max:152, color:"#ff7043", desc:"Dark full-on, dusk vibes" },
  { genre:"Peak Time Techno", min:140, max:148, color:"#ffca28", desc:"Festival main stage" },
  { genre:"Hard Techno", min:140, max:158, color:"#ff6d00", desc:"Aggressive, industrial" },
  { genre:"Suomi Psy", min:145, max:158, color:"#69f0ae", desc:"Finnish, quirky, free-form" },
  { genre:"Dark Psy", min:148, max:162, color:"#ef5350", desc:"Night side, sinister" },
  { genre:"Forest Psy", min:148, max:162, color:"#a5d6a7", desc:"Organic, earthy, alive" },
  { genre:"Freetekno", min:148, max:180, color:"#ffab40", desc:"Raw, DIY, anarchic" },
  { genre:"Psycore", min:165, max:190, color:"#e040fb", desc:"Psy + hardcore fusion" },
  { genre:"Hi-Tech Psy", min:165, max:220, color:"#ff5252", desc:"Extreme, over the top" },
  { genre:"Gabber", min:160, max:220, color:"#ff1744", desc:"Distorted Dutch hardcore" },
];

const categories = ["All","Rhythm","Sound Design","Production","DJ Skills","Genres"];
const categoryColors = { "Rhythm":"#ff6b6b","Sound Design":"#4ecdc4","Production":"#ffe66d","DJ Skills":"#a8e6cf","Genres":"#c678ff" };

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════
// DJ BOOTH — Fully functional 2-deck mixer
// ═══════════════════════════════════════════════════════════════

const DJ_INFO = {
  play:        { title:"▶ PLAY / PAUSE", emoji:"▶", body:"Starts or stops the deck. In a real set, you never stop a deck mid-mix — you pre-cue the incoming track in headphones, then press play when you're ready to blend.", tip:"Hold CUE while paused to preview the track in headphones without it going to the speakers or PA." },
  cue:         { title:"CUE — Return to Start", emoji:"🔲", body:"Returns the track to the beginning (or a saved cue point). Used to reset a track you're previewing in headphones, or to catch back to the intro if you loaded the wrong track.", tip:"On CDJs, you can set cue points anywhere — at the drop, at phrase boundaries, at key moments. Press CUE to jump there instantly." },
  platter:     { title:"THE PLATTER / JOG WHEEL", emoji:"⭕", body:"The spinning disc on CDJs and turntables. Touch the outer rim to nudge the tempo up/down for beatmatching. Touch the top surface to scratch or hold the track. The groove lines rotate at the actual BPM.", tip:"Real vinyl spins at 33⅓ RPM — which happens to be almost exactly one revolution per bar at 140 BPM. That's not a coincidence — early techno producers made music to match the physical record." },
  trackSelect: { title:"TRACK SELECT", emoji:"🎵", body:"In real DJing, this is your music library — potentially 50,000+ tracks. Knowing your library deeply is a foundational skill. You need to know each track's BPM, musical key, energy level, and which tracks it blends well with.", tip:"Most professional DJs use Rekordbox (for CDJs) or Serato/Traktor (for controllers) to organize, tag, and manage their libraries. A well-organized library makes live decisions faster." },
  pitch:       { title:"PITCH / TEMPO FADER", emoji:"↔️", body:"Speeds up or slows down the track by ±8%. Used for beatmatching — if Deck A is at 138 BPM and Deck B is at 140, push Deck B's fader down slightly to bring it to 138 so the kicks lock together.", tip:"Key Lock (Master Tempo) keeps the musical pitch constant as you change speed. Without it, slowing a track down also makes it lower in pitch — like playing vinyl at the wrong RPM." },
  bpm:         { title:"BPM DISPLAY", emoji:"🔢", body:"Shows the current tempo in Beats Per Minute, updated in real time as you adjust the pitch fader. Matching the BPM of both decks is Step 1 of beatmatching.", tip:"Professional DJs learn to beatmatch entirely by ear — listening to whether the kicks are aligned or drifting, and correcting by feel. The BPM display is a visual aid, not a crutch." },
  eqHigh:      { title:"HIGH EQ", emoji:"🔆", body:"Controls the high frequencies — cymbals, hi-hats, the 'air' and brightness of a track (roughly 3.5kHz and above). Fully CW = +12dB boost. Center = no change. Fully CCW = completely killed (cut to -40dB).", tip:"Technique: Cut the highs on the incoming track while it blends in. Once it's fully in the mix, gradually open the highs back up. This creates a smoother entry than throwing a full-frequency track straight in." },
  eqMid:       { title:"MID EQ", emoji:"🎛️", body:"Controls the mid frequencies — where most melody, synths, and vocal content lives (roughly 200Hz–3.5kHz). The mids carry most of the 'character' and 'personality' of any track.", tip:"Classic technique: Cut the mids on BOTH tracks simultaneously during a transition — creating a momentary breakdown feel where neither track has its melodic content. Then gradually bring up only the incoming track's mids." },
  eqLow:       { title:"LOW EQ — THE MOST IMPORTANT", emoji:"🔊", body:"Controls the bass and kick drum frequencies (roughly 20–250Hz). This is the single most critical EQ for DJs. Two kick drums playing simultaneously = muddy, booming disaster. CUT THIS completely on one deck before bringing in another track's bass.", tip:"The fundamental DJ technique: Bring Track B in with its lows killed. Play both tracks together. Then slowly fade out Track A's lows while bringing up Track B's lows — a smooth bass handoff. Try it with the two decks below." },
  filter:      { title:"FILTER — Most Dramatic Control", emoji:"🌊", body:"A low-pass filter — sweeping it left progressively removes the high frequencies until only the low bass hum remains. Snap it fully right and the full bright sound floods back instantly.", tip:"The drop filter technique: Slowly sweep the filter left over 16–32 bars during the build. The crowd hears it getting darker. At exactly the right moment, snap it fully open. The rush of sound hitting all at once is one of the most physical crowd reactions in club music." },
  vol:         { title:"CHANNEL FADER (VOLUME)", emoji:"📊", body:"Controls the output level of this deck, after the EQ has shaped the sound. Different from EQ — fader controls overall volume, not tone. Used for smooth fade-ins and fade-outs.", tip:"Many club DJs prefer using channel faders over the crossfader for mixing — they give independent control over each deck. The crossfader is more common for scratch DJs and hip-hop DJs." },
  xfade:       { title:"CROSSFADER", emoji:"⬅️➡️", body:"Slides between Deck A (left) and Deck B (right). Center = both decks playing equally. All the way left = only Deck A. All the way right = only Deck B. This is the most visually iconic control in DJing.", tip:"Club DJs often leave the crossfader centered and use channel faders instead. Scratch and hip-hop DJs use the crossfader constantly — the speed of crossfader movements IS the performance. The crossfader curve (how quickly it fades) is adjustable on professional mixers." },
};

// ── Knob SVG component ──────────────────────────────────────────
function DJKnob({ value, onChange, onPick, id, label, color='#00ffcc' }) {
  const polar = (deg) => {
    const r = (deg - 90) * Math.PI / 180;
    return [20 + 13 * Math.cos(r), 20 + 13 * Math.sin(r)];
  };
  const arc = (a1, a2) => {
    const [sx, sy] = polar(a1); const [ex, ey] = polar(a2);
    const lg = (a2 - a1 > 180) ? 1 : 0;
    return `M ${sx.toFixed(2)} ${sy.toFixed(2)} A 13 13 0 ${lg} 1 ${ex.toFixed(2)} ${ey.toFixed(2)}`;
  };
  const angle = -135 + value * 270;
  const [dx, dy] = polar(angle);

  const handleMouseDown = (e) => {
    e.preventDefault(); e.stopPropagation();
    const sy = e.clientY, sv = value;
    const mv = (e) => onChange(Math.max(0, Math.min(1, sv + (sy - e.clientY) / 140)));
    const up = () => { document.removeEventListener('mousemove', mv); document.removeEventListener('mouseup', up); };
    document.addEventListener('mousemove', mv); document.addEventListener('mouseup', up);
  };

  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:3, cursor:'pointer', userSelect:'none' }}
      onClick={() => onPick(id)}>
      <svg width={40} height={40} style={{ cursor:'ns-resize', display:'block' }} onMouseDown={handleMouseDown}>
        <circle cx={20} cy={20} r={18} fill='#0d0d10' stroke='#1e1e26' strokeWidth={1.5} />
        <path d={arc(-135, 135)} fill='none' stroke='#252530' strokeWidth={3} strokeLinecap='round' />
        {value > 0.01 && <path d={arc(-135, angle)} fill='none' stroke={color} strokeWidth={3} strokeLinecap='round' opacity={0.8} />}
        <circle cx={20} cy={20} r={9} fill='#1a1a22' />
        <line x1={20} y1={20} x2={dx.toFixed(2)} y2={dy.toFixed(2)} stroke={color} strokeWidth={2} />
        <circle cx={dx.toFixed(2)} cy={dy.toFixed(2)} r={2.5} fill={color} />
      </svg>
      <div style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:8, color:'#555', letterSpacing:1, textTransform:'uppercase', textAlign:'center' }}>{label}</div>
    </div>
  );
}

// ── Platter component ───────────────────────────────────────────
function Platter({ playing, bpm, size=150 }) {
  const period = bpm > 0 ? (240 / bpm).toFixed(3) : '2';
  const c = size / 2;
  return (
    <div style={{ width:size, height:size, borderRadius:'50%', position:'relative',
      animation: playing ? `spin ${period}s linear infinite` : 'none',
      boxShadow: playing ? `0 0 20px #00ffcc22, inset 0 0 20px #00000066` : 'none',
      transition:'box-shadow 0.3s' }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={c} cy={c} r={c-1} fill='#090910' stroke='#1a1a2a' strokeWidth={1.5} />
        {[c-6,c-14,c-22,c-30,c-38,c-44,c-50,c-56].map((r,i) => (
          <circle key={i} cx={c} cy={c} r={r} fill='none' stroke='#16161f' strokeWidth={0.8} />
        ))}
        <circle cx={c} cy={c} r={24} fill='#111118' stroke='#1e1e2a' strokeWidth={1} />
        <text x={c} y={c+1} textAnchor='middle' dominantBaseline='middle'
          style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:10, fill:'#333', letterSpacing:2 }}>
          {playing ? bpm : '◼'}
        </text>
        <circle cx={c} cy={c} r={3} fill='#252530' />
        <circle cx={c} cy={c} r={1.5} fill='#0a0a10' />
        <line x1={c} y1={c-24} x2={c} y2={c-c+4} stroke='#1e1e2a' strokeWidth={1} />
      </svg>
    </div>
  );
}

// ── DJ Booth component ──────────────────────────────────────────
function DJBooth() {
  const isMobile = useIsMobile();
  const [dA, setDA] = useState({ genre:'Detroit Techno', pitch:0, playing:false });
  const [dB, setDB] = useState({ genre:'Psytrance', pitch:0, playing:false });
  const [mx, setMx] = useState({ aH:0.5,aM:0.5,aL:0.5,aF:1,aV:0.8, bH:0.5,bM:0.5,bL:0.5,bF:1,bV:0.8, xf:0.5 });
  const [info, setInfo] = useState('crossfader');

  // Audio refs
  const ctxR = useRef(null);
  const cA = useRef(null); const cB = useRef(null);
  const scA = useRef(null); const scB = useRef(null);
  const stA = useRef(0); const stB = useRef(0);
  const ntA = useRef(0); const ntB = useRef(0);
  const ptA = useRef(0); const ptB = useRef(0);
  const mxR = useRef(mx);

  useEffect(() => { mxR.current = mx; }, [mx]);
  useEffect(() => { ptA.current = dA.pitch; }, [dA.pitch]);
  useEffect(() => { ptB.current = dB.pitch; }, [dB.pitch]);

  const initCtx = () => {
    if (!ctxR.current) {
      ctxR.current = new (window.AudioContext || window.webkitAudioContext)();
      cA.current = makeChain(ctxR.current);
      cB.current = makeChain(ctxR.current);
      applyAll(mx, cA.current, cB.current);
    }
    if (ctxR.current.state === 'suspended') ctxR.current.resume();
    return ctxR.current;
  };

  const makeChain = (ctx) => {
    const eqH = ctx.createBiquadFilter(); eqH.type='highshelf'; eqH.frequency.value=3500;
    const eqM = ctx.createBiquadFilter(); eqM.type='peaking'; eqM.frequency.value=1000; eqM.Q.value=1.4;
    const eqL = ctx.createBiquadFilter(); eqL.type='lowshelf'; eqL.frequency.value=250;
    const flt = ctx.createBiquadFilter(); flt.type='lowpass'; flt.frequency.value=20000; flt.Q.value=1.8;
    const vol = ctx.createGain(); vol.gain.value=0.8;
    const xfg = ctx.createGain(); xfg.gain.value=1;
    eqH.connect(eqM); eqM.connect(eqL); eqL.connect(flt); flt.connect(vol); vol.connect(xfg); xfg.connect(ctx.destination);
    return { eqH, eqM, eqL, flt, vol, xfg };
  };

  const k2g = (v) => v < 0.5 ? -40*(1-v*2) : 12*(v-0.5)*2; // knob → dB gain
  const k2f = (v) => v >= 0.99 ? 20000 : 150 + 19850*Math.pow(v, 2.5); // knob → filter freq

  const applyChain = (chain, h, m, l, f, v) => {
    if (!chain) return;
    chain.eqH.gain.value = k2g(h);
    chain.eqM.gain.value = k2g(m);
    chain.eqL.gain.value = k2g(l);
    chain.flt.frequency.value = k2f(f);
    chain.vol.gain.value = v;
  };

  const applyXfade = (xf) => {
    if (cA.current) cA.current.xfg.gain.value = Math.min(1, 2*(1-xf));
    if (cB.current) cB.current.xfg.gain.value = Math.min(1, 2*xf);
  };

  const applyAll = (m, chA, chB) => {
    if (chA) applyChain(chA, m.aH, m.aM, m.aL, m.aF, m.aV);
    if (chB) applyChain(chB, m.bH, m.bM, m.bL, m.bF, m.bV);
    const xf = m.xf;
    if (chA) chA.xfg.gain.value = Math.min(1, 2*(1-xf));
    if (chB) chB.xfg.gain.value = Math.min(1, 2*xf);
  };

  const updateMx = (key, val) => {
    const nm = {...mxR.current, [key]:val};
    setMx(nm);
    if (!cA.current) return;
    if (key === 'xf') { applyXfade(val); return; }
    const isA = key.startsWith('a');
    const ch = isA ? cA.current : cB.current;
    const m = nm;
    if (isA) applyChain(ch, m.aH, m.aM, m.aL, m.aF, m.aV);
    else     applyChain(ch, m.bH, m.bM, m.bL, m.bF, m.bV);
  };

  const startDeck = (id, genre, pitchRef) => {
    const ctx = initCtx();
    const audio = getAudio(genre);
    if (!audio) return;
    const chain = id==='A' ? cA.current : cB.current;
    const st = id==='A' ? stA : stB;
    const nt = id==='A' ? ntA : ntB;
    const sc = id==='A' ? scA : scB;
    const pt = id==='A' ? ptA : ptB;
    if (sc.current) clearInterval(sc.current);
    st.current = 0; nt.current = ctx.currentTime + 0.05;
    sc.current = setInterval(() => {
      const bpm = audio.bpm * (1 + pt.current/100);
      const s16 = 60/bpm/4;
      while (nt.current < ctx.currentTime + 0.12) {
        if (nt.current < ctx.currentTime - s16) nt.current = ctx.currentTime + 0.05;
        audio.playStep(st.current%16, ctx, nt.current, chain.eqH);
        nt.current += s16; st.current = (st.current+1)%16;
      }
    }, 25);
  };

  const stopDeck = (id) => {
    const sc = id==='A' ? scA : scB;
    clearInterval(sc.current); sc.current = null;
  };

  const toggleDeck = (id) => {
    const deck = id==='A' ? dA : dB;
    const setD = id==='A' ? setDA : setDB;
    if (deck.playing) { stopDeck(id); setD(d=>({...d,playing:false})); }
    else { startDeck(id, deck.genre); setD(d=>({...d,playing:true})); }
  };

  const changeDeckGenre = (id, genre) => {
    const deck = id==='A' ? dA : dB;
    const setD = id==='A' ? setDA : setDB;
    if (deck.playing) { stopDeck(id); startDeck(id, genre); }
    setD(d=>({...d, genre}));
  };

  const genres = Object.keys(GENRE_AUDIO);

  const pick = (id) => setInfo(id);

  const infoData = DJ_INFO[info] || { title:'CLICK ANY CONTROL', emoji:'👆', body:'Click any knob, fader, button, or label to see a full explanation of what it does, how it works, and how real DJs use it.', tip:'Every single control in a DJ setup has a specific purpose. Understanding what each one does is the first step to understanding DJing.' };

  const deckBpm = (deck) => {
    const audio = getAudio(deck.genre);
    if (!audio) return 0;
    return (audio.bpm * (1 + deck.pitch/100)).toFixed(1);
  };

  // — Deck panel ——————————————————
  const DeckPanel = ({ id, deck, setD }) => {
    const col = id==='A' ? '#00ffcc' : '#ff6b9d';
    const bpm = parseFloat(deckBpm(deck));
    return (
      <div style={{ background:'#0a0a12', border:`1px solid ${deck.playing?col+'44':'#ffffff0a'}`, padding:'18px 16px', transition:'border-color 0.3s' }}>
        <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:13, color:col, letterSpacing:3, marginBottom:14, display:'flex', alignItems:'center', gap:8 }}>
          <span>DECK {id}</span>
          {deck.playing && <span style={{ width:6, height:6, borderRadius:'50%', background:col, boxShadow:`0 0 8px ${col}`, display:'inline-block', animation:'spin 1s linear infinite' }} />}
        </div>

        {/* Platter */}
        <div style={{ display:'flex', justifyContent:'center', marginBottom:14 }}
          onClick={() => pick('platter')}>
          <Platter playing={deck.playing} bpm={bpm} size={140} />
        </div>

        {/* BPM display */}
        <div style={{ textAlign:'center', marginBottom:12, cursor:'pointer' }} onClick={() => pick('bpm')}>
          <div style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:28, color: deck.playing ? col : '#333', letterSpacing:3, lineHeight:1 }}>
            {bpm.toFixed ? bpm.toFixed(1) : bpm}
          </div>
          <div style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:9, color:'#444', letterSpacing:2 }}>BPM</div>
        </div>

        {/* Genre selector */}
        <div style={{ marginBottom:12, cursor:'pointer' }} onClick={() => pick('trackSelect')}>
          <div style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:8, color:'#555', letterSpacing:2, marginBottom:5 }}>▼ TRACK / GENRE</div>
          <select value={deck.genre} onChange={e => changeDeckGenre(id, e.target.value)}
            onClick={e => e.stopPropagation()}
            style={{ width:'100%', background:'#0d0d18', border:`1px solid ${col}33`, color:'#ccc', fontFamily:"'Share Tech Mono',monospace", fontSize:10, padding:'6px 8px', outline:'none', cursor:'pointer' }}>
            {genres.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>

        {/* Transport buttons */}
        <div style={{ display:'flex', gap:8, marginBottom:14 }}>
          <button onClick={() => { toggleDeck(id); }}
            style={{ flex:2, background: deck.playing ? col+'22':'transparent', border:`1px solid ${col}55`, color:col, padding:'10px 0', cursor:'pointer', fontFamily:"'Share Tech Mono',monospace", fontSize:14, letterSpacing:2, transition:'all 0.15s' }}>
            {deck.playing ? '⏸' : '▶'}
          </button>
          <button onClick={() => { stopDeck(id); setD(d=>({...d,playing:false})); pick('cue'); }}
            style={{ flex:1, background:'transparent', border:'1px solid #ffffff15', color:'#555', padding:'10px 0', cursor:'pointer', fontFamily:"'Share Tech Mono',monospace", fontSize:12, letterSpacing:1 }}
            onMouseEnter={e => e.target.style.color='#fff'}
            onMouseLeave={e => e.target.style.color='#555'}
            title="Stop / Cue">
            ■
          </button>
        </div>

        {/* Pitch fader */}
        <div onClick={() => pick('pitch')} style={{ cursor:'pointer' }}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
            <span style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:8, color:'#555', letterSpacing:1 }}>PITCH / TEMPO</span>
            <span style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:8, color: deck.pitch!==0?col:'#555' }}>{deck.pitch>0?'+':''}{deck.pitch.toFixed(1)}%</span>
          </div>
          <input type='range' min={-8} max={8} step={0.1} value={deck.pitch}
            onChange={e => setD(d=>({...d, pitch:parseFloat(e.target.value)}))}
            onClick={e => e.stopPropagation()}
            style={{ width:'100%', accentColor:col, cursor:'pointer', height:4 }} />
          <div style={{ display:'flex', justifyContent:'space-between', marginTop:2 }}>
            <span style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:7, color:'#333' }}>-8%</span>
            <span style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:7, color:'#333' }}>0</span>
            <span style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:7, color:'#333' }}>+8%</span>
          </div>
        </div>
      </div>
    );
  };

  // — Mixer panel ————————————————
  const EQRow = ({ label, kA, kB, mxKeyA, mxKeyB, infoId, col='#00ffcc' }) => (
    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10, cursor:'pointer' }}
      onClick={() => pick(infoId)}>
      <DJKnob value={mx[mxKeyA]} onChange={v=>updateMx(mxKeyA,v)} onPick={pick} id={infoId} label='A' color='#00ffcc' />
      <div style={{ flex:1, textAlign:'center' }}>
        <div style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:9, color:'#444', letterSpacing:2 }}>{label}</div>
      </div>
      <DJKnob value={mx[mxKeyB]} onChange={v=>updateMx(mxKeyB,v)} onPick={pick} id={infoId} label='B' color='#ff6b9d' />
    </div>
  );

  return (
    <div className="fade-in">

      {/* Header hint */}
      <div style={{ background:'#00ffcc08', border:'1px solid #00ffcc15', padding:'10px 16px', marginBottom:20, display:'flex', alignItems:'center', gap:10 }}>
        <span style={{ fontSize:16 }}>👆</span>
        <span style={{ fontFamily:"'Rajdhani',sans-serif", fontSize:14, color:'#888', lineHeight:1.5 }}>
          <strong style={{ color:'#00ffcc' }}>Click any knob, label, or button</strong> to see a full explanation of what it does and how real DJs use it. <strong style={{ color:'#00ffcc' }}>Drag knobs up/down</strong> to turn them. Start both decks and experiment with the EQ kills — cut the Low EQ on one deck to hear how DJs prevent bass clashing.
        </span>
      </div>

      {/* Main layout: Deck A | Mixer | Deck B */}
      <div className="dj-grid" style={{ display:'grid', gridTemplateColumns:'1fr 220px 1fr', gap:12, marginBottom:20 }}>

        {/* Deck A */}
        <DeckPanel id="A" deck={dA} setD={setDA} />

        {/* Mixer */}
        <div style={{ background:'#08080f', border:'1px solid #ffffff0a', padding:'18px 14px' }}>
          <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:13, color:'#666', letterSpacing:3, marginBottom:16, textAlign:'center' }}>MIXER</div>

          {/* EQ rows */}
          <EQRow label="HIGH" mxKeyA="aH" mxKeyB="bH" infoId="eqHigh" />
          <EQRow label="MID"  mxKeyA="aM" mxKeyB="bM" infoId="eqMid" />
          <EQRow label="LOW"  mxKeyA="aL" mxKeyB="bL" infoId="eqLow" />

          <div style={{ borderTop:'1px solid #ffffff08', margin:'12px 0' }} />

          {/* Filter row */}
          <EQRow label="FILTER" mxKeyA="aF" mxKeyB="bF" infoId="filter" />

          <div style={{ borderTop:'1px solid #ffffff08', margin:'12px 0' }} />

          {/* Volume faders */}
          <div style={{ display:'flex', alignItems:'flex-end', gap:8, marginBottom:14, cursor:'pointer' }}
            onClick={() => pick('vol')}>
            <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
              <input type='range' min={0} max={1} step={0.01} value={mx.aV}
                onChange={e=>updateMx('aV',parseFloat(e.target.value))}
                onClick={e=>e.stopPropagation()}
                style={{ writingMode:'vertical-lr', direction:'rtl', height:80, accentColor:'#00ffcc', cursor:'pointer' }} />
              <span style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:8, color:'#555', letterSpacing:1 }}>VOL A</span>
            </div>
            <div style={{ flex:1, textAlign:'center', paddingBottom:24 }}>
              <div style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:9, color:'#444', letterSpacing:1 }}>LEVEL</div>
            </div>
            <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
              <input type='range' min={0} max={1} step={0.01} value={mx.bV}
                onChange={e=>updateMx('bV',parseFloat(e.target.value))}
                onClick={e=>e.stopPropagation()}
                style={{ writingMode:'vertical-lr', direction:'rtl', height:80, accentColor:'#ff6b9d', cursor:'pointer' }} />
              <span style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:8, color:'#555', letterSpacing:1 }}>VOL B</span>
            </div>
          </div>

          {/* Crossfader */}
          <div style={{ cursor:'pointer' }} onClick={() => pick('xfade')}>
            <div style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:8, color:'#555', letterSpacing:2, textAlign:'center', marginBottom:6 }}>CROSSFADER</div>
            <div style={{ position:'relative', padding:'0 4px' }}>
              <input type='range' min={0} max={1} step={0.01} value={mx.xf}
                onChange={e=>updateMx('xf',parseFloat(e.target.value))}
                onClick={e=>e.stopPropagation()}
                style={{ width:'100%', accentColor:'#888', cursor:'pointer' }} />
              <div style={{ display:'flex', justifyContent:'space-between', marginTop:2 }}>
                <span style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:7, color: mx.xf < 0.3 ? '#00ffcc':'#333' }}>A</span>
                <span style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:7, color:'#333' }}>━</span>
                <span style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:7, color: mx.xf > 0.7 ? '#ff6b9d':'#333' }}>B</span>
              </div>
            </div>
          </div>
        </div>

        {/* Deck B */}
        <DeckPanel id="B" deck={dB} setD={setDB} />
      </div>

      {/* Info Panel */}
      <div style={{ background:'#08080f', border:`1px solid ${info ? '#ffffff18':'#ffffff08'}`, padding:'18px 20px', minHeight:110 }}>
        <div style={{ display:'flex', gap:12, alignItems:'flex-start', flexWrap:'wrap' }}>
          <div style={{ fontSize:24, flexShrink:0, lineHeight:1 }}>{infoData.emoji}</div>
          <div style={{ flex:1 }}>
            <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:20, color:'#fff', letterSpacing:3, marginBottom:8 }}>{infoData.title}</div>
            <p style={{ fontFamily:"'Rajdhani',sans-serif", fontSize:15, color:'#aaa', margin:'0 0 8px', lineHeight:1.6 }}>{infoData.body}</p>
            {infoData.tip && (
              <div style={{ background:'#00ffcc08', borderLeft:'2px solid #00ffcc44', padding:'6px 12px' }}>
                <span style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:9, color:'#00ffcc88', letterSpacing:2 }}>PRO TIP // </span>
                <span style={{ fontFamily:"'Rajdhani',sans-serif", fontSize:14, color:'#777' }}>{infoData.tip}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick technique cards */}
      <div style={{ marginTop:16 }}>
        <div style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:10, color:'#333', letterSpacing:3, marginBottom:12 }}>// FIRST MOVES — TRY THESE WITH BOTH DECKS PLAYING</div>
        <div className="tech-cards" style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8 }}>
          {[
            { n:'THE EQ KILL', d:'Start both decks. Turn LOW EQ on Deck A all the way left (cut). Now only Deck B has bass. This is the single most important DJ technique — clean bass handoffs.', c:'#ff6b6b' },
            { n:'THE FILTER BUILD', d:'While a deck is playing, slowly drag the FILTER knob left over 8 seconds. Hear the track get darker. Snap it back right. That release IS the drop technique.', c:'#4ecdc4' },
            { n:'THE CROSSFADE', d:'Put both decks on different genres. Move the crossfader slowly left and right. This is the most basic mix — purely moving between two tracks without EQ.', c:'#ffe66d' },
          ].map(({n,d,c}) => (
            <div key={n} style={{ background:'#0a0a12', border:`1px solid ${c}22`, padding:'12px 14px', borderLeft:`2px solid ${c}` }}>
              <div style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:10, color:c, letterSpacing:2, marginBottom:6 }}>{n}</div>
              <p style={{ fontFamily:"'Rajdhani',sans-serif", fontSize:13, color:'#777', margin:0, lineHeight:1.5 }}>{d}</p>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}


// ═══════════════════════════════════════════════════════════════
// FOUNDATIONS MODULE — 8 modules teaching music from zero
// ═══════════════════════════════════════════════════════════════

function FoundationsTab() {
  const [activeModule, setActiveModule] = useState(null);
  const [completed, setCompleted] = useState({});
  const markDone = (id) => setCompleted(p => ({ ...p, [id]: true }));

  const modules = [
    { id:1, title:"What Is Sound", subtitle:"Before beats, before music", time:"5 min", color:"#00ffcc",
      desc:"Understand what's actually happening when you hear something. The physics behind every kick drum, every hi-hat, every bassline." },
    { id:2, title:"Pulse & Beat", subtitle:"The heartbeat underneath all music", time:"8 min", color:"#ff6b6b",
      desc:"Why all music has a steady throb — and why your body responds to it without thinking. The most fundamental concept in music." },
    { id:3, title:"BPM & Tempo", subtitle:"How fast is fast", time:"5 min", color:"#ffd93d",
      desc:"What BPM actually means, why it matters, and how it determines which genre you're listening to." },
    { id:4, title:"The Grid", subtitle:"Bars, beats, and steps — the skeleton of every track", time:"12 min", color:"#a8e6cf",
      desc:"The most important concept in electronic music. How time is divided into bars, beats, and steps — and how every techno pattern is built from this grid." },
    { id:5, title:"Notes & Pitch", subtitle:"The alphabet of melody", time:"8 min", color:"#c678ff",
      desc:"What notes are, why they have names, and how they're used in basslines, arpeggios, and pads in electronic music." },
    { id:6, title:"Scales & Keys", subtitle:"Why some music feels dark and some feels euphoric", time:"8 min", color:"#ff9ff3",
      desc:"The single biggest factor in a track's emotional character. Why Dark Psy sounds menacing and Full-On Psy sounds euphoric." },
    { id:7, title:"Frequency & The Mix", subtitle:"Why music has layers — and how to hear them", time:"10 min", color:"#48dbfb",
      desc:"The frequency spectrum from sub-bass to high hats. How to hear each layer of a track separately. Why the kick lives in your chest and hi-hats live in your ears." },
    { id:8, title:"Putting It Together", subtitle:"Build a complete techno pattern from silence", time:"15 min", color:"#ff9f43",
      desc:"Everything from modules 1–7 in one place. Build a complete 8-bar techno pattern step by step — understanding every decision as you make it." },
  ];

  if (activeModule) {
    const mod = modules.find(m => m.id === activeModule);
    return (
      <div className="fade-in">
        {/* Back */}
        <button onClick={() => setActiveModule(null)} style={{ background:'transparent', border:'1px solid #333', color:'#888', padding:'6px 14px', fontFamily:"'Share Tech Mono',monospace", fontSize:11, letterSpacing:2, cursor:'pointer', marginBottom:24 }}>
          ← ALL MODULES
        </button>
        {/* Module content */}
        <div style={{ borderLeft:`3px solid ${mod.color}`, paddingLeft:20, marginBottom:28 }}>
          <div style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:10, color:mod.color, letterSpacing:3, marginBottom:6 }}>MODULE {mod.id} OF 8</div>
          <h2 style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:32, color:'#fff', letterSpacing:3, margin:'0 0 4px' }}>{mod.title}</h2>
          <p style={{ color:'#555', fontFamily:"'Share Tech Mono',monospace", fontSize:11, letterSpacing:2 }}>{mod.subtitle}</p>
        </div>
        {/* Render module */}
        {activeModule === 1 && <ModuleSound color={mod.color} onComplete={() => { markDone(1); }} />}
        {activeModule === 2 && <ModulePulse color={mod.color} onComplete={() => { markDone(2); }} />}
        {activeModule === 3 && <ModuleBPM color={mod.color} onComplete={() => { markDone(3); }} />}
        {activeModule === 4 && <ModuleGrid color={mod.color} onComplete={() => { markDone(4); }} />}
        {activeModule === 5 && <ModuleNotes color={mod.color} onComplete={() => { markDone(5); }} />}
        {activeModule === 6 && <ModuleScales color={mod.color} onComplete={() => { markDone(6); }} />}
        {activeModule === 7 && <ModuleFrequency color={mod.color} onComplete={() => { markDone(7); }} />}
        {activeModule === 8 && <ModuleBuild color={mod.color} onComplete={() => { markDone(8); }} />}
        {/* Nav */}
        <div style={{ display:'flex', justifyContent:'space-between', marginTop:40, paddingTop:20, borderTop:'1px solid #1a1a2e' }}>
          {activeModule > 1
            ? <button onClick={() => setActiveModule(activeModule - 1)} style={{ background:'transparent', border:'1px solid #333', color:'#888', padding:'8px 20px', fontFamily:"'Share Tech Mono',monospace", fontSize:11, letterSpacing:2, cursor:'pointer' }}>← PREV MODULE</button>
            : <span />}
          {activeModule < 8
            ? <button onClick={() => { markDone(activeModule); setActiveModule(activeModule + 1); }} style={{ background:mod.color, border:'none', color:'#000', padding:'8px 20px', fontFamily:"'Share Tech Mono',monospace", fontSize:11, letterSpacing:2, cursor:'pointer', fontWeight:700 }}>NEXT MODULE →</button>
            : <button onClick={() => { markDone(8); setActiveModule(null); }} style={{ background:mod.color, border:'none', color:'#000', padding:'8px 20px', fontFamily:"'Share Tech Mono',monospace", fontSize:11, letterSpacing:2, cursor:'pointer', fontWeight:700 }}>COMPLETE ✓</button>}
        </div>
      </div>
    );
  }

  const doneCount = Object.keys(completed).length;

  return (
    <div className="fade-in">
      {/* Header */}
      <div style={{ marginBottom:32 }}>
        <div style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:10, color:'#00ffcc', letterSpacing:3, marginBottom:10 }}>FOUNDATIONS</div>
        <h2 style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:38, letterSpacing:4, color:'#fff', margin:'0 0 8px' }}>MUSIC FROM ZERO</h2>
        <p style={{ color:'#555', fontFamily:"'Rajdhani',sans-serif", fontSize:16, maxWidth:580, lineHeight:1.6 }}>
          Never studied music? Never played an instrument? Perfect starting point. Eight modules covering everything you need to understand electronic music — nothing more, nothing less.
        </p>
        {/* Progress */}
        <div style={{ marginTop:20, display:'flex', alignItems:'center', gap:14 }}>
          <div style={{ flex:1, height:3, background:'#1a1a2e', borderRadius:2 }}>
            <div style={{ width:`${(doneCount/8)*100}%`, height:'100%', background:'#00ffcc', borderRadius:2, transition:'width 0.5s ease' }} />
          </div>
          <span style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:10, color:'#444', letterSpacing:2, flexShrink:0 }}>{doneCount}/8 COMPLETE</span>
        </div>
      </div>

      {/* Suggested path notice */}
      <div style={{ background:'#00ffcc08', border:'1px solid #00ffcc18', borderLeft:'3px solid #00ffcc', padding:'10px 16px', marginBottom:28, display:'flex', gap:12, alignItems:'center' }}>
        <span style={{ fontSize:18 }}>💡</span>
        <p style={{ fontFamily:"'Rajdhani',sans-serif", fontSize:14, color:'#888', margin:0 }}>
          Modules are ordered for a reason — each one builds on the last. But you can jump to any module at any time. No locked content, no forced sequence.
        </p>
      </div>

      {/* Module grid */}
      <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
        {modules.map((m, i) => {
          const done = completed[m.id];
          return (
            <div key={m.id} onClick={() => setActiveModule(m.id)}
              style={{ background: done ? '#0d1a14' : '#0d0d14', border:`1px solid ${done ? m.color+'40' : '#1a1a2e'}`, borderLeft:`3px solid ${done ? m.color : '#2a2a3e'}`, padding:'16px 20px', cursor:'pointer', display:'grid', gridTemplateColumns:'40px 1fr auto', gap:16, alignItems:'center', transition:'all 0.2s' }}
              onMouseEnter={e => e.currentTarget.style.borderColor = m.color+'60'}
              onMouseLeave={e => e.currentTarget.style.borderColor = done ? m.color+'40' : '#1a1a2e'}>
              {/* Number */}
              <div style={{ width:40, height:40, borderRadius:'50%', background: done ? m.color : '#1a1a2e', border:`1px solid ${done ? m.color : '#2a2a3e'}`, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:"'Share Tech Mono',monospace", fontSize:14, color: done ? '#000' : '#444', fontWeight:700, flexShrink:0 }}>
                {done ? '✓' : m.id}
              </div>
              {/* Text */}
              <div>
                <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:3 }}>
                  <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:20, letterSpacing:2, color: done ? m.color : '#fff' }}>{m.title}</span>
                  <span style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:9, color:'#333', letterSpacing:2 }}>{m.time}</span>
                </div>
                <p style={{ fontFamily:"'Rajdhani',sans-serif", fontSize:14, color:'#555', margin:0 }}>{m.desc}</p>
              </div>
              {/* Arrow */}
              <span style={{ color: done ? m.color : '#333', fontSize:18 }}>›</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Shared UI helpers ────────────────────────────────────────────

function FSection({ title, icon, color, children }) {
  return (
    <div style={{ marginBottom:28 }}>
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14, borderBottom:'1px solid #1a1a2e', paddingBottom:10 }}>
        <span style={{ fontSize:18 }}>{icon}</span>
        <span style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:11, color: color, letterSpacing:2 }}>{title}</span>
      </div>
      {children}
    </div>
  );
}

function FBox({ children, color, type = 'info' }) {
  const colors = { info: '#00ffcc', warn: '#ffd93d', key: '#c678ff' };
  const c = colors[type] || color || '#00ffcc';
  return (
    <div style={{ background:`${c}08`, border:`1px solid ${c}20`, borderLeft:`3px solid ${c}`, padding:'12px 16px', marginBottom:14, borderRadius:'0 6px 6px 0' }}>
      {children}
    </div>
  );
}

function FText({ children }) {
  return <p style={{ fontFamily:"'Rajdhani',sans-serif", fontSize:16, color:'#bbb', lineHeight:1.75, margin:'0 0 14px' }}>{children}</p>;
}

function FCheck({ questions, color, onPass }) {
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const correct = questions.every((q, i) => answers[i] === q.correct);
  return (
    <div style={{ background:'#0a0a14', border:'1px solid #1a1a2e', padding:20, borderRadius:8 }}>
      <div style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:10, color, letterSpacing:2, marginBottom:16 }}>✓ QUICK CHECK — pick the best answer</div>
      {questions.map((q, i) => (
        <div key={i} style={{ marginBottom:16 }}>
          <p style={{ fontFamily:"'Rajdhani',sans-serif", fontSize:15, color:'#ccc', marginBottom:8 }}>{q.q}</p>
          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
            {q.options.map((opt, j) => {
              const sel = answers[i] === j;
              const wrong = submitted && sel && j !== q.correct;
              const right = submitted && j === q.correct;
              return (
                <button key={j} onClick={() => !submitted && setAnswers(p => ({ ...p, [i]: j }))}
                  style={{ background: right ? '#0d2a1a' : wrong ? '#2a0d0d' : sel ? '#1a1a2e' : 'transparent', border:`1px solid ${right ? '#00ffcc' : wrong ? '#ff6b6b' : sel ? '#444' : '#2a2a3e'}`, color: right ? '#00ffcc' : wrong ? '#ff6b6b' : sel ? '#fff' : '#666', padding:'8px 14px', textAlign:'left', fontFamily:"'Rajdhani',sans-serif", fontSize:14, cursor: submitted ? 'default' : 'pointer', borderRadius:4, transition:'all 0.15s' }}>
                  {right && '✓ '}{wrong && '✗ '}{opt}
                </button>
              );
            })}
          </div>
        </div>
      ))}
      {!submitted
        ? <button onClick={() => { setSubmitted(true); if (correct) setTimeout(onPass, 600); }}
            disabled={Object.keys(answers).length < questions.length}
            style={{ background: Object.keys(answers).length < questions.length ? '#1a1a2e' : color, border:'none', color: Object.keys(answers).length < questions.length ? '#444' : '#000', padding:'8px 20px', fontFamily:"'Share Tech Mono',monospace", fontSize:11, letterSpacing:2, cursor:'pointer', fontWeight:700, borderRadius:4, marginTop:8 }}>
            CHECK ANSWERS
          </button>
        : <div style={{ marginTop:12, fontFamily:"'Rajdhani',sans-serif", fontSize:15, color: correct ? '#00ffcc' : '#ff9f43' }}>
            {correct ? '✓ Correct — you got it.' : 'Not quite — read the explanations above and try again.'}
            {!correct && <button onClick={() => { setSubmitted(false); setAnswers({}); }} style={{ marginLeft:14, background:'transparent', border:'1px solid #333', color:'#888', padding:'4px 12px', fontSize:12, cursor:'pointer', fontFamily:"'Share Tech Mono',monospace" }}>RETRY</button>}
          </div>}
    </div>
  );
}

// ─── MODULE 1: SOUND ─────────────────────────────────────────────

function ModuleSound({ color, onComplete }) {
  const [freq, setFreq] = useState(440);
  const [amp, setAmp] = useState(0.4);
  const [playing, setPlaying] = useState(false);
  const [passed, setPassed] = useState(false);
  const ctxRef = useRef(null);
  const oscRef = useRef(null);
  const gainRef = useRef(null);
  const canvasRef = useRef(null);
  const animRef = useRef(null);

  const start = () => {
    if (!ctxRef.current) ctxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    const ctx = ctxRef.current;
    if (ctx.state === 'suspended') ctx.resume();
    if (oscRef.current) { oscRef.current.stop(); oscRef.current = null; }
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    g.gain.value = amp;
    osc.connect(g); g.connect(ctx.destination);
    osc.start();
    oscRef.current = osc;
    gainRef.current = g;
    setPlaying(true);
  };

  const stop = () => {
    if (oscRef.current) { try { oscRef.current.stop(); } catch(e){} oscRef.current = null; }
    setPlaying(false);
  };

  useEffect(() => {
    if (playing && oscRef.current) oscRef.current.frequency.value = freq;
  }, [freq, playing]);

  useEffect(() => {
    if (playing && gainRef.current) gainRef.current.gain.value = amp;
  }, [amp, playing]);

  // Draw wave on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx2d = canvas.getContext('2d');
    let frame = 0;
    const draw = () => {
      animRef.current = requestAnimationFrame(draw);
      frame++;
      const W = canvas.width, H = canvas.height;
      ctx2d.clearRect(0, 0, W, H);
      ctx2d.fillStyle = '#07070f';
      ctx2d.fillRect(0, 0, W, H);
      // Grid lines
      ctx2d.strokeStyle = '#1a1a2e';
      ctx2d.lineWidth = 1;
      ctx2d.beginPath(); ctx2d.moveTo(0, H/2); ctx2d.lineTo(W, H/2); ctx2d.stroke();
      // Wave
      const cycles = Math.max(1, Math.min(12, freq / 80));
      ctx2d.strokeStyle = playing ? color : '#333';
      ctx2d.lineWidth = 2;
      ctx2d.shadowBlur = playing ? 8 : 0;
      ctx2d.shadowColor = color;
      ctx2d.beginPath();
      for (let x = 0; x < W; x++) {
        const phase = playing ? frame * 0.08 : 0;
        const y = H/2 - Math.sin((x / W) * Math.PI * 2 * cycles + phase) * amp * H * 0.42;
        x === 0 ? ctx2d.moveTo(x, y) : ctx2d.lineTo(x, y);
      }
      ctx2d.stroke();
      ctx2d.shadowBlur = 0;
      // Freq label
      ctx2d.fillStyle = '#333';
      ctx2d.font = "11px 'Share Tech Mono'";
      ctx2d.fillText(`${freq}Hz`, 10, 18);
    };
    draw();
    return () => cancelAnimationFrame(animRef.current);
  }, [freq, amp, playing, color]);

  useEffect(() => stop, []);

  const freqLabel = freq < 100 ? 'Sub Bass — felt in your chest' : freq < 300 ? 'Bass — low and warm' : freq < 1000 ? 'Midrange — instruments and voice' : freq < 5000 ? 'Upper Mids — brightness' : 'Highs — hi-hats and air';
  const freqEmoji = freq < 100 ? '💥' : freq < 300 ? '🔊' : freq < 1000 ? '🎵' : freq < 5000 ? '✨' : '🎩';

  return (
    <div>
      <FSection title="THE CONCEPT" icon="💡" color={color}>
        <FText>Sound is nothing more than air vibrating. When a speaker moves, it pushes air molecules back and forth — creating a wave of pressure that travels to your eardrum and moves it too. Your brain interprets that movement as sound.</FText>
        <FText>Every sound has two fundamental properties: <strong style={{color:'#fff'}}>frequency</strong> (how fast the air vibrates = pitch) and <strong style={{color:'#fff'}}>amplitude</strong> (how much it vibrates = volume).</FText>
        <FBox color={color}>
          <p style={{ fontFamily:"'Rajdhani',sans-serif", fontSize:15, color:'#bbb', margin:0 }}>
            <strong style={{color}}>High frequency</strong> = fast vibration = high pitch (hi-hats, cymbals)<br/>
            <strong style={{color}}>Low frequency</strong> = slow vibration = low pitch (kick drum, bassline)<br/>
            <strong style={{color}}>High amplitude</strong> = big vibration = loud<br/>
            <strong style={{color}}>Low amplitude</strong> = small vibration = quiet
          </p>
        </FBox>
        <FText>At a rave, the kick drum hits at around 50–80Hz — so slow that your chest physically expands and contracts with each wave. That's not metaphorical. Your body is literally being moved by air.</FText>
      </FSection>

      <FSection title="INTERACTIVE — HEAR AND SEE A SOUND WAVE" icon="🎛️" color={color}>
        <p style={{ fontFamily:"'Rajdhani',sans-serif", fontSize:14, color:'#666', marginBottom:14 }}>Drag the frequency and amplitude sliders. Press Play to hear the sound. Watch how the wave shape changes as you adjust.</p>
        {/* Canvas */}
        <canvas ref={canvasRef} width={700} height={120} style={{ width:'100%', height:120, borderRadius:6, marginBottom:16, border:'1px solid #1a1a2e', display:'block' }} />
        {/* Controls */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20, marginBottom:16 }}>
          <div>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
              <span style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:10, color:'#555', letterSpacing:2 }}>FREQUENCY (PITCH)</span>
              <span style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:10, color }}>{ freq}Hz</span>
            </div>
            <input type="range" min={30} max={8000} value={freq} onChange={e => setFreq(Number(e.target.value))}
              style={{ width:'100%', accentColor:color }} />
            <div style={{ marginTop:6, fontFamily:"'Rajdhani',sans-serif", fontSize:13, color:'#555' }}>
              {freqEmoji} {freqLabel}
            </div>
          </div>
          <div>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
              <span style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:10, color:'#555', letterSpacing:2 }}>AMPLITUDE (VOLUME)</span>
              <span style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:10, color }}>{Math.round(amp * 100)}%</span>
            </div>
            <input type="range" min={0.02} max={0.7} step={0.01} value={amp} onChange={e => setAmp(Number(e.target.value))}
              style={{ width:'100%', accentColor:color }} />
            <div style={{ marginTop:6, fontFamily:"'Rajdhani',sans-serif", fontSize:13, color:'#555' }}>
              {amp < 0.15 ? '🔇 Barely audible' : amp < 0.35 ? '🔉 Moderate volume' : '🔊 Loud — notice how the wave gets taller'}
            </div>
          </div>
        </div>
        {/* Try these */}
        <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:16 }}>
          {[{label:'Kick drum body', f:60, a:0.55},{label:'Bassline note', f:110, a:0.45},{label:'Snare crack', f:1800, a:0.3},{label:'Hi-hat', f:6000, a:0.2},{label:'Sub bass', f:40, a:0.6}].map(p => (
            <button key={p.label} onClick={() => { setFreq(p.f); setAmp(p.a); }}
              style={{ background:'#1a1a2e', border:'1px solid #2a2a3e', color:'#888', padding:'5px 12px', fontFamily:"'Share Tech Mono',monospace", fontSize:10, letterSpacing:1, cursor:'pointer', borderRadius:4 }}>
              {p.label}
            </button>
          ))}
        </div>
        <button onClick={() => playing ? stop() : start()}
          style={{ background: playing ? '#2a0d0d' : color, border:`1px solid ${playing ? '#ff6b6b' : color}`, color: playing ? '#ff6b6b' : '#000', padding:'10px 28px', fontFamily:"'Share Tech Mono',monospace", fontSize:12, letterSpacing:2, cursor:'pointer', fontWeight:700, borderRadius:4 }}>
          {playing ? '■ STOP' : '▶ PLAY SOUND'}
        </button>
      </FSection>

      <FSection title="WHY THIS MATTERS IN ELECTRONIC MUSIC" icon="⚡" color={color}>
        <FText>Every sound in a techno or psy track is just frequency and amplitude — manipulated, layered, and timed. The kick drum is a sine wave at 50–80Hz with a fast volume envelope. The hi-hat is noise filtered to 6000–12000Hz. The acid bassline is a sawtooth wave at 100–200Hz run through a resonant filter.</FText>
        <FText>Understanding that sounds are just waves means you start to understand why a kick feels physical, why hi-hats seem to sparkle above everything else, and why the bassline lives in that middle space between feeling and hearing.</FText>
      </FSection>

      <FCheck
        color={color}
        onPass={() => { onComplete(); setPassed(true); }}
        questions={[
          { q:"You increase the frequency of a sound. What happens?", options:["It gets louder","The pitch goes up","The pitch goes down","The wave gets taller"], correct:1 },
          { q:"At a rave, you feel the kick drum in your chest physically. This is because:", options:["The music is very loud","The kick frequency is so low it moves air at a body-physical scale","Your ears are overloaded","The bass is reflected off the ceiling"], correct:1 },
          { q:"A hi-hat sounds sharp and high-pitched. A kick sounds deep and low. The difference is:", options:["Volume","Amplitude","Frequency","Both frequency and amplitude"], correct:2 },
        ]}
      />
      {passed && <div style={{ marginTop:14, color:'#00ffcc', fontFamily:"'Share Tech Mono',monospace", fontSize:11, letterSpacing:2 }}>✓ MODULE 1 COMPLETE — move to Module 2</div>}
    </div>
  );
}

// ─── MODULE 2: PULSE ─────────────────────────────────────────────

function ModulePulse({ color, onComplete }) {
  const [bpm, setBpm] = useState(120);
  const [running, setRunning] = useState(false);
  const [beat, setBeat] = useState(false);
  const [tapTimes, setTapTimes] = useState([]);
  const [tapBpm, setTapBpm] = useState(null);
  const [passed, setPassed] = useState(false);
  const timerRef = useRef(null);
  const ctxRef = useRef(null);

  const playClick = (accent) => {
    if (!ctxRef.current) ctxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    const ctx = ctxRef.current;
    if (ctx.state === 'suspended') ctx.resume();
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.frequency.value = accent ? 880 : 660;
    g.gain.setValueAtTime(accent ? 0.4 : 0.25, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);
    osc.connect(g); g.connect(ctx.destination);
    osc.start(); osc.stop(ctx.currentTime + 0.07);
  };

  useEffect(() => {
    if (running) {
      let count = 0;
      const interval = (60 / bpm) * 1000;
      timerRef.current = setInterval(() => {
        count++;
        setBeat(true);
        playClick(count % 4 === 1);
        setTimeout(() => setBeat(false), 80);
      }, interval);
    } else {
      clearInterval(timerRef.current);
      setBeat(false);
    }
    return () => clearInterval(timerRef.current);
  }, [running, bpm]);

  useEffect(() => () => clearInterval(timerRef.current), []);

  const handleTap = () => {
    const now = Date.now();
    const newTimes = [...tapTimes, now].slice(-8);
    setTapTimes(newTimes);
    if (newTimes.length >= 2) {
      const gaps = newTimes.slice(1).map((t, i) => t - newTimes[i]);
      const avg = gaps.reduce((a, b) => a + b, 0) / gaps.length;
      setTapBpm(Math.round(60000 / avg));
    }
    playClick(true);
  };

  const beatLabel = bpm < 90 ? 'Slow — relaxed groove' : bpm < 120 ? 'Medium — house tempo' : bpm < 135 ? 'Fast — techno range' : bpm < 150 ? 'Very fast — psy/hard techno' : 'Extreme — gabber territory';

  return (
    <div>
      <FSection title="THE CONCEPT" icon="💡" color={color}>
        <FText>A pulse is the steady, regular throb underneath all music. Think of it like a clock ticking — completely regular, never speeding up or slowing down. Every song you've ever heard has a pulse, even if it's hidden.</FText>
        <FText>A beat is each individual tick of that clock. When you tap your foot to music — that's you feeling the pulse and syncing your body to it. This is involuntary and biological. Humans are wired to synchronise movement to regular rhythms. It's called <strong style={{color:'#fff'}}>entrainment</strong>.</FText>
        <FBox color={color}>
          <p style={{ fontFamily:"'Rajdhani',sans-serif", fontSize:15, color:'#bbb', margin:0 }}>
            <strong style={{color}}>Pulse</strong> = the steady, regular underlying throb<br/>
            <strong style={{color}}>Beat</strong> = each individual tick of the pulse<br/>
            <strong style={{color}}>Rhythm</strong> = a pattern of beats — some hits, some silences<br/>
            <strong style={{color}}>Tempo</strong> = how fast the pulse is moving
          </p>
        </FBox>
        <FText>In techno and psy, the kick drum IS the pulse. It hits on every single beat — which is why even in a completely new track you've never heard, you instantly know where the beat is. Your body finds it within 2 seconds.</FText>
      </FSection>

      <FSection title="INTERACTIVE — FEEL THE PULSE" icon="🎛️" color={color}>
        {/* Metronome visual */}
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', marginBottom:24 }}>
          <div style={{ display:'flex', gap:8, marginBottom:16 }}>
            {[0,1,2,3].map(i => (
              <div key={i} style={{ width:48, height:48, borderRadius:'50%', background: beat && i === 0 ? color : '#1a1a2e', border:`2px solid ${i===0 ? color : '#2a2a3e'}`, transition:'all 0.05s', boxShadow: beat && i===0 ? `0 0 20px ${color}88` : 'none' }} />
            ))}
          </div>
          <p style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:10, color:'#444', letterSpacing:2 }}>BEAT 1 · 2 · 3 · 4 (ACCENT ON 1)</p>
        </div>
        {/* BPM slider */}
        <div style={{ marginBottom:20 }}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
            <span style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:10, color:'#555', letterSpacing:2 }}>TEMPO</span>
            <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:28, color, letterSpacing:2 }}>{bpm} BPM</span>
          </div>
          <input type="range" min={60} max={200} value={bpm} onChange={e => setBpm(Number(e.target.value))} style={{ width:'100%', accentColor:color }} />
          <div style={{ marginTop:6, fontFamily:"'Rajdhani',sans-serif", fontSize:14, color:'#555' }}>{beatLabel}</div>
        </div>
        <button onClick={() => setRunning(r => !r)}
          style={{ background: running ? '#2a0d0d' : color, border:`1px solid ${running ? '#ff6b6b' : color}`, color: running ? '#ff6b6b' : '#000', padding:'10px 28px', fontFamily:"'Share Tech Mono',monospace", fontSize:12, letterSpacing:2, cursor:'pointer', fontWeight:700, borderRadius:4, marginBottom:24 }}>
          {running ? '■ STOP' : '▶ START PULSE'}
        </button>

        {/* Tap tempo */}
        <div style={{ background:'#0a0a14', border:'1px solid #1a1a2e', padding:20, borderRadius:8 }}>
          <div style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:10, color:'#555', letterSpacing:2, marginBottom:10 }}>TAP TEMPO — tap along to any song to find its BPM</div>
          <p style={{ fontFamily:"'Rajdhani',sans-serif", fontSize:14, color:'#666', marginBottom:14 }}>Put on a track. Tap the button in time with the beat for 4–8 beats. The BPM will calculate automatically.</p>
          <div style={{ display:'flex', alignItems:'center', gap:16 }}>
            <button onClick={handleTap}
              style={{ background:'#1a1a2e', border:`2px solid ${color}`, color, padding:'14px 32px', fontFamily:"'Bebas Neue',sans-serif", fontSize:22, letterSpacing:3, cursor:'pointer', borderRadius:4, userSelect:'none' }}>
              TAP
            </button>
            {tapBpm && (
              <div>
                <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:36, color, letterSpacing:2 }}>{tapBpm} BPM</div>
                <div style={{ fontFamily:"'Rajdhani',sans-serif", fontSize:13, color:'#555' }}>
                  {tapBpm < 100 ? 'Very slow — ambient/psybient' : tapBpm < 125 ? 'House tempo' : tapBpm < 140 ? 'Techno range' : tapBpm < 155 ? 'Psy / Hard Techno' : tapBpm < 170 ? 'Hi-Tech Psy' : 'Gabber / Psycore'}
                </div>
              </div>
            )}
            {tapTimes.length > 0 && <button onClick={() => { setTapTimes([]); setTapBpm(null); }} style={{ background:'transparent', border:'1px solid #333', color:'#555', padding:'6px 12px', fontSize:11, cursor:'pointer', fontFamily:"'Share Tech Mono',monospace" }}>RESET</button>}
          </div>
        </div>
      </FSection>

      <FSection title="WHY THIS MATTERS" icon="⚡" color={color}>
        <FText>The pulse is why 2000 people at a rave all raise their hands at the same moment without coordinating. They're all locked to the same pulse. This collective synchronisation is one of the most powerful experiences in human social life — and it's entirely built on this simple concept.</FText>
        <FText>When a DJ removes the kick drum during a breakdown, they're not stopping the music — they're removing the visible pulse while the crowd keeps feeling it internally. When the kick comes back in, the collective re-synchronisation is the drop.</FText>
      </FSection>

      <FCheck color={color} onPass={() => { onComplete(); setPassed(true); }}
        questions={[
          { q:"What is the difference between a pulse and a rhythm?", options:["They are the same thing","Pulse is steady and regular, rhythm is a pattern of hits and silences","Rhythm is steady, pulse varies","Pulse is the melody, rhythm is the drums"], correct:1 },
          { q:"At a rave the DJ removes the kick drum. The crowd still moves together. Why?", options:["They can see the DJ moving","The bass is still playing","They have internalised the pulse and keep feeling it","The lights are flashing on the beat"], correct:2 },
        ]}
      />
      {passed && <div style={{ marginTop:14, color:'#00ffcc', fontFamily:"'Share Tech Mono',monospace", fontSize:11, letterSpacing:2 }}>✓ MODULE 2 COMPLETE</div>}
    </div>
  );
}

// ─── MODULE 3: BPM ───────────────────────────────────────────────

function ModuleBPM({ color, onComplete }) {
  const [bpm, setBpm] = useState(120);
  const [passed, setPassed] = useState(false);
  const [running, setRunning] = useState(false);
  const timerRef = useRef(null);
  const [flash, setFlash] = useState(false);
  const ctxRef = useRef(null);

  const playKick = () => {
    if (!ctxRef.current) ctxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    const ctx = ctxRef.current;
    if (ctx.state === 'suspended') ctx.resume();
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.frequency.setValueAtTime(120, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.12);
    g.gain.setValueAtTime(0.7, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    osc.connect(g); g.connect(ctx.destination);
    osc.start(); osc.stop(ctx.currentTime + 0.4);
  };

  useEffect(() => {
    if (running) {
      timerRef.current = setInterval(() => {
        setFlash(true); playKick(); setTimeout(() => setFlash(false), 80);
      }, (60 / bpm) * 1000);
    } else { clearInterval(timerRef.current); setFlash(false); }
    return () => clearInterval(timerRef.current);
  }, [running, bpm]);

  useEffect(() => () => clearInterval(timerRef.current), []);

  const zones = [
    { min:60,  max:90,  label:'Psybient / Ambient',      color:'#48dbfb', emoji:'🌊' },
    { min:90,  max:122, label:'House / Down Tempo',       color:'#a8e6cf', emoji:'🏠' },
    { min:122, max:132, label:'Detroit / Minimal Techno', color:'#00ffcc', emoji:'🔧' },
    { min:132, max:140, label:'Peak Time Techno',         color:'#ffd93d', emoji:'⚡' },
    { min:140, max:150, label:'Psytrance / Full-On',      color:'#ff9f43', emoji:'🌀' },
    { min:150, max:165, label:'Dark Psy / Forest / Hard Techno', color:'#ff6b6b', emoji:'🌲' },
    { min:165, max:185, label:'Hi-Tech / Psycore',        color:'#c678ff', emoji:'🚀' },
    { min:185, max:220, label:'Gabber / Extreme',         color:'#ff4757', emoji:'💀' },
  ];

  const currentZone = zones.find(z => bpm >= z.min && bpm < z.max) || zones[zones.length-1];

  return (
    <div>
      <FSection title="THE CONCEPT" icon="💡" color={color}>
        <FText>BPM stands for Beats Per Minute — it's the count of how many beats happen in 60 seconds. If you hear 140 kicks in one minute, the track is at 140 BPM. That's it. Nothing more complex.</FText>
        <FText>BPM is the first thing that defines a genre. Not the sound design, not the artist, not the label — the tempo. A track at 95 BPM cannot be hard techno no matter how aggressive it sounds. A track at 143 BPM cannot be ambient house.</FText>
        <FBox color={color}>
          <p style={{ fontFamily:"'Rajdhani',sans-serif", fontSize:15, color:'#bbb', margin:0 }}>
            The reason BPM matters physically: at 140 BPM, a kick hits every 0.43 seconds. Your heart rate at rest is ~60-70 BPM. Dancing raises it to 120-140 BPM. The music is literally matching your elevated heart rate — that's why it feels so natural to move to at that tempo.
          </p>
        </FBox>
      </FSection>

      <FSection title="INTERACTIVE — EXPLORE THE GENRE BPM MAP" icon="🎛️" color={color}>
        {/* Big flash */}
        <div style={{ display:'flex', justifyContent:'center', marginBottom:20 }}>
          <div style={{ width:100, height:100, borderRadius:'50%', background: flash ? currentZone.color : '#1a1a2e', border:`3px solid ${currentZone.color}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:36, transition:'all 0.05s', boxShadow: flash ? `0 0 40px ${currentZone.color}88` : 'none' }}>
            {flash ? currentZone.emoji : '●'}
          </div>
        </div>
        {/* BPM display */}
        <div style={{ textAlign:'center', marginBottom:20 }}>
          <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:64, color:currentZone.color, letterSpacing:4, lineHeight:1 }}>{bpm}</div>
          <div style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:10, color:'#555', letterSpacing:3 }}>BPM</div>
          <div style={{ fontFamily:"'Rajdhani',sans-serif", fontSize:18, color:currentZone.color, marginTop:6, fontWeight:600 }}>{currentZone.label}</div>
        </div>
        {/* Slider */}
        <input type="range" min={60} max={220} value={bpm} onChange={e => setBpm(Number(e.target.value))} style={{ width:'100%', accentColor:currentZone.color, marginBottom:8 }} />
        <div style={{ display:'flex', justifyContent:'space-between', fontFamily:"'Share Tech Mono',monospace", fontSize:9, color:'#333', marginBottom:20 }}>
          <span>60</span><span>100</span><span>140</span><span>180</span><span>220</span>
        </div>
        {/* Zone bars */}
        <div style={{ display:'flex', flexDirection:'column', gap:4, marginBottom:20 }}>
          {zones.map(z => (
            <div key={z.label} onClick={() => setBpm(Math.round((z.min + z.max) / 2))}
              style={{ display:'flex', alignItems:'center', gap:10, padding:'6px 10px', background: currentZone.label === z.label ? `${z.color}15` : 'transparent', border:`1px solid ${currentZone.label === z.label ? z.color+'40' : '#1a1a2e'}`, cursor:'pointer', borderRadius:4, transition:'all 0.2s' }}>
              <div style={{ width:`${((z.max - z.min) / 160) * 100}%`, minWidth:20, height:4, background:z.color, borderRadius:2 }} />
              <span style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:9, color: currentZone.label === z.label ? z.color : '#444', letterSpacing:1 }}>{z.min}–{z.max}</span>
              <span style={{ fontFamily:"'Rajdhani',sans-serif", fontSize:13, color: currentZone.label === z.label ? z.color : '#555' }}>{z.label}</span>
            </div>
          ))}
        </div>
        <button onClick={() => setRunning(r => !r)}
          style={{ background: running ? '#2a0d0d' : currentZone.color, border:'none', color: running ? '#ff6b6b' : '#000', padding:'10px 24px', fontFamily:"'Share Tech Mono',monospace", fontSize:11, letterSpacing:2, cursor:'pointer', fontWeight:700, borderRadius:4 }}>
          {running ? '■ STOP' : '▶ HEAR THIS BPM'}
        </button>
      </FSection>

      <FCheck color={color} onPass={() => { onComplete(); setPassed(true); }}
        questions={[
          { q:"A track has 143 kicks per minute. What is its BPM?", options:["43","143","1.43","14.3"], correct:1 },
          { q:"You're at a festival, the music is very fast and intense. What BPM range are you likely in?", options:["60–90 BPM","90–120 BPM","140–155 BPM","200+ BPM"], correct:2 },
          { q:"Why does dancing to 140 BPM techno feel physically natural?", options:["Because it's a round number","Because it matches your elevated heart rate while dancing","Because it's the same as classical music","Because low frequencies are relaxing"], correct:1 },
        ]}
      />
      {passed && <div style={{ marginTop:14, color:'#00ffcc', fontFamily:"'Share Tech Mono',monospace", fontSize:11, letterSpacing:2 }}>✓ MODULE 3 COMPLETE</div>}
    </div>
  );
}

// ─── MODULE 4: THE GRID ──────────────────────────────────────────

function ModuleGrid({ color, onComplete }) {
  const [passed, setPassed] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(-1);
  const [grid, setGrid] = useState({
    kick: [1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0],
    snare:[0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0],
    hat:  [0,0,1,0,0,0,1,0,0,0,1,0,0,0,1,0],
    bass: [1,0,0,0,0,0,1,0,0,1,0,0,0,0,0,1],
  });
  const [bpm] = useState(128);
  const [activePreset, setActivePreset] = useState('4/4 Techno');
  const timerRef = useRef(null);
  const stepRef = useRef(-1);
  const ctxRef = useRef(null);

  const presets = {
    '4/4 Techno': { kick:[1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0], snare:[0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0], hat:[0,0,1,0,0,0,1,0,0,0,1,0,0,0,1,0], bass:[1,0,0,0,0,0,1,0,0,1,0,0,0,0,0,1] },
    'Offbeat Hats': { kick:[1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0], snare:[0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0], hat:[0,1,0,1,0,1,0,1,0,1,0,1,0,1,0,1], bass:[1,0,0,0,0,0,1,0,0,1,0,0,0,0,0,1] },
    'Half Time': { kick:[1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], snare:[0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0], hat:[1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0], bass:[1,0,0,0,0,0,1,0,0,1,0,0,0,0,0,0] },
    'Psy Bassline': { kick:[1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0], snare:[0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0], hat:[0,0,0,1,0,0,0,1,0,0,0,1,0,0,0,1], bass:[1,1,0,1,0,1,1,0,1,0,1,0,0,1,1,0] },
    'Blank': { kick:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], snare:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], hat:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], bass:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0] },
  };

  const rowColors = { kick:'#ff6b6b', snare:'#ffd93d', hat:'#00ffcc', bass:'#c678ff' };
  const rowLabels = { kick:'KICK', snare:'SNARE', hat:'HI-HAT', bass:'BASS' };

  const toggle = (row, i) => setGrid(g => ({ ...g, [row]: g[row].map((v, idx) => idx===i ? (v?0:1) : v) }));

  const playStep = (step, g) => {
    if (!ctxRef.current) ctxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    const ctx = ctxRef.current;
    if (ctx.state === 'suspended') ctx.resume();
    const t = ctx.currentTime;
    if (g.kick[step]) { const o=ctx.createOscillator(),gn=ctx.createGain(); o.frequency.setValueAtTime(110,t); o.frequency.exponentialRampToValueAtTime(40,t+0.1); gn.gain.setValueAtTime(0.8,t); gn.gain.exponentialRampToValueAtTime(0.001,t+0.35); o.connect(gn); gn.connect(ctx.destination); o.start(t); o.stop(t+0.4); }
    if (g.snare[step]) { const sz=Math.floor(ctx.sampleRate*0.12),buf=ctx.createBuffer(1,sz,ctx.sampleRate); const d=buf.getChannelData(0); for(let i=0;i<sz;i++) d[i]=Math.random()*2-1; const src=ctx.createBufferSource(); src.buffer=buf; const bp=ctx.createBiquadFilter(); bp.type='bandpass'; bp.frequency.value=2000; const gn=ctx.createGain(); gn.gain.setValueAtTime(0.35,t); gn.gain.exponentialRampToValueAtTime(0.001,t+0.1); src.connect(bp); bp.connect(gn); gn.connect(ctx.destination); src.start(t); src.stop(t+0.13); }
    if (g.hat[step]) { const sz=Math.floor(ctx.sampleRate*0.05),buf=ctx.createBuffer(1,sz,ctx.sampleRate); const d=buf.getChannelData(0); for(let i=0;i<sz;i++) d[i]=Math.random()*2-1; const src=ctx.createBufferSource(); src.buffer=buf; const hp=ctx.createBiquadFilter(); hp.type='highpass'; hp.frequency.value=8000; const gn=ctx.createGain(); gn.gain.setValueAtTime(0.2,t); gn.gain.exponentialRampToValueAtTime(0.001,t+0.04); src.connect(hp); hp.connect(gn); gn.connect(ctx.destination); src.start(t); src.stop(t+0.06); }
    if (g.bass[step]) { const o=ctx.createOscillator(); o.type='sawtooth'; o.frequency.value=[55,55,73,55,82,55,65,55,82,55,73,55,65,55,82,73][step]||55; const gn=ctx.createGain(); gn.gain.setValueAtTime(0.3,t); gn.gain.exponentialRampToValueAtTime(0.001,t+0.18); o.connect(gn); gn.connect(ctx.destination); o.start(t); o.stop(t+0.2); }
  };

  useEffect(() => {
    if (playing) {
      const interval = (60/bpm/4)*1000;
      timerRef.current = setInterval(() => {
        stepRef.current = (stepRef.current + 1) % 16;
        setCurrentStep(stepRef.current);
        playStep(stepRef.current, grid);
      }, interval);
    } else { clearInterval(timerRef.current); setCurrentStep(-1); stepRef.current = -1; }
    return () => clearInterval(timerRef.current);
  }, [playing, grid, bpm]);

  useEffect(() => () => clearInterval(timerRef.current), []);

  return (
    <div>
      <FSection title="THE CONCEPT" icon="💡" color={color}>
        <FText>Electronic music is built on a grid — a way of dividing time into equal slots. Understanding this grid is the single most important concept in electronic music production and DJing.</FText>
        <FBox color={color} type="key">
          <p style={{ fontFamily:"'Rajdhani',sans-serif", fontSize:15, color:'#bbb', margin:0, lineHeight:1.8 }}>
            <strong style={{color:'#fff'}}>A Beat</strong> = one pulse. In 128 BPM techno, a beat lasts 0.47 seconds.<br/>
            <strong style={{color:'#fff'}}>A Bar</strong> = 4 beats grouped together. One complete cycle. 1.875 seconds at 128 BPM.<br/>
            <strong style={{color:'#fff'}}>A Step</strong> = each beat divided by 4. So 1 bar = 16 steps.<br/>
            <strong style={{color:'#fff'}}>4/4</strong> = 4 beats per bar, each beat worth a quarter note. The standard for all techno.<br/>
            <strong style={{color:'#fff'}}>16 steps</strong> = the resolution of the grid — 16 equal slots per bar.
          </p>
        </FBox>
        <FText>When you put a kick on steps 1, 5, 9, 13 — you've created a 4/4 kick pattern. Four kicks per bar, one on each beat. That's the heartbeat of all techno. Everything else is built around, between, and across those four hits.</FText>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(16,1fr)', gap:2, marginBottom:14 }}>
          {Array.from({length:16}, (_,i) => (
            <div key={i} style={{ height:28, background: [0,4,8,12].includes(i) ? '#00ffcc30' : '#1a1a2e', border:`1px solid ${[0,4,8,12].includes(i) ? '#00ffcc60' : '#2a2a3e'}`, borderRadius:2, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:"'Share Tech Mono',monospace", fontSize:8, color: [0,4,8,12].includes(i) ? '#00ffcc' : '#333' }}>
              {[0,4,8,12].includes(i) ? `B${i/4+1}` : '·'}
            </div>
          ))}
        </div>
        <p style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:10, color:'#444', letterSpacing:1, marginBottom:16 }}>↑ 16 STEPS = 1 BAR · B1–B4 ARE THE 4 BEATS · STEPS BETWEEN BEATS ARE SUBDIVISIONS</p>
      </FSection>

      <FSection title="INTERACTIVE — BUILD YOUR OWN PATTERN" icon="🎛️" color={color}>
        <p style={{ fontFamily:"'Rajdhani',sans-serif", fontSize:14, color:'#666', marginBottom:16 }}>Click any square to toggle it on or off. Press Play to hear your pattern loop. Start with a preset to see how different patterns sound — then try building your own from the Blank preset.</p>
        {/* Presets */}
        <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:16 }}>
          {Object.keys(presets).map(k => (
            <button key={k} onClick={() => { setGrid(presets[k]); setActivePreset(k); }}
              style={{ background: activePreset===k ? color+'20' : 'transparent', border:`1px solid ${activePreset===k ? color : '#2a2a3e'}`, color: activePreset===k ? color : '#555', padding:'5px 12px', fontFamily:"'Share Tech Mono',monospace", fontSize:10, letterSpacing:1, cursor:'pointer', borderRadius:4 }}>
              {k}
            </button>
          ))}
        </div>
        {/* Grid */}
        <div style={{ background:'#07070f', border:'1px solid #1a1a2e', padding:16, borderRadius:8, marginBottom:16 }}>
          <div className="seq-scroll" style={{ minWidth:0 }}>
          {/* Beat labels */}
          <div style={{ display:'grid', gridTemplateColumns:'60px repeat(16,1fr)', gap:2, marginBottom:4, minWidth:460 }}>
            <div />
            {[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16].map(n => (
              <div key={n} style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:7, color: [1,5,9,13].includes(n) ? '#555' : '#222', textAlign:'center', letterSpacing:0 }}>
                {[1,5,9,13].includes(n) ? `B${Math.ceil(n/4)}` : ''}
              </div>
            ))}
          </div>
          {Object.keys(grid).map(row => (
            <div key={row} style={{ display:'grid', gridTemplateColumns:'60px repeat(16,1fr)', gap:2, marginBottom:4 }}>
              <div style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:10, color:rowColors[row], letterSpacing:1, display:'flex', alignItems:'center' }}>{rowLabels[row]}</div>
              {grid[row].map((v, i) => (
                <div key={i} onClick={() => toggle(row, i)}
                  style={{ height:28, background: currentStep===i ? (v ? rowColors[row] : rowColors[row]+'30') : (v ? rowColors[row]+'90' : '#1a1a2e'), border:`1px solid ${v ? rowColors[row] : '#2a2a3e'}`, borderRadius:2, cursor:'pointer', marginLeft: i%4===0 && i>0 ? 4 : 0, boxShadow: currentStep===i && v ? `0 0 8px ${rowColors[row]}88` : 'none', transition:'background 0.05s' }} />
              ))}
            </div>
          ))}
          </div>{/* end seq-scroll */}
        </div>{/* end grid container */}
        {/* Controls */}
        <div style={{ display:'flex', gap:10, alignItems:'center' }}>
          <button onClick={() => setPlaying(p => !p)}
            style={{ background: playing ? '#2a0d0d' : color, border:`1px solid ${playing ? '#ff6b6b' : color}`, color: playing ? '#ff6b6b' : '#000', padding:'10px 28px', fontFamily:"'Share Tech Mono',monospace", fontSize:12, letterSpacing:2, cursor:'pointer', fontWeight:700, borderRadius:4 }}>
            {playing ? '■ STOP' : '▶ PLAY'}
          </button>
          <span style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:10, color:'#444', letterSpacing:2 }}>128 BPM</span>
        </div>
      </FSection>

      <FSection title="WHY THIS MATTERS" icon="⚡" color={color}>
        <FText>Every pattern in every techno track you've ever heard was programmed into a grid exactly like this one. The DJ booth step sequencer in this platform is the same thing with more features. When you understand the grid, you can hear any track and immediately understand its structure.</FText>
      </FSection>

      <FCheck color={color} onPass={() => { onComplete(); setPassed(true); }}
        questions={[
          { q:"How many steps are in one bar of 4/4 music?", options:["4","8","16","32"], correct:2 },
          { q:"In a 4/4 pattern, which steps does the kick drum hit on?", options:["1, 2, 3, 4","1, 5, 9, 13","2, 4, 6, 8","Every single step"], correct:1 },
          { q:"What does 4/4 mean?", options:["4 tracks playing at once","4 beats per bar, each beat worth a quarter note","4 kick drums and 4 hi-hats","The track is at 44 BPM"], correct:1 },
        ]}
      />
      {passed && <div style={{ marginTop:14, color:'#00ffcc', fontFamily:"'Share Tech Mono',monospace", fontSize:11, letterSpacing:2 }}>✓ MODULE 4 COMPLETE — the most important module. You now understand how all electronic music is structured.</div>}
    </div>
  );
}

// ─── MODULE 5: NOTES ─────────────────────────────────────────────

function ModuleNotes({ color, onComplete }) {
  const [passed, setPassed] = useState(false);
  const [activeNote, setActiveNote] = useState(null);
  const ctxRef = useRef(null);

  const notes = [
    {name:'C',  freq:261.6, black:false, octave:4},
    {name:'C#', freq:277.2, black:true,  octave:4},
    {name:'D',  freq:293.7, black:false, octave:4},
    {name:'D#', freq:311.1, black:true,  octave:4},
    {name:'E',  freq:329.6, black:false, octave:4},
    {name:'F',  freq:349.2, black:false, octave:4},
    {name:'F#', freq:370.0, black:true,  octave:4},
    {name:'G',  freq:392.0, black:false, octave:4},
    {name:'G#', freq:415.3, black:true,  octave:4},
    {name:'A',  freq:440.0, black:false, octave:4},
    {name:'A#', freq:466.2, black:true,  octave:4},
    {name:'B',  freq:493.9, black:false, octave:4},
    {name:'C',  freq:523.3, black:false, octave:5},
  ];

  const playNote = (freq, name) => {
    if (!ctxRef.current) ctxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    const ctx = ctxRef.current;
    if (ctx.state === 'suspended') ctx.resume();
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.value = freq;
    g.gain.setValueAtTime(0.3, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
    osc.connect(g); g.connect(ctx.destination);
    osc.start(); osc.stop(ctx.currentTime + 0.9);
    setActiveNote(name + freq);
    setTimeout(() => setActiveNote(null), 300);
  };

  const bassNotes = [
    {name:'A1', freq:55, desc:'Deep sub bass — kick drum body'},
    {name:'E2', freq:82.4, desc:'Low bass — classic bassline root'},
    {name:'A2', freq:110, desc:'Bass — where psy basslines often live'},
    {name:'E3', freq:164.8, desc:'Upper bass / low mid'},
    {name:'A3', freq:220, desc:'Low midrange — bass melody'},
  ];

  return (
    <div>
      <FSection title="THE CONCEPT" icon="💡" color={color}>
        <FText>A note is just a specific frequency that humans have agreed to give a name. The note A4 is always 440Hz — everywhere in the world, in every instrument. The note A5 is 880Hz — exactly double, which is why it sounds like the "same" note but higher.</FText>
        <FBox color={color}>
          <p style={{ fontFamily:"'Rajdhani',sans-serif", fontSize:15, color:'#bbb', margin:0, lineHeight:1.8 }}>
            There are 12 notes in Western music: <strong style={{color:'#fff'}}>C C# D D# E F F# G G# A A# B</strong><br/>
            Then they repeat — C D E F G A B C D E... going higher each time.<br/>
            Each repetition is called an <strong style={{color:'#fff'}}>octave</strong>. C4 → C5 is one octave up (double the frequency).
          </p>
        </FBox>
        <FText>In electronic music you don't need to memorise all 12 notes or read sheet music. What matters is understanding that basslines, arpeggios, and pads are all sequences of specific notes — chosen to create specific emotions and to sound good together.</FText>
      </FSection>

      <FSection title="INTERACTIVE — PLAY A KEYBOARD" icon="🎛️" color={color}>
        <p style={{ fontFamily:"'Rajdhani',sans-serif", fontSize:14, color:'#666', marginBottom:16 }}>Click any key to hear the note. White keys = natural notes (C D E F G A B). Black keys = sharps/flats (#).</p>
        {/* Piano keyboard */}
        <div style={{ position:'relative', height:120, background:'#07070f', border:'1px solid #1a1a2e', borderRadius:8, padding:'8px 10px', marginBottom:16, overflow:'hidden' }}>
          <div style={{ display:'flex', position:'relative', height:'100%', gap:2 }}>
            {/* White keys */}
            {notes.filter(n => !n.black).map((n, i) => (
              <div key={n.name+n.freq} onClick={() => playNote(n.freq, n.name+n.freq)}
                style={{ flex:1, height:'100%', background: activeNote === n.name+n.freq ? color : '#e8e8e8', border:`1px solid #ccc`, borderRadius:'0 0 4px 4px', cursor:'pointer', display:'flex', alignItems:'flex-end', justifyContent:'center', paddingBottom:6, transition:'background 0.05s', position:'relative' }}>
                <span style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:9, color: activeNote === n.name+n.freq ? '#000' : '#888' }}>{n.name}{n.octave}</span>
              </div>
            ))}
          </div>
          {/* Black keys overlay */}
          <div style={{ position:'absolute', top:8, left:10, right:10, height:'55%', pointerEvents:'none' }}>
            <div style={{ display:'flex', height:'100%' }}>
              {notes.filter(n => !n.black).map((wn, wi) => {
                const nextBlack = notes.find(n => n.black && n.freq > wn.freq && n.freq < (notes.filter(n2=>!n2.black)[wi+1]?.freq || 9999));
                return (
                  <div key={wn.freq} style={{ flex:1, position:'relative' }}>
                    {nextBlack && (
                      <div onClick={() => { playNote(nextBlack.freq, nextBlack.name+nextBlack.freq); }}
                        style={{ position:'absolute', right:'-30%', width:'60%', height:'100%', background: activeNote === nextBlack.name+nextBlack.freq ? color : '#1a1a1a', border:'1px solid #333', borderRadius:'0 0 3px 3px', zIndex:2, cursor:'pointer', pointerEvents:'all', display:'flex', alignItems:'flex-end', justifyContent:'center', paddingBottom:4, transition:'background 0.05s' }}>
                        <span style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:7, color:'#555' }}>{nextBlack.name}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        <p style={{ fontFamily:"'Rajdhani',sans-serif", fontSize:13, color:'#555', marginBottom:20 }}>Notice: C4 and C5 sound like the "same" note but higher. That's an octave.</p>

        {/* Bass notes */}
        <div style={{ background:'#0a0a14', border:'1px solid #1a1a2e', padding:16, borderRadius:8 }}>
          <div style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:10, color:'#555', letterSpacing:2, marginBottom:12 }}>BASS RANGE — where techno and psy basslines live</div>
          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
            {bassNotes.map(n => (
              <div key={n.freq} onClick={() => playNote(n.freq, n.name)}
                style={{ display:'flex', alignItems:'center', gap:12, padding:'8px 12px', background: activeNote===n.name ? color+'20' : '#1a1a2e', border:`1px solid ${activeNote===n.name ? color : '#2a2a3e'}`, borderRadius:4, cursor:'pointer' }}>
                <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:20, color, letterSpacing:2, width:36 }}>{n.name}</span>
                <span style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:10, color:'#555' }}>{n.freq}Hz</span>
                <span style={{ fontFamily:"'Rajdhani',sans-serif", fontSize:13, color:'#666' }}>{n.desc}</span>
                <span style={{ marginLeft:'auto', color:'#444' }}>▶</span>
              </div>
            ))}
          </div>
        </div>
      </FSection>

      <FSection title="WHY THIS MATTERS IN ELECTRONIC MUSIC" icon="⚡" color={color}>
        <FText>When you hear a psytrance bassline rolling and shifting in pitch — it's just a sequence of notes from the list above, played one after another by a synthesizer. When an arpeggio spirals upward — it's just notes going up the scale. There's no magic. Just frequencies with names, timed to a grid.</FText>
      </FSection>

      <FCheck color={color} onPass={() => { onComplete(); setPassed(true); }}
        questions={[
          { q:"What is an octave?", options:["8 notes played simultaneously","The same note at double the frequency — one step higher","A type of musical scale","The gap between a kick and a snare"], correct:1 },
          { q:"How many different note names are there in Western music?", options:["7","8","12","24"], correct:2 },
          { q:"A psy bassline changes pitch throughout the track. What is it actually doing?", options:["The BPM is changing","The synthesizer is playing a sequence of different notes","The volume is going up and down","The filter is opening and closing"], correct:1 },
        ]}
      />
      {passed && <div style={{ marginTop:14, color:'#00ffcc', fontFamily:"'Share Tech Mono',monospace", fontSize:11, letterSpacing:2 }}>✓ MODULE 5 COMPLETE</div>}
    </div>
  );
}

// ─── MODULE 6: SCALES ────────────────────────────────────────────

function ModuleScales({ color, onComplete }) {
  const [passed, setPassed] = useState(false);
  const [playing, setPlaying] = useState(null);
  const ctxRef = useRef(null);

  const playMelody = (freqs, type) => {
    if (!ctxRef.current) ctxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    const ctx = ctxRef.current;
    if (ctx.state === 'suspended') ctx.resume();
    setPlaying(type);
    freqs.forEach((f, i) => {
      const t = ctx.currentTime + i * 0.22;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.value = f;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.25, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
      osc.connect(g); g.connect(ctx.destination);
      osc.start(t); osc.stop(t + 0.22);
    });
    setTimeout(() => setPlaying(null), freqs.length * 220 + 200);
  };

  const demos = [
    { type:'major', label:'MAJOR SCALE', desc:'Bright, happy, euphoric', freqs:[261.6,293.7,329.6,349.2,392,440,493.9,523.3], emotion:'☀️ Uplifting', genres:'Full-On Psy, Progressive Psy, Melodic Techno', color:'#ffd93d' },
    { type:'minor', label:'MINOR SCALE', desc:'Dark, sad, tense, emotional', freqs:[261.6,293.7,311.1,349.2,392,415.3,466.2,523.3], emotion:'🌑 Dark & tense', genres:'Dark Psy, Industrial Techno, Dark Techno', color:'#c678ff' },
    { type:'phrygian', label:'PHRYGIAN MODE', desc:'Exotic, mysterious, Middle-Eastern feel', freqs:[261.6,277.2,311.1,349.2,392,415.3,466.2,523.3], emotion:'🌙 Exotic & mysterious', genres:'Goa Trance, Neogoa, Tribal Psy', color:'#ff9f43' },
    { type:'majorArp', label:'MAJOR ARPEGGIO', desc:'Ascending chord notes — euphoric climb', freqs:[261.6,329.6,392,523.3,392,329.6,261.6], emotion:'🚀 Climbing, euphoric', genres:'Full-On Psy arpeggios, Goa leads', color:'#00ffcc' },
    { type:'minorArp', label:'MINOR ARPEGGIO', desc:'Same pattern, minor key — now it feels ominous', freqs:[261.6,311.1,392,523.3,392,311.1,261.6], emotion:'⚡ Tension, ominous', genres:'Dark Psy basslines, Industrial Techno', color:'#ff6b6b' },
  ];

  return (
    <div>
      <FSection title="THE CONCEPT" icon="💡" color={color}>
        <FText>A scale is a selection of notes — out of the 12 available — that sound good together. Think of it like choosing a colour palette. Major scales use bright colours. Minor scales use dark ones. The "key" a track is in means which set of notes it's built from.</FText>
        <FText>This is why Dark Psy sounds menacing and Full-On Psy sounds euphoric even at the same BPM. Same tempo, same kick pattern — completely different emotional experience. The key changes everything.</FText>
        <FBox color={color} type="key">
          <p style={{ fontFamily:"'Rajdhani',sans-serif", fontSize:15, color:'#bbb', margin:0, lineHeight:1.8 }}>
            <strong style={{color:'#ffd93d'}}>Major key</strong> = happy, bright, uplifting. Most Full-On Psy, most pop music.<br/>
            <strong style={{color:'#c678ff'}}>Minor key</strong> = dark, tense, emotional. Dark Psy, Industrial Techno, most film scores.<br/>
            <strong style={{color:'#ff9f43'}}>Phrygian mode</strong> = exotic, mysterious, slightly ominous. Goa Trance's Eastern sound comes from this.<br/>
            <strong style={{color:'#00ffcc'}}>You don't need to memorise these</strong> — just train your ear to hear the difference.
          </p>
        </FBox>
      </FSection>

      <FSection title="INTERACTIVE — HEAR THE EMOTIONAL DIFFERENCE" icon="🎛️" color={color}>
        <p style={{ fontFamily:"'Rajdhani',sans-serif", fontSize:14, color:'#666', marginBottom:16 }}>Press each button to hear the scale or arpeggio. Notice how different each one feels — even though they use the same rhythm and similar notes.</p>
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {demos.map(d => (
            <div key={d.type} style={{ background: playing===d.type ? d.color+'12' : '#0a0a14', border:`1px solid ${playing===d.type ? d.color : '#1a1a2e'}`, borderRadius:8, padding:'14px 16px', display:'grid', gridTemplateColumns:'1fr auto', gap:16, alignItems:'center', transition:'all 0.2s' }}>
              <div>
                <div style={{ display:'flex', gap:10, alignItems:'center', marginBottom:4 }}>
                  <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:18, color:d.color, letterSpacing:2 }}>{d.label}</span>
                  <span style={{ fontFamily:"'Rajdhani',sans-serif", fontSize:13, color:'#555' }}>{d.desc}</span>
                </div>
                <div style={{ fontFamily:"'Rajdhani',sans-serif", fontSize:14, color:'#888' }}>{d.emotion}</div>
                <div style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:9, color:'#444', marginTop:3, letterSpacing:1 }}>HEARD IN: {d.genres}</div>
              </div>
              <button onClick={() => playMelody(d.freqs, d.type)}
                style={{ background: playing===d.type ? d.color : d.color+'20', border:`1px solid ${d.color}`, color: playing===d.type ? '#000' : d.color, padding:'8px 16px', fontFamily:"'Share Tech Mono',monospace", fontSize:11, letterSpacing:2, cursor:'pointer', borderRadius:4, fontWeight:700, flexShrink:0 }}>
                {playing===d.type ? '♪ PLAYING' : '▶ PLAY'}
              </button>
            </div>
          ))}
        </div>
      </FSection>

      <FSection title="WHY THIS MATTERS" icon="⚡" color={color}>
        <FText>DJs who understand keys can mix harmonically — choosing which track to play next based on whether its key is compatible with the current one. This is called harmonic mixing. When two tracks in clashing keys are mixed together, the result sounds tense and wrong. When they're in compatible keys, the mix sounds inevitable and beautiful.</FText>
        <FText>As a listener, training your ear to recognise major vs minor vs exotic modes lets you immediately categorise what you're hearing emotionally — even before you identify the genre or the artist.</FText>
      </FSection>

      <FCheck color={color} onPass={() => { onComplete(); setPassed(true); }}
        questions={[
          { q:"You're at a festival and the music sounds euphoric and uplifting. It's most likely in a:", options:["Minor key","Phrygian mode","Major key","Chromatic scale"], correct:2 },
          { q:"What makes Goa Trance sound exotic and Middle-Eastern compared to other psy genres?", options:["It uses a higher BPM","It uses the Phrygian mode or similar exotic scales","It has no kick drum","The producer is from India"], correct:1 },
          { q:"Two tracks are being mixed. They're in clashing keys. What do you hear?", options:["Nothing unusual","The mix sounds tense and wrong — the notes fight each other","The BPM changes","One track becomes quieter"], correct:1 },
        ]}
      />
      {passed && <div style={{ marginTop:14, color:'#00ffcc', fontFamily:"'Share Tech Mono',monospace", fontSize:11, letterSpacing:2 }}>✓ MODULE 6 COMPLETE</div>}
    </div>
  );
}

// ─── MODULE 7: FREQUENCY & MIX ───────────────────────────────────

function ModuleFrequency({ color, onComplete }) {
  const [passed, setPassed] = useState(false);
  const [playing, setPlaying] = useState(null);
  const [activeZone, setActiveZone] = useState(null);
  const ctxRef = useRef(null);
  const canvasRef = useRef(null);
  const analyserRef = useRef(null);
  const animRef = useRef(null);
  const sourceRef = useRef(null);

  const zones = [
    { id:'sub',   label:'SUB BASS',   range:'20–60Hz',    color:'#c678ff', desc:'You feel this more than hear it. The physical thud in your chest at a rave. The very bottom of a kick drum. Most speakers cannot reproduce this — you need a subwoofer.', examples:'Kick drum body, deep sub bass drops', emoji:'💥' },
    { id:'bass',  label:'BASS',       range:'60–250Hz',   color:'#ff6b6b', desc:'The warm, heard-and-felt range. Where the kick drum punch lives. Where the bassline melody sits. The most congested range in electronic music — everything wants to live here.', examples:'Kick punch, bassline notes, bass synths', emoji:'🔊' },
    { id:'low',   label:'LOW MIDS',   range:'250–800Hz',  color:'#ff9f43', desc:'The body and warmth of instruments. Muddy if overloaded. Pads and chords often live here. This range makes music feel full and warm vs thin and cold.', examples:'Pad chords, synth body, snare body', emoji:'🎹' },
    { id:'mid',   label:'MIDS',       range:'800Hz–3kHz', color:'#ffd93d', desc:'The most sensitive range for human hearing. Voices live here. Snare crack, synth leads. This is where the "edge" of a sound comes from. Too much = harsh, too little = hollow.', examples:'Snare crack, lead synths, acid line body', emoji:'🎵' },
    { id:'highmid',label:'HIGH MIDS', range:'3–8kHz',     color:'#a8e6cf', desc:'Presence and aggression. The "sizzle" in a hi-hat. The "attack" of a synth. This range makes sounds cut through a mix. Hard techno pushes this range hard for aggression.', examples:'Hi-hat attack, synth bite, clap snap', emoji:'✨' },
    { id:'high',  label:'HIGHS',      range:'8kHz–20kHz', color:'#00ffcc', desc:'Air, sparkle, and shimmer. The ring of a cymbal after it\'s hit. The "air" behind a pad. This range is often reduced on club systems to protect ears at high volumes.', examples:'Open hi-hats ringing, cymbal shimmer, synthesizer air', emoji:'🎩' },
  ];

  const playBand = (id) => {
    if (!ctxRef.current) ctxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    const ctx = ctxRef.current;
    if (ctx.state === 'suspended') ctx.resume();
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    const freqMap = { sub:40, bass:100, low:400, mid:1500, highmid:5000, high:12000 };
    osc.type = id === 'sub' || id === 'bass' ? 'sine' : id === 'low' || id === 'mid' ? 'sawtooth' : 'square';
    osc.frequency.value = freqMap[id];
    g.gain.setValueAtTime(0.35, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);
    osc.connect(g); g.connect(ctx.destination);
    osc.start(); osc.stop(ctx.currentTime + 1.3);
    setPlaying(id);
    setTimeout(() => setPlaying(null), 1300);
  };

  return (
    <div>
      <FSection title="THE CONCEPT" icon="💡" color={color}>
        <FText>Every sound contains multiple frequencies simultaneously. A kick drum isn't just one frequency — it's a burst of energy across the entire bass range, with a spike at its fundamental frequency and harmonics above. A synth pad is a complex cloud of frequencies all blending together.</FText>
        <FText>Producers divide the frequency spectrum into zones and manage each zone separately. This is how a kick, a bassline, a synth, and a hi-hat can all play simultaneously without turning into chaos — each one occupies a different frequency neighbourhood.</FText>
        <FBox color={color}>
          <p style={{ fontFamily:"'Rajdhani',sans-serif", fontSize:15, color:'#bbb', margin:0 }}>
            Think of the frequency spectrum like a block of flats. Each floor is a different frequency range. If you put too many people on the same floor (too many elements in the same frequency range) — it's overcrowded and noisy. Good mixing is about giving each element its own floor.
          </p>
        </FBox>
      </FSection>

      <FSection title="INTERACTIVE — EXPLORE THE FREQUENCY SPECTRUM" icon="🎛️" color={color}>
        <p style={{ fontFamily:"'Rajdhani',sans-serif", fontSize:14, color:'#666', marginBottom:16 }}>Click each zone to hear what that frequency range sounds like, and understand what lives there in a techno or psy track.</p>
        <div style={{ display:'flex', flexDirection:'column', gap:6, marginBottom:16 }}>
          {zones.map(z => (
            <div key={z.id} onClick={() => { setActiveZone(activeZone===z.id ? null : z.id); playBand(z.id); }}
              style={{ background: activeZone===z.id ? z.color+'15' : '#0a0a14', border:`1px solid ${activeZone===z.id ? z.color : '#1a1a2e'}`, borderRadius:6, padding:'12px 16px', cursor:'pointer', transition:'all 0.2s' }}>
              <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom: activeZone===z.id ? 10 : 0 }}>
                <span style={{ fontSize:20 }}>{z.emoji}</span>
                <div style={{ flex:1 }}>
                  <div style={{ display:'flex', gap:10, alignItems:'center' }}>
                    <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:18, color:z.color, letterSpacing:2 }}>{z.label}</span>
                    <span style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:10, color:'#444', letterSpacing:1 }}>{z.range}</span>
                  </div>
                </div>
                <div style={{ width:60, height:6, background:'#1a1a2e', borderRadius:3 }}>
                  <div style={{ width: playing===z.id ? '100%' : activeZone===z.id ? '60%' : '0%', height:'100%', background:z.color, borderRadius:3, transition:'width 0.1s' }} />
                </div>
                <span style={{ color: activeZone===z.id ? z.color : '#444', fontSize:14 }}>▶</span>
              </div>
              {activeZone===z.id && (
                <div style={{ paddingLeft:32 }}>
                  <p style={{ fontFamily:"'Rajdhani',sans-serif", fontSize:15, color:'#bbb', margin:'0 0 6px', lineHeight:1.6 }}>{z.desc}</p>
                  <p style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:10, color:'#555', letterSpacing:1, margin:0 }}>EXAMPLES: {z.examples}</p>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Visual spectrum bar */}
        <div style={{ background:'#07070f', border:'1px solid #1a1a2e', padding:16, borderRadius:8 }}>
          <div style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:10, color:'#444', letterSpacing:2, marginBottom:10 }}>FREQUENCY SPECTRUM — LOW TO HIGH</div>
          <div style={{ display:'flex', height:40, borderRadius:4, overflow:'hidden', marginBottom:8 }}>
            {zones.map(z => (
              <div key={z.id} onClick={() => { setActiveZone(z.id); playBand(z.id); }}
                style={{ flex:1, background: activeZone===z.id ? z.color : z.color+'40', transition:'all 0.2s', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <span style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:8, color: activeZone===z.id ? '#000' : z.color, letterSpacing:0, fontWeight:700 }}>
                  {z.id==='sub'?'SUB':z.id==='bass'?'BASS':z.id==='low'?'LO\nMID':z.id==='mid'?'MID':z.id==='highmid'?'HI\nMID':'HIGH'}
                </span>
              </div>
            ))}
          </div>
          <div style={{ display:'flex', justifyContent:'space-between', fontFamily:"'Share Tech Mono',monospace", fontSize:9, color:'#333' }}>
            <span>20Hz ←</span><span>FEEL</span><span>HEAR</span><span>SHARP</span><span>→ 20kHz</span>
          </div>
        </div>
      </FSection>

      <FSection title="WHY THIS MATTERS" icon="⚡" color={color}>
        <FText>When a DJ uses the EQ knobs on their mixer — the Low, Mid, and High knobs — they're boosting or cutting these frequency zones in real time. Turning the Low knob down on the outgoing track removes the bass and kick frequencies. The crowd feels the bass disappear. Then when the new track's Low knob comes up — the bass returns, the drop hits, everyone goes wild. That's just frequency management.</FText>
        <FText>Every EQ kill, every filter sweep, every build and drop is manipulating the frequency spectrum. Now you understand what's actually happening.</FText>
      </FSection>

      <FCheck color={color} onPass={() => { onComplete(); setPassed(true); }}
        questions={[
          { q:"At a rave you feel the kick in your chest physically. Which frequency range causes this?", options:["High mids (3-8kHz)","Mids (800Hz-3kHz)","Sub bass (20-60Hz)","Highs (8kHz+)"], correct:2 },
          { q:"A DJ turns down the Low knob on their mixer. What disappears from the sound?", options:["The hi-hats","The kick drum and bass frequencies","The vocal samples","The reverb"], correct:1 },
          { q:"Hi-hats sound sharp and high. Which frequency zone do they primarily occupy?", options:["Sub bass","Bass","Low mids","High mids and Highs"], correct:3 },
        ]}
      />
      {passed && <div style={{ marginTop:14, color:'#00ffcc', fontFamily:"'Share Tech Mono',monospace", fontSize:11, letterSpacing:2 }}>✓ MODULE 7 COMPLETE</div>}
    </div>
  );
}

// ─── MODULE 8: BUILD A TRACK ─────────────────────────────────────

function ModuleBuild({ color, onComplete }) {
  const [step, setStep] = useState(0);
  const [passed, setPassed] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(-1);
  const timerRef = useRef(null);
  const stepRef = useRef(-1);
  const ctxRef = useRef(null);

  const buildSteps = [
    { id:0, title:'Start with silence', desc:'Every track starts with nothing. A blank 16-step grid at a chosen BPM. We\'re starting at 132 BPM — classic techno tempo.', active:[], module:'Module 3 — BPM', moduleColor:'#ffd93d' },
    { id:1, title:'Add the 4/4 kick', desc:'The skeleton of the track. Kick on every beat — steps 1, 5, 9, 13. This is the pulse. Everything else is built around this.', active:['kick'], module:'Module 4 — The Grid', moduleColor:'#a8e6cf' },
    { id:2, title:'Add the offbeat hi-hat', desc:'Hi-hats between the kicks — steps 3, 7, 11, 15. This creates the classic techno forward momentum. Kick on the beat, hat between the beats.', active:['kick','hat'], module:'Module 4 — The Grid', moduleColor:'#a8e6cf' },
    { id:3, title:'Add the backbeat snare', desc:'Snare on beats 2 and 4 — steps 5 and 13. Creates tension and release. Now you have the full classic drum pattern.', active:['kick','hat','snare'], module:'Module 4 + Module 2', moduleColor:'#a8e6cf' },
    { id:4, title:'Add a bassline', desc:'A sequence of notes in minor key — dark and driving. Notice how the note choice (minor scale) immediately creates a mood. Compare to the kick alone — completely different feeling.', active:['kick','hat','snare','bass'], module:'Module 5 + Module 6', moduleColor:'#c678ff' },
    { id:5, title:'The complete pattern', desc:'All four elements together — this IS a techno track in miniature. Kick (sub bass range), hi-hat (high frequency), snare (mid range), bass (bass range). Each in its own frequency zone. Each serving a different purpose.', active:['kick','hat','snare','bass'], module:'Module 7 — Frequency', moduleColor:'#48dbfb' },
  ];

  const patterns = {
    kick:  [1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0],
    hat:   [0,0,1,0,0,0,1,0,0,0,1,0,0,0,1,0],
    snare: [0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0],
    bass:  [1,0,0,1,0,1,0,0,1,0,0,1,0,0,1,0],
  };
  const bassNotes = [82,82,110,73,82,73,82,82,65,82,110,65,82,73,82,65];
  const rowColors = { kick:'#ff6b6b', hat:'#00ffcc', snare:'#ffd93d', bass:'#c678ff' };
  const rowLabels = { kick:'KICK', hat:'HI-HAT', snare:'SNARE', bass:'BASS' };

  const currentBuild = buildSteps[step];
  const activeRows = currentBuild.active;

  const playStep_ = (s) => {
    if (!ctxRef.current) ctxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    const ctx = ctxRef.current;
    if (ctx.state === 'suspended') ctx.resume();
    const t = ctx.currentTime;
    if (activeRows.includes('kick') && patterns.kick[s]) { const o=ctx.createOscillator(),g=ctx.createGain(); o.frequency.setValueAtTime(110,t); o.frequency.exponentialRampToValueAtTime(42,t+0.1); g.gain.setValueAtTime(0.8,t); g.gain.exponentialRampToValueAtTime(0.001,t+0.35); o.connect(g); g.connect(ctx.destination); o.start(t); o.stop(t+0.4); }
    if (activeRows.includes('hat') && patterns.hat[s]) { const sz=Math.floor(ctx.sampleRate*0.05),buf=ctx.createBuffer(1,sz,ctx.sampleRate); const d=buf.getChannelData(0); for(let i=0;i<sz;i++) d[i]=Math.random()*2-1; const src=ctx.createBufferSource(); src.buffer=buf; const hp=ctx.createBiquadFilter(); hp.type='highpass'; hp.frequency.value=8000; const g=ctx.createGain(); g.gain.setValueAtTime(0.18,t); g.gain.exponentialRampToValueAtTime(0.001,t+0.04); src.connect(hp); hp.connect(g); g.connect(ctx.destination); src.start(t); src.stop(t+0.06); }
    if (activeRows.includes('snare') && patterns.snare[s]) { const sz=Math.floor(ctx.sampleRate*0.12),buf=ctx.createBuffer(1,sz,ctx.sampleRate); const d=buf.getChannelData(0); for(let i=0;i<sz;i++) d[i]=Math.random()*2-1; const src=ctx.createBufferSource(); src.buffer=buf; const bp=ctx.createBiquadFilter(); bp.type='bandpass'; bp.frequency.value=2000; const g=ctx.createGain(); g.gain.setValueAtTime(0.32,t); g.gain.exponentialRampToValueAtTime(0.001,t+0.1); src.connect(bp); bp.connect(g); g.connect(ctx.destination); src.start(t); src.stop(t+0.13); }
    if (activeRows.includes('bass') && patterns.bass[s]) { const o=ctx.createOscillator(); o.type='sawtooth'; o.frequency.value=bassNotes[s]; const g=ctx.createGain(); g.gain.setValueAtTime(0.28,t); g.gain.exponentialRampToValueAtTime(0.001,t+0.16); o.connect(g); g.connect(ctx.destination); o.start(t); o.stop(t+0.18); }
  };

  useEffect(() => {
    if (playing) {
      timerRef.current = setInterval(() => {
        stepRef.current = (stepRef.current + 1) % 16;
        setCurrentStep(stepRef.current);
        playStep_(stepRef.current);
      }, (60/132/4)*1000);
    } else { clearInterval(timerRef.current); setCurrentStep(-1); stepRef.current=-1; }
    return () => clearInterval(timerRef.current);
  }, [playing, step]);

  useEffect(() => () => clearInterval(timerRef.current), []);

  return (
    <div>
      <div style={{ background:'#0a0a14', border:'1px solid #1a1a2e', padding:16, borderRadius:8, marginBottom:24 }}>
        <div style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:10, color:'#444', letterSpacing:2, marginBottom:10 }}>BUILD PROGRESS — 132 BPM</div>
        <div style={{ display:'flex', gap:6 }}>
          {buildSteps.map((bs, i) => (
            <div key={i} onClick={() => { setPlaying(false); setStep(i); }}
              style={{ flex:1, height:6, borderRadius:3, background: i <= step ? color : '#1a1a2e', cursor:'pointer', transition:'all 0.3s' }} />
          ))}
        </div>
        <div style={{ marginTop:8, fontFamily:"'Share Tech Mono',monospace", fontSize:10, color:'#555', letterSpacing:1 }}>STEP {step+1} OF {buildSteps.length}: {currentBuild.title.toUpperCase()}</div>
      </div>

      {/* Current step */}
      <div style={{ background:'#0d1a14', border:`1px solid ${color}30`, borderLeft:`3px solid ${color}`, padding:'16px 20px', marginBottom:24 }}>
        <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:24, color:'#fff', letterSpacing:2, marginBottom:6 }}>{currentBuild.title}</div>
        <p style={{ fontFamily:"'Rajdhani',sans-serif", fontSize:16, color:'#bbb', margin:'0 0 10px', lineHeight:1.6 }}>{currentBuild.desc}</p>
        <div style={{ display:'flex', gap:6, alignItems:'center' }}>
          <span style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:9, color:'#444', letterSpacing:1 }}>CONCEPT FROM:</span>
          <span style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:9, color:currentBuild.moduleColor, letterSpacing:1, background:currentBuild.moduleColor+'15', padding:'2px 8px' }}>{currentBuild.module}</span>
        </div>
      </div>

      {/* Grid */}
      <div style={{ background:'#07070f', border:'1px solid #1a1a2e', padding:16, borderRadius:8, marginBottom:20 }}>
        {/* Beat labels */}
        <div style={{ display:'grid', gridTemplateColumns:'56px repeat(16,1fr)', gap:2, marginBottom:4 }}>
          <div />
          {Array.from({length:16},(_,i) => (
            <div key={i} style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:7, color:[0,4,8,12].includes(i)?'#555':'#222', textAlign:'center' }}>
              {[0,4,8,12].includes(i) ? `B${i/4+1}` : ''}
            </div>
          ))}
        </div>
        {['kick','hat','snare','bass'].map(row => {
          const active = activeRows.includes(row);
          return (
            <div key={row} style={{ display:'grid', gridTemplateColumns:'56px repeat(16,1fr)', gap:2, marginBottom:4, opacity: active ? 1 : 0.15, transition:'opacity 0.4s' }}>
              <div style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:9, color:rowColors[row], letterSpacing:1, display:'flex', alignItems:'center' }}>{rowLabels[row]}</div>
              {patterns[row].map((v, i) => (
                <div key={i} style={{ height:26, background: active && currentStep===i ? (v ? rowColors[row] : rowColors[row]+'20') : (active && v ? rowColors[row]+'80' : '#1a1a2e'), border:`1px solid ${active && v ? rowColors[row]+'60' : '#2a2a3e'}`, borderRadius:2, marginLeft:i%4===0&&i>0?3:0, transition:'background 0.05s', boxShadow: active && currentStep===i && v ? `0 0 8px ${rowColors[row]}88`:'' }} />
              ))}
            </div>
          );
        })}
      </div>

      {/* Controls */}
      <div style={{ display:'flex', gap:10, marginBottom:28 }}>
        <button onClick={() => setPlaying(p => !p)}
          style={{ background: playing ? '#2a0d0d' : color, border:`1px solid ${playing?'#ff6b6b':color}`, color: playing?'#ff6b6b':'#000', padding:'10px 24px', fontFamily:"'Share Tech Mono',monospace", fontSize:11, letterSpacing:2, cursor:'pointer', fontWeight:700, borderRadius:4 }}>
          {playing ? '■ STOP' : '▶ PLAY'}
        </button>
        {step > 0 && <button onClick={() => { setPlaying(false); setStep(s => s-1); }} style={{ background:'transparent', border:'1px solid #333', color:'#666', padding:'10px 16px', fontFamily:"'Share Tech Mono',monospace", fontSize:11, cursor:'pointer', borderRadius:4 }}>← PREV</button>}
        {step < buildSteps.length-1 && <button onClick={() => { setPlaying(false); setStep(s => s+1); }} style={{ background:color+'20', border:`1px solid ${color}`, color, padding:'10px 16px', fontFamily:"'Share Tech Mono',monospace", fontSize:11, cursor:'pointer', borderRadius:4 }}>NEXT STEP →</button>}
      </div>

      {step === buildSteps.length - 1 && (
        <FBox color={color}>
          <p style={{ fontFamily:"'Rajdhani',sans-serif", fontSize:16, color:'#bbb', margin:'0 0 10px', lineHeight:1.7 }}>
            <strong style={{color}}>You just built a complete techno pattern.</strong> Four elements, each in its own frequency zone, each serving a different rhythmic purpose. This is the foundation that every track in your genre map is built on — just with more complexity, better sound design, and more layers.
          </p>
          <p style={{ fontFamily:"'Rajdhani',sans-serif", fontSize:15, color:'#888', margin:0 }}>
            Now go to the Glossary and every term will make more sense. Open the DJ Booth and every knob will make more sense. Listen to any track in the Genre Map and you'll hear the kick, hat, snare, and bass as separate elements — not just one wall of sound.
          </p>
        </FBox>
      )}

      <FCheck color={color} onPass={() => { onComplete(); setPassed(true); }}
        questions={[
          { q:"In the pattern you just built, what is the purpose of the hi-hat?", options:["It provides the bass frequencies","It sits between the kicks creating forward momentum on the offbeat","It's the same as the snare","It defines the BPM"], correct:1 },
          { q:"Why does adding a bassline change the emotional feel of the pattern completely?", options:["Because it's louder","Because the note choices (the scale/key) carry emotional meaning","Because it changes the BPM","Because it fills the high frequency range"], correct:1 },
          { q:"In a full techno track, what stops the kick, bassline, snare, and hi-hat from all sounding like mud?", options:["They're played at different volumes","Each element occupies a different frequency zone — they don't fight","They're played on different BPMs","Only 2 elements play at once"], correct:1 },
        ]}
      />
      {passed && (
        <div style={{ marginTop:16, background:'#0d1a14', border:'1px solid #00ffcc30', padding:20, borderRadius:8 }}>
          <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:24, color:'#00ffcc', letterSpacing:3, marginBottom:8 }}>✓ ALL 8 MODULES COMPLETE</div>
          <p style={{ fontFamily:"'Rajdhani',sans-serif", fontSize:16, color:'#bbb', margin:'0 0 12px', lineHeight:1.7 }}>You now understand sound, pulse, tempo, the grid, notes, scales, frequencies, and how a full track is constructed. You're ready for everything else in this platform.</p>
          <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
            {[['GLOSSARY','#00ffcc'],['DJ BOOTH','#ff6b6b'],['GENRE MAP','#c678ff']].map(([l,c]) => (
              <div key={l} style={{ background:c+'20', border:`1px solid ${c}50`, padding:'6px 16px', fontFamily:"'Share Tech Mono',monospace", fontSize:10, color:c, letterSpacing:2 }}>{l} →</div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}





// ═══════════════════════════════════════════════════════════════
// FOUNDATIONS MODULE — 8-module music theory course for beginners
// ═══════════════════════════════════════════════════════════════

function FoundationsModule() {
  const [activeModule, setActiveModule] = useState(null);
  const [completed, setCompleted] = useState({});
  const [checkAnswers, setCheckAnswers] = useState({});
  const audioCtxRef = useRef(null);

  const getCtx = () => {
    if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
      audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtxRef.current.state === 'suspended') audioCtxRef.current.resume();
    return audioCtxRef.current;
  };

  const markComplete = (id) => setCompleted(p => ({ ...p, [id]: true }));

  const modules = [
    { id: 1, title: "What is Sound", subtitle: "Before beats, before music", time: 8, color: "#00ffcc" },
    { id: 2, title: "Pulse and Beat", subtitle: "The heartbeat underneath all music", time: 7, color: "#69f0ae" },
    { id: 3, title: "BPM and Tempo", subtitle: "How fast is fast", time: 6, color: "#ffca28" },
    { id: 4, title: "The Grid", subtitle: "Bars, beats, and steps — the skeleton of every track", time: 12, color: "#ff7043" },
    { id: 5, title: "Notes and Pitch", subtitle: "The alphabet of melody", time: 8, color: "#7986cb" },
    { id: 6, title: "Scales and Keys", subtitle: "Why some music sounds dark and some sounds euphoric", time: 8, color: "#ba68c8" },
    { id: 7, title: "Frequency and the Mix", subtitle: "Why music has layers and how to hear them", time: 10, color: "#4fc3f7" },
    { id: 8, title: "Putting It All Together", subtitle: "From silence to a complete techno pattern", time: 15, color: "#f06292" },
  ];

  const doneCount = Object.keys(completed).length;

  if (activeModule) {
    const mod = modules.find(m => m.id === activeModule);
    return (
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '0 0 60px' }}>
        {/* Back nav */}
        <button onClick={() => setActiveModule(null)}
          style={{ background: 'transparent', border: '1px solid #ffffff18', color: '#888', padding: '8px 16px', cursor: 'pointer', fontFamily: "'Share Tech Mono',monospace", fontSize: 11, letterSpacing: 2, marginBottom: 24 }}>
          ← BACK TO MODULES
        </button>

        {/* Module header */}
        <div style={{ borderLeft: `4px solid ${mod.color}`, paddingLeft: 20, marginBottom: 32 }}>
          <div style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 10, color: mod.color, letterSpacing: 3, marginBottom: 6 }}>
            MODULE {mod.id} OF 8 · {mod.time} MIN
          </div>
          <h2 style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 38, color: '#fff', letterSpacing: 3, marginBottom: 4 }}>{mod.title}</h2>
          <p style={{ color: '#555', fontFamily: "'Rajdhani',sans-serif", fontSize: 16 }}>{mod.subtitle}</p>
        </div>

        {/* Module content */}
        <ModuleContent id={activeModule} color={mod.color} getCtx={getCtx}
          checkAnswers={checkAnswers} setCheckAnswers={setCheckAnswers}
          onComplete={() => { markComplete(activeModule); }} />

        {/* Nav footer */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 40, paddingTop: 24, borderTop: '1px solid #ffffff0a' }}>
          <button onClick={() => setActiveModule(null)}
            style={{ background: 'transparent', border: '1px solid #ffffff18', color: '#666', padding: '10px 20px', cursor: 'pointer', fontFamily: "'Share Tech Mono',monospace", fontSize: 11, letterSpacing: 2 }}>
            ← ALL MODULES
          </button>
          {activeModule < 8 && (
            <button onClick={() => { markComplete(activeModule); setActiveModule(activeModule + 1); }}
              style={{ background: mod.color, border: 'none', color: '#000', padding: '10px 24px', cursor: 'pointer', fontFamily: "'Share Tech Mono',monospace", fontSize: 11, letterSpacing: 2, fontWeight: 700 }}>
              NEXT MODULE →
            </button>
          )}
          {activeModule === 8 && (
            <button onClick={() => { markComplete(8); setActiveModule(null); }}
              style={{ background: mod.color, border: 'none', color: '#000', padding: '10px 24px', cursor: 'pointer', fontFamily: "'Share Tech Mono',monospace", fontSize: 11, letterSpacing: 2, fontWeight: 700 }}>
              COMPLETE ✓
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: '0 0 60px' }}>
      {/* Header */}
      <div style={{ marginBottom: 40 }}>
        <div style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 10, color: '#00ffcc', letterSpacing: 3, marginBottom: 10 }}>START HERE</div>
        <h2 style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 48, color: '#fff', letterSpacing: 4, marginBottom: 10 }}>FOUNDATIONS</h2>
        <p style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: 17, color: '#888', maxWidth: 560, lineHeight: 1.7 }}>
          You don't need to know anything about music to start here. These 8 modules cover everything a complete beginner needs to understand electronic music — from what sound physically is, to building your first techno pattern from scratch.
        </p>
      </div>

      {/* Progress bar */}
      <div style={{ marginBottom: 36 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 10, color: '#555', letterSpacing: 2 }}>PROGRESS</span>
          <span style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 10, color: doneCount > 0 ? '#00ffcc' : '#555', letterSpacing: 2 }}>{doneCount} / 8 COMPLETE</span>
        </div>
        <div style={{ height: 3, background: '#ffffff0a', borderRadius: 2 }}>
          <div style={{ height: '100%', background: '#00ffcc', width: `${(doneCount / 8) * 100}%`, borderRadius: 2, transition: 'width 0.4s ease', boxShadow: doneCount > 0 ? '0 0 10px #00ffcc66' : 'none' }} />
        </div>
      </div>

      {/* Suggested path label */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <div style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 10, color: '#333', letterSpacing: 2 }}>SUGGESTED PATH</div>
        <div style={{ flex: 1, height: 1, background: '#ffffff08' }} />
        <div style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 10, color: '#333', letterSpacing: 2 }}>ALL MODULES ACCESSIBLE</div>
      </div>

      {/* Module cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {modules.map((mod, idx) => {
          const done = completed[mod.id];
          const suggested = !done && !Object.values(completed).slice(idx).some(Boolean);
          return (
            <button key={mod.id} onClick={() => setActiveModule(mod.id)}
              style={{ background: done ? mod.color + '08' : '#0d0d14', border: `1px solid ${done ? mod.color + '44' : suggested ? '#ffffff18' : '#ffffff0a'}`, padding: '18px 22px', cursor: 'pointer', textAlign: 'left', display: 'grid', gridTemplateColumns: '48px 1fr auto', alignItems: 'center', gap: 16, transition: 'all 0.2s' }}>
              {/* Number / status */}
              <div style={{ width: 48, height: 48, border: `2px solid ${done ? mod.color : '#ffffff15'}`, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: done ? mod.color + '20' : 'transparent', flexShrink: 0 }}>
                {done
                  ? <span style={{ color: mod.color, fontSize: 18 }}>✓</span>
                  : <span style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 22, color: suggested ? '#fff' : '#444', letterSpacing: 1 }}>{mod.id}</span>
                }
              </div>
              {/* Text */}
              <div>
                <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 20, color: done ? mod.color : suggested ? '#fff' : '#555', letterSpacing: 2, marginBottom: 3 }}>{mod.title}</div>
                <div style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: 13, color: '#555', lineHeight: 1.4 }}>{mod.subtitle}</div>
              </div>
              {/* Time + arrow */}
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 10, color: '#333', letterSpacing: 1, marginBottom: 4 }}>{mod.time} MIN</div>
                <div style={{ color: suggested ? mod.color : '#333', fontSize: 16 }}>→</div>
              </div>
            </button>
          );
        })}
      </div>

      {doneCount === 8 && (
        <div style={{ marginTop: 32, background: '#00ffcc08', border: '1px solid #00ffcc30', padding: '24px 28px', textAlign: 'center' }}>
          <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 28, color: '#00ffcc', letterSpacing: 3, marginBottom: 8 }}>FOUNDATIONS COMPLETE</div>
          <p style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: 15, color: '#888' }}>You now understand the building blocks of all electronic music. Explore the Glossary, DJ Booth, and Genre Map with fresh ears.</p>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────
// Each module's actual content
// ─────────────────────────────────────────────────────
function ModuleContent({ id, color, getCtx, checkAnswers, setCheckAnswers, onComplete }) {
  const setAnswer = (qid, val) => setCheckAnswers(p => ({ ...p, [qid]: val }));
  const answered = (qid) => checkAnswers[qid];

  const Section = ({ title, children }) => (
    <div style={{ marginBottom: 28 }}>
      <div style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 10, color, letterSpacing: 3, marginBottom: 10 }}>{title}</div>
      {children}
    </div>
  );

  const Prose = ({ children }) => (
    <p style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: 16, color: '#c0c0c0', lineHeight: 1.8, margin: '0 0 12px' }}>{children}</p>
  );

  const Callout = ({ label, children, c }) => (
    <div style={{ background: (c||color)+'0a', border: `1px solid ${(c||color)}22`, borderLeft: `3px solid ${c||color}`, padding: '12px 16px', marginBottom: 12 }}>
      <div style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 10, color: c||color, letterSpacing: 2, marginBottom: 6 }}>{label}</div>
      <p style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: 15, color: '#aaa', margin: 0, lineHeight: 1.7 }}>{children}</p>
    </div>
  );

  const GlossaryLink = ({ term }) => (
    <span style={{ color, borderBottom: `1px dashed ${color}66`, cursor: 'default', fontWeight: 600 }}>{term}</span>
  );

  const CheckQ = ({ qid, question, options, correct, explain }) => {
    const ans = answered(qid);
    return (
      <div style={{ background: '#09090f', border: '1px solid #ffffff0a', padding: '16px 18px', marginBottom: 10 }}>
        <div style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: 15, color: '#e0e0e0', marginBottom: 12, fontWeight: 600 }}>🎯 {question}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {options.map((opt, i) => {
            const chosen = ans === i;
            const isRight = i === correct;
            let bg = 'transparent'; let border = '#ffffff15'; let col = '#888';
            if (ans !== undefined) {
              if (isRight) { bg = '#69f0ae15'; border = '#69f0ae55'; col = '#69f0ae'; }
              else if (chosen) { bg = '#ff704315'; border = '#ff704355'; col = '#ff7043'; }
            }
            return (
              <button key={i} onClick={() => { if (ans === undefined) setAnswer(qid, i); }}
                style={{ background: bg, border: `1px solid ${border}`, color: col, padding: '10px 14px', cursor: ans === undefined ? 'pointer' : 'default', textAlign: 'left', fontFamily: "'Rajdhani',sans-serif", fontSize: 14, transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 10, opacity: 0.6 }}>{String.fromCharCode(65 + i)}</span>
                {opt}
                {ans !== undefined && isRight && <span style={{ marginLeft: 'auto' }}>✓</span>}
                {ans !== undefined && chosen && !isRight && <span style={{ marginLeft: 'auto' }}>✗</span>}
              </button>
            );
          })}
        </div>
        {ans !== undefined && (
          <div style={{ marginTop: 10, padding: '10px 12px', background: '#ffffff05', borderLeft: `2px solid ${color}`, fontFamily: "'Rajdhani',sans-serif", fontSize: 14, color: '#888', lineHeight: 1.6 }}>
            {explain}
          </div>
        )}
      </div>
    );
  };

  // ── MODULE 1: WHAT IS SOUND ──────────────────────────
  if (id === 1) return (
    <div>
      <Section title="THE CONCEPT IN ONE SENTENCE">
        <Prose>Sound is nothing more than air vibrating back and forth — your ears detect those vibrations and your brain turns them into what you hear.</Prose>
      </Section>

      <Section title="PLAIN ENGLISH">
        <Prose>Imagine dropping a pebble in still water. Ripples spread outward in circles. Sound works exactly the same way — except through air instead of water, and billions of times faster. When a speaker cone moves forward, it pushes air molecules together. When it moves back, it pulls them apart. That push-pull creates a wave of pressure changes travelling through the air. When that wave reaches your ear, your eardrum moves with it — and you hear sound.</Prose>
        <Prose>That's all sound is. Moving air. Nothing more.</Prose>
      </Section>

      <Section title="TWO PROPERTIES THAT DEFINE EVERY SOUND">
        <Callout label="FREQUENCY = PITCH (HIGH vs LOW)">
          How fast the air vibrates per second — measured in Hertz (Hz). A slow vibration (20Hz) = a deep, low rumble you feel in your chest. A fast vibration (15,000Hz) = a high, piercing squeal. Everything you hear sits somewhere on this spectrum. The kick drum in techno lives at 50–80Hz. The hi-hat lives at 8,000–14,000Hz. That's why they sound completely different.
        </Callout>
        <Callout label="AMPLITUDE = VOLUME (LOUD vs QUIET)" c="#ffca28">
          How far the air molecules actually move during each vibration. A small movement = quiet. A large movement = loud. At a festival, the speakers move the air so violently you feel it physically in your chest and stomach. That physical sensation IS the amplitude — large air pressure changes affecting your whole body, not just your ears.
        </Callout>
      </Section>

      <Section title="WHY THIS MATTERS FOR ELECTRONIC MUSIC">
        <Prose>Everything in a techno track is a deliberate manipulation of frequency and amplitude. The kick drum is a very low frequency (high amplitude) — designed to be felt physically. The hi-hat is a very high frequency (lower amplitude) — designed to be heard, not felt. The bassline sweeps through frequencies — that's what makes it feel like it's moving and speaking. Every knob a DJ turns is changing either frequency or amplitude of some element.</Prose>
      </Section>

      <M1Interactive getCtx={getCtx} color={color} />

      <Section title="CHECK YOUR UNDERSTANDING">
        <CheckQ qid="1a" question="A kick drum hits you in the chest at a rave. Why does it feel physical?"
          options={["Because the volume is very loud","Because it vibrates at a very low frequency — the slow pressure waves are large enough to physically move your body","Because the speaker is close to you","Because it's a digital sound"]}
          correct={1} explain="Low frequency = slow, large pressure waves. At 50–80Hz the air movement is physically significant — your body moves with it. High frequency sounds (hi-hats) vibrate too fast to feel, just fast enough to hear." />
        <CheckQ qid="1b" question="A hi-hat and a kick play at the same volume. Why does the kick feel louder?"
          options={["It is louder","The kick has lower frequency — larger, slower air movements feel more powerful to your body","The hi-hat is quieter by design","You can't compare them"]}
          correct={1} explain="Same amplitude (volume) but completely different frequency. The kick's low frequency moves more air per cycle. Your body responds to that physical pressure in a way it can't respond to a hi-hat's fast, tiny vibrations." />
      </Section>

      <Callout label="NOW YOU KNOW THIS — WHERE IT APPEARS">
        The Frequency and the Mix module (Module 7) goes deep into how different sounds occupy different frequency ranges. The EQ section of the DJ Booth is literally controlling frequency — cutting or boosting specific Hz ranges in real time.
      </Callout>

      <button onClick={onComplete} style={{ marginTop: 20, background: color, border: 'none', color: '#000', padding: '12px 28px', cursor: 'pointer', fontFamily: "'Share Tech Mono',monospace", fontSize: 12, letterSpacing: 2, fontWeight: 700 }}>
        MARK COMPLETE ✓
      </button>
    </div>
  );

  // ── MODULE 2: PULSE AND BEAT ─────────────────────────
  if (id === 2) return (
    <div>
      <Section title="THE CONCEPT IN ONE SENTENCE">
        <Prose>The pulse is the steady, invisible heartbeat underneath all music — the beat is each individual thump of that heartbeat.</Prose>
      </Section>
      <Section title="PLAIN ENGLISH">
        <Prose>When you tap your foot to music, you're not consciously deciding when to tap. Your brain locks onto the pulse automatically — it's a biological response. Humans have been doing this around fires for 50,000 years. The pulse is what makes music feel like it's moving forward rather than just existing.</Prose>
        <Prose>Each individual tap of your foot = one beat. The speed of those beats = the tempo. Four beats grouped together = one bar. That's the entire foundation of rhythm in electronic music — everything else is variations and decorations on top of this basic pulse.</Prose>
      </Section>
      <Section title="PULSE vs RHYTHM — WHAT'S THE DIFFERENCE">
        <Callout label="PULSE">
          Perfectly regular. Doesn't change. Like a clock ticking — TICK TICK TICK TICK. In techno, the kick drum usually IS the pulse — one hit on every single beat, completely reliable, never varying. This is what your body locks onto.
        </Callout>
        <Callout label="RHYTHM" c="#ffca28">
          What happens on top of the pulse. The hi-hat, snare, bassline — these play interesting patterns around the pulse. Some notes land on the pulse, some land between them, some are louder, some quieter. Rhythm is where all the interesting musical decisions live.
        </Callout>
      </Section>
      <Section title="WHY THIS MATTERS FOR ELECTRONIC MUSIC">
        <Prose>Electronic music — especially techno — is often described as hypnotic. That hypnotic quality comes almost entirely from the pulse. When a kick drum hits on exactly every beat for 10 minutes without variation, your brain eventually stops tracking it consciously and just rides it. This is intentional. It's the same mechanism as a shaman's drum in a ceremony, a metronome in meditation, or a heartbeat. Regularity induces a particular mental state.</Prose>
      </Section>

      <M2Interactive getCtx={getCtx} color={color} />

      <Section title="CHECK YOUR UNDERSTANDING">
        <CheckQ qid="2a" question="You're at a rave and you start tapping your foot without deciding to. What are you responding to?"
          options={["The volume of the music","The melody","The pulse — your brain locked onto the regular beat automatically","The lighting"]}
          correct={2} explain="Involuntary foot-tapping is your brain entraining to the pulse. It's a hardwired human response to regular rhythmic patterns — not a choice you make." />
        <CheckQ qid="2b" question="What's the difference between pulse and rhythm?"
          options={["They're the same thing","Pulse is the steady regular heartbeat — rhythm is the interesting patterns that sit on top of it","Pulse is faster than rhythm","Rhythm only applies to drums"]}
          correct={1} explain="Pulse never changes — it's the clock. Rhythm is everything that dances around the clock. A track with only pulse and no rhythm would be just a metronome. Rhythm is where the music lives." />
      </Section>

      <Callout label="NOW YOU KNOW THIS — WHERE IT APPEARS">
        The Kick Drum, 4/4, and BPM glossary terms are all directly about the pulse. The DJ Booth's tempo fader controls the speed of the pulse. Module 3 builds directly on this.
      </Callout>

      <button onClick={onComplete} style={{ marginTop: 20, background: color, border: 'none', color: '#000', padding: '12px 28px', cursor: 'pointer', fontFamily: "'Share Tech Mono',monospace", fontSize: 12, letterSpacing: 2, fontWeight: 700 }}>
        MARK COMPLETE ✓
      </button>
    </div>
  );

  // ── MODULE 3: BPM AND TEMPO ──────────────────────────
  if (id === 3) return (
    <div>
      <Section title="THE CONCEPT IN ONE SENTENCE">
        <Prose>BPM — Beats Per Minute — is just a count of how many beats happen in 60 seconds. It's the speed dial of music.</Prose>
      </Section>
      <Section title="PLAIN ENGLISH">
        <Prose>If a track plays 140 beats in one minute, it's 140 BPM. That's it. Nothing more complicated than that. A resting human heartbeat is ~60 BPM. A brisk walk is ~100 BPM. Most techno runs between 128 and 150 BPM. Gabber runs at 180–200 BPM.</Prose>
        <Prose>But BPM isn't just a technical measurement — it physically affects your body. Research shows that music between 120–145 BPM synchronises with elevated heart rate during physical activity. Your heart actually speeds up to match the music. This is why ravers don't feel tired dancing for 6 hours — their cardiovascular system is being entrained by the music.</Prose>
      </Section>
      <Section title="WHAT DIFFERENT BPMS FEEL LIKE">
        <Callout label="60–90 BPM" c="#69f0ae">Slow. Relaxed. Psybient, ambient techno. Music for after the rave — lying on the grass watching the sun rise.</Callout>
        <Callout label="90–120 BPM" c="#ffca28">Medium. Hip-hop, some house. Still comfortable but starting to feel like movement.</Callout>
        <Callout label="128–135 BPM" c="#ff7043">House, minimal techno, progressive techno. Club pace. Your feet move naturally.</Callout>
        <Callout label="136–150 BPM" c="#f06292">Peak techno and psytrance territory. The dancefloor's sweet spot. Fast enough to be intense, slow enough to sustain for hours.</Callout>
        <Callout label="150–180 BPM" c="#ba68c8">Hard techno, dark psy, hi-tech psy. Intense. Aggressive. Can only sustain for shorter periods.</Callout>
        <Callout label="180–220 BPM" c="#ff5252">Gabber. Psycore. The extreme end. More of an assault than a dance.</Callout>
      </Section>

      <M3Interactive getCtx={getCtx} color={color} />

      <Section title="CHECK YOUR UNDERSTANDING">
        <CheckQ qid="3a" question="A track is playing at 140 BPM. How many kicks will you hear in 30 seconds?"
          options={["140","70 — 140 per minute means 70 per 30 seconds","280","It depends on the track"]}
          correct={1} explain="140 BPM = 140 beats per minute. Half a minute = half of 140 = 70 beats. Simple division — but now you understand exactly what BPM means mathematically." />
        <CheckQ qid="3b" question="Why does dancing to 140 BPM not feel as exhausting as it sounds?"
          options={["Because your brain ignores the music","Because your heart rate synchronises with the BPM — the music is driving your cardiovascular system, not just responding to it","Because techno has a quiet bassline","Because you get used to it"]}
          correct={1} explain="Musical entrainment is a real physiological phenomenon. Your heart rate, breathing, and motor system all sync to strong rhythmic pulses. At 140 BPM, the music is essentially pacing your body — you're not fighting to keep up, you're being carried." />
      </Section>

      <Callout label="NOW YOU KNOW THIS — WHERE IT APPEARS">
        The BPM Guide tab shows the full spectrum from Psybient (95 BPM) to Gabber (185 BPM) with every genre mapped. The DJ Booth tempo fader changes BPM live. Every genre in the Genre Map has a BPM listed.
      </Callout>

      <button onClick={onComplete} style={{ marginTop: 20, background: color, border: 'none', color: '#000', padding: '12px 28px', cursor: 'pointer', fontFamily: "'Share Tech Mono',monospace", fontSize: 12, letterSpacing: 2, fontWeight: 700 }}>
        MARK COMPLETE ✓
      </button>
    </div>
  );

  // ── MODULE 4: THE GRID ───────────────────────────────
  if (id === 4) return (
    <div>
      <Section title="THE CONCEPT IN ONE SENTENCE">
        <Prose>All electronic music is built on a grid of equal time slots — like graph paper for sound. Understanding the grid means understanding the structure of every techno and psy track ever made.</Prose>
      </Section>
      <Section title="THE THREE LEVELS OF THE GRID">
        <Callout label="BEAT — THE PULSE">
          One beat = one tap of your foot. In 4/4 time (which all techno uses) there are 4 beats in a bar. The kick drum hits on every beat: 1 — 2 — 3 — 4.
        </Callout>
        <Callout label="BAR — ONE COMPLETE CYCLE" c="#ffca28">
          Four beats grouped together = one bar. The pattern completes and restarts. Think of breathing: in-2-3-4, out-2-3-4. Each breath is one bar. Most techno builds in phrases of 8 or 16 bars.
        </Callout>
        <Callout label="STEP — THE FINEST DETAIL" c="#ff7043">
          Each beat can be divided into 4 equal pieces called 16th notes or steps. One bar = 4 beats × 4 steps = 16 steps total. This is the "16-step sequencer" you'll see everywhere in electronic music production. Each step is a slot where a sound can either play or not play.
        </Callout>
      </Section>
      <Section title="WHAT 4/4 ACTUALLY MEANS">
        <Prose>The top number (4) = 4 beats per bar. The bottom number (4) = each beat is worth a quarter note. So 4/4 = four quarter-note beats per bar. Almost all electronic music uses 4/4. It's the most natural time signature for dancing — your body moves in fours instinctively.</Prose>
      </Section>
      <Section title="WHY A GRID? WHY NOT JUST PLAY FREELY?">
        <Prose>Because electronic music is made by programming patterns, not by playing in real time. You place sounds on a grid — step 1 on, steps 2, 3, 4 off, step 5 on — and the machine plays it back perfectly, endlessly. The grid is what makes techno so precise and hypnotic. Every kick lands in exactly the same place, every bar, for 10 minutes. That inhuman precision is the point.</Prose>
      </Section>

      <M4Interactive getCtx={getCtx} color={color} />

      <Section title="CHECK YOUR UNDERSTANDING">
        <CheckQ qid="4a" question="A 16-step sequencer has a kick on steps 1, 5, 9, and 13. What pattern is this?"
          options={["A random pattern","4/4 — four on the floor. Steps 1, 5, 9, 13 are exactly beats 1, 2, 3, 4 in a 16-step bar","Half time","An offbeat pattern"]}
          correct={1} explain="In a 16-step bar, each beat occupies 4 steps: beat 1 = step 1, beat 2 = step 5, beat 3 = step 9, beat 4 = step 13. Kick on all four = four on the floor = the foundation of all techno." />
        <CheckQ qid="4b" question="How many 16th note steps are in 2 bars of 4/4?"
          options={["16","32 — 16 steps per bar × 2 bars","8","64"]}
          correct={1} explain="1 bar = 4 beats × 4 steps = 16 steps. 2 bars = 32 steps. DJs and producers think in 8-bar and 16-bar phrases — that's 128 and 256 steps respectively. The grid scales up perfectly." />
      </Section>

      <Callout label="NOW YOU KNOW THIS — WHERE IT APPEARS">
        Every term card in the Glossary with a step grid visual is showing you exactly this — a 16-step bar with sounds placed on the grid. The DJ Booth is playing 16-step loops in real time. The Sequencer glossary term goes deeper on this concept.
      </Callout>

      <button onClick={onComplete} style={{ marginTop: 20, background: color, border: 'none', color: '#000', padding: '12px 28px', cursor: 'pointer', fontFamily: "'Share Tech Mono',monospace", fontSize: 12, letterSpacing: 2, fontWeight: 700 }}>
        MARK COMPLETE ✓
      </button>
    </div>
  );

  // ── MODULE 5: NOTES AND PITCH ────────────────────────
  if (id === 5) return (
    <div>
      <Section title="THE CONCEPT IN ONE SENTENCE">
        <Prose>A note is just a specific frequency given a name — C, D, E, F, G, A, B. Every melody, bassline, and chord in all of music is built from combinations of these 12 notes.</Prose>
      </Section>
      <Section title="PLAIN ENGLISH">
        <Prose>Remember from Module 1 — sound is vibration, and frequency (Hz) determines pitch. Notes are just specific frequencies that humans agreed to give letter names to. The note A4 is always exactly 440Hz. The note C4 is always 261.6Hz. These aren't arbitrary — they're fixed points on the frequency spectrum that have been standardised for centuries.</Prose>
        <Prose>There are 12 notes total in Western music: C, C#, D, D#, E, F, F#, G, G#, A, A#, B — then it starts again from C. These 12 notes repeat in octaves — higher and higher versions of the same note at double the frequency each time. C4 is 261Hz. C5 is 523Hz — double. They sound like the same note but higher.</Prose>
      </Section>
      <Section title="WHY OCTAVES FEEL THE SAME">
        <Callout label="THE OCTAVE RELATIONSHIP">
          When you double a frequency, the new note sounds like the same note but higher. This is because our brains are wired to perceive 2:1 frequency ratios as the same pitch class. C at 130Hz and C at 261Hz share all the same harmonic overtones — just at different heights. That's why a bassline and a melody can play the same note 2 or 3 octaves apart and sound like they belong together.
        </Callout>
      </Section>
      <Section title="HOW THIS APPLIES TO ELECTRONIC MUSIC">
        <Prose>In techno and psy, you don't need to read sheet music or understand complex theory. But knowing notes exist tells you why a bassline has a melody — it's moving between specific notes. Why a pad creates mood — it's playing specific combinations of notes (a chord). Why an arpeggio sounds like it's climbing — it's stepping through notes of a scale in sequence from low to high.</Prose>
      </Section>

      <M5Interactive getCtx={getCtx} color={color} />

      <Section title="CHECK YOUR UNDERSTANDING">
        <CheckQ qid="5a" question="A note at 440Hz is played. Then a note at 880Hz plays. How do they sound related?"
          options={["Completely different notes","The same note — A — but one octave higher. 880 is exactly double 440.","Random frequencies with no relationship","The higher one sounds like a different instrument"]}
          correct={1} explain="880Hz = 440Hz × 2 = exactly one octave up. Both are the note A — the higher one just vibrates twice as fast. Your brain recognises the 2:1 ratio and hears them as the same pitch class." />
        <CheckQ qid="5b" question="A psytrance bassline seems to move and tell a story. Why?"
          options={["It gets louder and quieter","It's moving between specific notes — different frequencies — creating a melody within the bass register","It uses reverb","The producer is playing it live"]}
          correct={1} explain="The psy bassline is a melodic instrument playing in the bass frequency range. It steps through different notes — different Hz values — and that movement is what you perceive as the bassline 'speaking' or 'telling a story'. It's melody, just low." />
      </Section>

      <Callout label="NOW YOU KNOW THIS — WHERE IT APPEARS">
        The Arpeggio, Bassline, and Oscillator terms in the Glossary all rely on notes. The DJ Booth's pitch fader is shifting the frequency of every note up or down simultaneously. Module 6 builds directly on notes — scales are just specific collections of notes.
      </Callout>

      <button onClick={onComplete} style={{ marginTop: 20, background: color, border: 'none', color: '#000', padding: '12px 28px', cursor: 'pointer', fontFamily: "'Share Tech Mono',monospace", fontSize: 12, letterSpacing: 2, fontWeight: 700 }}>
        MARK COMPLETE ✓
      </button>
    </div>
  );

  // ── MODULE 6: SCALES AND KEYS ────────────────────────
  if (id === 6) return (
    <div>
      <Section title="THE CONCEPT IN ONE SENTENCE">
        <Prose>A scale is a specific set of notes that sound good together — the key determines which set is being used, and that choice determines whether music feels dark, euphoric, tense, or spiritual.</Prose>
      </Section>
      <Section title="PLAIN ENGLISH">
        <Prose>Out of the 12 available notes, most music only uses 7 at a time — a scale. Think of it like a colour palette. A painter doesn't use every colour in every painting — they choose a palette that creates a specific mood. A musician chooses a scale that creates a specific emotional atmosphere.</Prose>
        <Prose>The most important distinction for electronic music is simple: major vs minor.</Prose>
      </Section>
      <Section title="MAJOR vs MINOR — THE ONE THING THAT CHANGES EVERYTHING">
        <Callout label="MAJOR SCALE = BRIGHT, HAPPY, EUPHORIC">
          Uses a specific pattern of note spacing that sounds uplifting, resolved, and positive. Full-On Psy, Goa Trance, and Melodic Techno often use major scales. When a festival track makes you feel euphoric and uplifted — major key.
        </Callout>
        <Callout label="MINOR SCALE = DARK, TENSE, EMOTIONAL" c="#ba68c8">
          A slightly different pattern of note spacing that sounds unresolved, tense, or melancholy. Dark Psy, Industrial Techno, and Dark Techno almost exclusively use minor keys. That sense of dread or deep introspection — minor key.
        </Callout>
      </Section>
      <Section title="EASTERN SCALES IN GOA TRANCE">
        <Prose>Classical Indian and Middle Eastern music uses different scales — note patterns not used in Western pop or rock. These scales have intervals that sound exotic, ancient, or spiritual to Western ears. Goa Trance producers were literally in Goa, India, absorbing these scales from the culture around them. That's why Goa Trance sounds spiritual and different to anything made in Europe — different note palettes, completely different emotional effect.</Prose>
      </Section>
      <Section title="YOU DON'T NEED TO MEMORISE SCALES">
        <Callout label="PRACTICAL SHORTCUT" c="#69f0ae">
          You don't need to know the notes in any scale. You just need to know: does this music feel bright and uplifting (major) or dark and tense (minor)? And: does this feel like Western music or does it have an exotic, ancient quality (Eastern scale)? That's enough to understand 90% of what's happening harmonically in electronic music.
        </Callout>
      </Section>

      <M6Interactive getCtx={getCtx} color={color} />

      <Section title="CHECK YOUR UNDERSTANDING">
        <CheckQ qid="6a" question="A Full-On Psy track makes you feel euphoric and uplifted. What scale is it probably using?"
          options={["Minor scale","Major scale — bright, resolved, uplifting","Eastern scale","No scale — psy doesn't use scales"]}
          correct={1} explain="Major scale = bright, positive, uplifting. Full-On Psy is deliberately euphoric — festival music designed to make thousands of people feel transcendent joy simultaneously. Major key is the tool for that." />
        <CheckQ qid="6b" question="Dark Psy creates genuine unease and dread. What scale creates that feeling?"
          options={["Major scale","Minor scale — unresolved, tense, melancholy","Any scale at high volume","Bass frequencies alone"]}
          correct={1} explain="Minor scale creates tension and darkness. Combined with low BPM, heavy sub-bass, and dissonant sound design, a minor key bassline is the harmonic foundation of Dark Psy's psychological impact." />
      </Section>

      <Callout label="NOW YOU KNOW THIS — WHERE IT APPEARS">
        The Harmonic Mixing term in DJ Skills is about matching keys between tracks. The Pad and Arpeggio terms in Sound Design involve notes from specific scales. Every genre description mentioning 'euphoric' or 'dark' is describing the emotional effect of the scale choice.
      </Callout>

      <button onClick={onComplete} style={{ marginTop: 20, background: color, border: 'none', color: '#000', padding: '12px 28px', cursor: 'pointer', fontFamily: "'Share Tech Mono',monospace", fontSize: 12, letterSpacing: 2, fontWeight: 700 }}>
        MARK COMPLETE ✓
      </button>
    </div>
  );

  // ── MODULE 7: FREQUENCY AND THE MIX ─────────────────
  if (id === 7) return (
    <div>
      <Section title="THE CONCEPT IN ONE SENTENCE">
        <Prose>Every sound occupies a specific range of frequencies — and in a well-produced track, every element has its own space on the frequency spectrum so nothing fights anything else.</Prose>
      </Section>
      <Section title="THE FREQUENCY SPECTRUM IN ELECTRONIC MUSIC">
        <Callout label="SUB BASS — 20 to 60Hz — FELT NOT HEARD">
          This is the lowest range your body can feel. The physical thud of a kick drum, the sub-bass rumble of a psy bassline. You don't consciously hear this — you feel it in your chest and stomach. At a festival with a serious sound system, this range is what separates a real rave from headphones.
        </Callout>
        <Callout label="BASS — 60 to 200Hz — HEARD AND FELT" c="#69f0ae">
          The kick drum body, the bassline melody, the low end of synths. This is the most important range in electronic music — and the most crowded. The kick and bassline both live here, which is why producers and DJs use EQ to carve space for each.
        </Callout>
        <Callout label="LOW MIDS — 200Hz to 1kHz — BODY OF INSTRUMENTS" c="#ffca28">
          Where most instruments have their body — snare drum warmth, bassline harmonics, pad texture. Too much here and music sounds muddy and congested. Too little and it sounds thin.
        </Callout>
        <Callout label="HIGH MIDS — 1kHz to 8kHz — PRESENCE AND ATTACK" c="#ff7043">
          Snare crack, synth leads, vocal presence, the attack of the kick. This is where sounds cut through the mix and feel close and immediate. Most of what you consciously hear as 'the music' lives here.
        </Callout>
        <Callout label="HIGHS — 8kHz to 20kHz — AIR AND SPARKLE" c="#4fc3f7">
          Hi-hats, cymbals, the 'air' of a mix. Adds brightness and space. Cut all the highs and music sounds muffled, like hearing it through a wall. Too much and it sounds harsh and fatiguing.
        </Callout>
      </Section>
      <Section title="WHY EQ EXISTS">
        <Prose>Every sound occupies frequencies that overlap with other sounds. A kick drum's body sits in the same 60–120Hz range as the bassline. If both are loud in that range simultaneously, they fight — the result is mud. EQ lets you cut the bassline slightly at 80Hz where the kick is loudest, so both can coexist clearly. This is what DJs are doing with the EQ knobs on their mixer — not just turning sounds up and down, but carving frequency space so elements don't clash.</Prose>
      </Section>

      <M7Interactive getCtx={getCtx} color={color} />

      <Section title="CHECK YOUR UNDERSTANDING">
        <CheckQ qid="7a" question="A DJ cuts the Low EQ knob on the outgoing track to zero while bringing in a new track. Why?"
          options={["To make the music quieter","To prevent two kick drums and basslines from fighting each other in the same frequency range — removing the low end from one track so only one bass is audible","Because they don't like the bass of that track","To save speaker power"]}
          correct={1} explain="Two kick drums in the same 60–120Hz range simultaneously = bass mud. By killing the low EQ on the outgoing track, the DJ removes its contribution to that frequency range. Now only the new track's kick and bass are audible there. Clean mix." />
        <CheckQ qid="7b" question="You're at a rave and you walk outside — suddenly the music sounds muffled. What frequencies went away?"
          options={["The lows — bass travels through walls better than highs","The highs — treble frequencies don't travel through walls as effectively as bass. The kick (low) still thumps. The hi-hats (high) disappear.","All frequencies equally","The mids specifically"]}
          correct={1} explain="Low frequencies have long wavelengths that pass through solid materials easily. High frequencies have short wavelengths that get absorbed by walls, air, and distance. Outside a venue you hear the kick and bass but lose all the hi-hats, synths, and high-frequency detail." />
      </Section>

      <Callout label="NOW YOU KNOW THIS — WHERE IT APPEARS">
        The EQ section of the DJ Booth has High, Mid, and Low knobs — you're now cutting and boosting specific frequency ranges. The Filter knob is sweeping the high-frequency cutoff up and down. The Compression and EQ terms in the Glossary go deeper on this.
      </Callout>

      <button onClick={onComplete} style={{ marginTop: 20, background: color, border: 'none', color: '#000', padding: '12px 28px', cursor: 'pointer', fontFamily: "'Share Tech Mono',monospace", fontSize: 12, letterSpacing: 2, fontWeight: 700 }}>
        MARK COMPLETE ✓
      </button>
    </div>
  );

  // ── MODULE 8: PUTTING IT ALL TOGETHER ───────────────
  if (id === 8) return (
    <div>
      <Section title="THE CONCEPT IN ONE SENTENCE">
        <Prose>Everything from the previous 7 modules combines into a single complete techno pattern — and by the end of this module you will have built one yourself from scratch.</Prose>
      </Section>

      <Section title="WHAT YOU NOW KNOW">
        <Prose>Let's map the modules to what actually happens in a techno track:</Prose>
        {[
          ["Module 1 — Sound", "Every element in a techno track is a frequency at a specific amplitude. The kick is ~60Hz at high amplitude. The hi-hat is ~10,000Hz at lower amplitude."],
          ["Module 2 — Pulse", "The kick drum provides the pulse — the biological anchor your body locks onto. Without it, there's no track."],
          ["Module 3 — BPM", "Set at 132 BPM. 132 kicks per minute. That specific speed sits in the sweet spot between danceability and intensity."],
          ["Module 4 — The Grid", "16 steps per bar. Kick on steps 1, 5, 9, 13 (every beat). Hi-hat on steps 3, 7, 11, 15 (every offbeat). Snare on step 9 (beat 3)."],
          ["Module 5 — Notes", "The bassline plays 4 different notes in a repeating pattern — A, C, D, E — creating a melody in the bass register."],
          ["Module 6 — Scale", "Those notes are from a minor scale. The track feels dark and driving, not euphoric."],
          ["Module 7 — Frequency", "The kick occupies 60–100Hz. The bassline is carved around it at 100–200Hz. The hi-hat sits above 8kHz. No overlap, no mud."],
        ].map(([title, desc]) => (
          <Callout key={title} label={title} c={color}>
            {desc}
          </Callout>
        ))}
      </Section>

      <Section title="BUILD YOUR OWN PATTERN">
        <Prose>Now use everything above. The sequencer below starts empty. Build a techno pattern step by step — guided instructions are shown as you add each element. You'll hear how each layer changes the sound.</Prose>
      </Section>

      <M8Interactive getCtx={getCtx} color={color} />

      <Section title="FINAL CHECK">
        <CheckQ qid="8a" question="You built a pattern with kick on every beat, hi-hat on every offbeat, and a bass note on beat 1. What fundamental concept from Module 4 is the kick demonstrating?"
          options={["Polyrhythm","4/4 — four on the floor. Kick on every beat of a 4-beat bar is the defining rhythm of all electronic music.","Half time","Syncopation"]}
          correct={1} explain="Four kicks per bar, one on every beat — that's 4/4. The most foundational rhythm in all of techno, house, trance, and electronic music. Everything is built on this." />
        <CheckQ qid="8b" question="You want your track to feel euphoric and uplifting. What scale should your bassline use — from Module 6?"
          options={["Minor scale","Major scale — bright, resolved, positive. If Infected Mushroom makes you feel euphoric, they're in a major key.","Eastern scale","Scales don't affect mood"]}
          correct={1} explain="Major = bright and euphoric. Minor = dark and tense. One note change between them — but the emotional effect is completely different. This is the most powerful single tool in music production." />
      </Section>

      <div style={{ background: '#00ffcc08', border: '1px solid #00ffcc30', padding: '24px', marginTop: 28, textAlign: 'center' }}>
        <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 28, color: '#00ffcc', letterSpacing: 3, marginBottom: 10 }}>YOU'VE COMPLETED FOUNDATIONS</div>
        <p style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: 15, color: '#888', lineHeight: 1.7, maxWidth: 520, margin: '0 auto 16px' }}>
          You now understand sound, pulse, tempo, the grid, notes, scales, frequency, and how they all combine. Every term in the Glossary, every control in the DJ Booth, every genre in the Genre Map — you now have the foundation to understand all of it.
        </p>
        <p style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 11, color: '#00ffcc88', letterSpacing: 2 }}>EXPLORE THE GLOSSARY → DJ BOOTH → GENRE MAP</p>
      </div>

      <button onClick={onComplete} style={{ marginTop: 24, background: color, border: 'none', color: '#000', padding: '12px 28px', cursor: 'pointer', fontFamily: "'Share Tech Mono',monospace", fontSize: 12, letterSpacing: 2, fontWeight: 700 }}>
        COMPLETE FOUNDATIONS ✓
      </button>
    </div>
  );

  return null;
}

// ═══════════════════════════════════════════════════════════════
// MODULE INTERACTIVES
// ═══════════════════════════════════════════════════════════════

// M1 — Sine wave frequency/amplitude visualiser
function M1Interactive({ getCtx, color }) {
  const [freq, setFreq] = useState(440);
  const [amp, setAmp] = useState(0.4);
  const [playing, setPlaying] = useState(false);
  const oscRef = useRef(null); const gainRef = useRef(null);

  const start = () => {
    const ctx = getCtx();
    if (oscRef.current) { try { oscRef.current.stop(); } catch(e){} }
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine'; osc.frequency.value = freq;
    g.gain.value = amp * 0.3;
    osc.connect(g); g.connect(ctx.destination);
    osc.start(); oscRef.current = osc; gainRef.current = g;
    setPlaying(true);
  };

  const stop = () => {
    if (oscRef.current) { try { oscRef.current.stop(); } catch(e){} oscRef.current = null; }
    setPlaying(false);
  };

  useEffect(() => {
    if (playing && oscRef.current) {
      oscRef.current.frequency.value = freq;
      if (gainRef.current) gainRef.current.gain.value = amp * 0.3;
    }
  }, [freq, amp, playing]);

  useEffect(() => () => { if (oscRef.current) { try { oscRef.current.stop(); } catch(e){} } }, []);

  const freqLabel = freq < 100 ? 'Sub bass — felt in your body' : freq < 300 ? 'Bass — kick drum territory' : freq < 2000 ? 'Mids — instruments' : freq < 8000 ? 'High mids — synth leads' : 'Highs — hi-hat territory';

  // Draw waveform
  const cycles = Math.min(6, Math.max(1, Math.floor(freq / 200)));
  const W = 560; const H = 80;
  const points = Array.from({ length: 300 }, (_, i) => {
    const x = (i / 299) * W;
    const y = H / 2 - Math.sin((i / 299) * Math.PI * 2 * cycles) * amp * 32;
    return `${x},${y}`;
  }).join(' ');

  return (
    <div style={{ background: '#09090f', border: `1px solid ${color}22`, padding: 20, marginBottom: 24 }}>
      <div style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 10, color, letterSpacing: 2, marginBottom: 14 }}>🎛️ INTERACTIVE — FREQUENCY + AMPLITUDE VISUALISER</div>
      <p style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: 13, color: '#666', marginBottom: 16 }}>Drag the sliders and press Play to hear and see how frequency and amplitude work.</p>

      {/* Waveform */}
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: 'block', marginBottom: 16, maxWidth: '100%' }}>
        <rect width={W} height={H} fill="#05050a" />
        <polyline points={points} fill="none" stroke={color} strokeWidth="2" />
      </svg>

      {/* Frequency slider */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 10, color: '#555', letterSpacing: 1 }}>FREQUENCY (PITCH)</span>
          <span style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 11, color }}>
            {freq}Hz — {freqLabel}
          </span>
        </div>
        <input type="range" min="30" max="12000" value={freq} onChange={e => setFreq(+e.target.value)}
          style={{ width: '100%', accentColor: color }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
          <span style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 9, color: '#333' }}>30Hz (sub bass)</span>
          <span style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 9, color: '#333' }}>12,000Hz (hi-hat)</span>
        </div>
      </div>

      {/* Amplitude slider */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 10, color: '#555', letterSpacing: 1 }}>AMPLITUDE (VOLUME)</span>
          <span style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 11, color }}>{Math.round(amp * 100)}%</span>
        </div>
        <input type="range" min="0.05" max="1" step="0.01" value={amp} onChange={e => setAmp(+e.target.value)}
          style={{ width: '100%', accentColor: color }} />
      </div>

      <button onClick={playing ? stop : start}
        style={{ background: playing ? '#ff704330' : color + '20', border: `1px solid ${playing ? '#ff7043' : color}`, color: playing ? '#ff7043' : color, padding: '8px 20px', cursor: 'pointer', fontFamily: "'Share Tech Mono',monospace", fontSize: 11, letterSpacing: 2 }}>
        {playing ? '⏹ STOP' : '▶ HEAR IT'}
      </button>
      <p style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: 12, color: '#444', marginTop: 10 }}>
        Try: drag frequency to 50Hz and turn volume up — feel it in your chest (use headphones or speakers). Then drag to 10,000Hz — now it's a hi-hat.
      </p>
    </div>
  );
}

// M2 — Pulse metronome with tap along
function M2Interactive({ getCtx, color }) {
  const [bpm, setBpm] = useState(130);
  const [running, setRunning] = useState(false);
  const [beat, setBeat] = useState(0);
  const [tapTimes, setTapTimes] = useState([]);
  const [tapBpm, setTapBpm] = useState(null);
  const timerRef = useRef(null);

  const toggle = () => {
    if (running) { clearInterval(timerRef.current); setRunning(false); setBeat(0); return; }
    setRunning(true);
    const ctx = getCtx();
    let b = 0;
    const interval = (60 / bpm) * 1000;
    timerRef.current = setInterval(() => {
      b = (b % 4) + 1; setBeat(b);
      const g = ctx.createGain();
      g.gain.setValueAtTime(b === 1 ? 0.5 : 0.2, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
      const osc = ctx.createOscillator();
      osc.frequency.value = b === 1 ? 880 : 440;
      osc.connect(g); g.connect(ctx.destination);
      osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.1);
    }, interval);
  };

  const tap = () => {
    const now = Date.now();
    setTapTimes(prev => {
      const times = [...prev, now].slice(-8);
      if (times.length >= 2) {
        const diffs = times.slice(1).map((t, i) => t - times[i]);
        const avg = diffs.reduce((a, b) => a + b) / diffs.length;
        setTapBpm(Math.round(60000 / avg));
      }
      return times;
    });
  };

  useEffect(() => () => clearInterval(timerRef.current), []);
  useEffect(() => { if (running) { clearInterval(timerRef.current); toggle(); } }, [bpm]);

  return (
    <div style={{ background: '#09090f', border: `1px solid ${color}22`, padding: 20, marginBottom: 24 }}>
      <div style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 10, color, letterSpacing: 2, marginBottom: 14 }}>🎛️ INTERACTIVE — PULSE VISUALISER + TAP ALONG</div>

      {/* Beat dots */}
      <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 20, flexWrap: 'wrap' }}>
        {[1, 2, 3, 4].map(b => (
          <div key={b} style={{
            width: 52, height: 52, borderRadius: '50%',
            border: `2px solid ${beat === b ? (b === 1 ? color : '#ffffff66') : '#ffffff15'}`,
            background: beat === b ? (b === 1 ? color + '33' : '#ffffff15') : 'transparent',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.05s',
            boxShadow: beat === b && b === 1 ? `0 0 20px ${color}44` : 'none',
          }}>
            <span style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 22, color: beat === b ? (b === 1 ? color : '#fff') : '#333', letterSpacing: 1 }}>{b}</span>
          </div>
        ))}
      </div>

      {/* BPM slider */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 10, color: '#555', letterSpacing: 1 }}>TEMPO</span>
          <span style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 13, color }}>{bpm} BPM</span>
        </div>
        <input type="range" min="60" max="200" value={bpm} onChange={e => { setBpm(+e.target.value); }}
          style={{ width: '100%', accentColor: color }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
          <span style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 9, color: '#333' }}>60 BPM (slow)</span>
          <span style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 9, color: '#333' }}>200 BPM (gabber)</span>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={toggle}
          style={{ flex: 1, background: running ? '#ff704320' : color + '20', border: `1px solid ${running ? '#ff7043' : color}`, color: running ? '#ff7043' : color, padding: '8px 0', cursor: 'pointer', fontFamily: "'Share Tech Mono',monospace", fontSize: 11, letterSpacing: 2 }}>
          {running ? '⏹ STOP' : '▶ START PULSE'}
        </button>
        <button onClick={tap}
          style={{ flex: 1, background: '#ffffff08', border: '1px solid #ffffff18', color: tapBpm ? color : '#888', padding: '8px 0', cursor: 'pointer', fontFamily: "'Share Tech Mono',monospace", fontSize: 11, letterSpacing: 2 }}>
          TAP ALONG {tapBpm ? `— ${tapBpm} BPM` : ''}
        </button>
      </div>
      <p style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: 12, color: '#444', marginTop: 10 }}>
        Press Start and watch beat 1 light up brighter — that's the downbeat, the start of each bar. Then tap along to any song you know and see what BPM it is.
      </p>
    </div>
  );
}

// M3 — BPM range visualiser with genre labels
function M3Interactive({ getCtx, color }) {
  const [bpm, setBpm] = useState(130);
  const [playing, setPlaying] = useState(false);
  const timerRef = useRef(null);

  const genres = [
    { min: 85, max: 105, name: 'Psybient / Ambient Techno', col: '#4fc3f7' },
    { min: 120, max: 132, name: 'Minimal / Dub Techno', col: '#69f0ae' },
    { min: 132, max: 138, name: 'Melodic Techno / Progressive', col: '#ffca28' },
    { min: 138, max: 148, name: 'Psytrance / Goa / Full-On Psy', col: '#ff7043' },
    { min: 140, max: 155, name: 'Hard Techno / Peak Time', col: '#f06292' },
    { min: 148, max: 160, name: 'Dark Psy / Forest / Hi-Tech', col: '#ba68c8' },
    { min: 160, max: 185, name: 'Gabber / Psycore / Freetekno', col: '#ff5252' },
  ];

  const current = genres.filter(g => bpm >= g.min && bpm <= g.max);

  const toggle = () => {
    if (playing) { clearInterval(timerRef.current); setPlaying(false); return; }
    const ctx = getCtx();
    setPlaying(true);
    const fire = () => {
      const t = ctx.currentTime;
      const g = ctx.createGain(); g.gain.setValueAtTime(0.5, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
      const osc = ctx.createOscillator(); osc.frequency.value = 55;
      const dist = ctx.createWaveShaper();
      const curve = new Float32Array(256);
      for (let i = 0; i < 256; i++) { const x = (i * 2) / 256 - 1; curve[i] = ((Math.PI + 200) * x) / (Math.PI + 200 * Math.abs(x)); }
      dist.curve = curve;
      osc.connect(dist); dist.connect(g); g.connect(ctx.destination);
      osc.start(t); osc.stop(t + 0.4);
    };
    fire();
    timerRef.current = setInterval(fire, (60 / bpm) * 1000);
  };

  useEffect(() => () => clearInterval(timerRef.current), []);
  useEffect(() => {
    if (playing) { clearInterval(timerRef.current); setPlaying(false); setTimeout(toggle, 50); }
  }, [bpm]);

  return (
    <div style={{ background: '#09090f', border: `1px solid ${color}22`, padding: 20, marginBottom: 24 }}>
      <div style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 10, color, letterSpacing: 2, marginBottom: 14 }}>🎛️ INTERACTIVE — BPM EXPLORER</div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
        <span style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 10, color: '#555', letterSpacing: 1 }}>TEMPO</span>
        <span style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 36, color, letterSpacing: 2 }}>{bpm} BPM</span>
      </div>

      <input type="range" min="80" max="200" value={bpm} onChange={e => setBpm(+e.target.value)}
        style={{ width: '100%', accentColor: color, marginBottom: 16 }} />

      {/* Genre match */}
      <div style={{ minHeight: 48, marginBottom: 16 }}>
        {current.length > 0 ? current.map(g => (
          <div key={g.name} style={{ background: g.col + '15', border: `1px solid ${g.col}44`, padding: '8px 12px', marginBottom: 6 }}>
            <span style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 10, color: g.col, letterSpacing: 2 }}>{g.name.toUpperCase()}</span>
          </div>
        )) : (
          <div style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 10, color: '#333', letterSpacing: 1 }}>— BETWEEN GENRE RANGES —</div>
        )}
      </div>

      {/* Range bar */}
      <div style={{ position: 'relative', height: 20, background: '#ffffff08', borderRadius: 2, marginBottom: 16 }}>
        {genres.map(g => (
          <div key={g.name} style={{
            position: 'absolute', top: 0, bottom: 0,
            left: `${((g.min - 80) / 120) * 100}%`,
            width: `${((g.max - g.min) / 120) * 100}%`,
            background: g.col + '40', borderRight: `1px solid ${g.col}66`,
          }} />
        ))}
        <div style={{
          position: 'absolute', top: 0, bottom: 0, width: 2,
          left: `${((bpm - 80) / 120) * 100}%`,
          background: color, boxShadow: `0 0 8px ${color}`,
          transition: 'left 0.1s',
        }} />
      </div>

      <button onClick={toggle}
        style={{ background: playing ? '#ff704320' : color + '20', border: `1px solid ${playing ? '#ff7043' : color}`, color: playing ? '#ff7043' : color, padding: '8px 20px', cursor: 'pointer', fontFamily: "'Share Tech Mono',monospace", fontSize: 11, letterSpacing: 2 }}>
        {playing ? '⏹ STOP KICK' : '▶ HEAR KICK AT THIS BPM'}
      </button>
      <p style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: 12, color: '#444', marginTop: 10 }}>
        Drag slowly from 80 to 200 BPM while the kick is playing. Feel how the energy completely changes. At 95 BPM it's meditative. At 145 it's a rave. At 185 it's barely a beat — just an assault.
      </p>
    </div>
  );
}

// M4 — Standalone 16-step sequencer
function M4Interactive({ getCtx, color }) {
  const TRACKS = [
    { name: 'KICK', col: '#ff6b6b', defaultSteps: new Array(16).fill(false) },
    { name: 'SNARE', col: '#ffca28', defaultSteps: new Array(16).fill(false) },
    { name: 'HI-HAT', col: '#4fc3f7', defaultSteps: new Array(16).fill(false) },
    { name: 'BASS', col: '#69f0ae', defaultSteps: new Array(16).fill(false) },
  ];

  const [steps, setSteps] = useState(TRACKS.map(t => [...t.defaultSteps]));
  const [playing, setPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(-1);
  const [bpm, setBpm] = useState(130);
  const [guideStep, setGuideStep] = useState(0);
  const timerRef = useRef(null);
  const stepRef = useRef(0);
  const ctxRef = useRef(null);
  const stepsRef = useRef(steps);
  stepsRef.current = steps;

  const guides = [
    { label: "Step 1 — Start with the kick", desc: "The kick is the pulse. Click steps 1, 5, 9, and 13 in the KICK row. That's every beat — 4/4, four on the floor. Then press Play.", check: (s) => [0,4,8,12].every(i => s[0][i]) },
    { label: "Step 2 — Add the hi-hat on the offbeat", desc: "Now click steps 3, 7, 11, and 15 in the HI-HAT row. These land exactly between your kicks — the offbeat. Notice how much energy this adds.", check: (s) => [2,6,10,14].every(i => s[2][i]) },
    { label: "Step 3 — Add a snare", desc: "Click step 9 in the SNARE row (beat 3). This is where many techno tracks put the snare — just one hit per bar, giving a sense of forward drive.", check: (s) => s[1][8] },
    { label: "Step 4 — Add a bass note", desc: "Click step 1 in the BASS row — same as the kick. Now your bassline locks with the kick on beat 1. This is the most common bass placement in techno.", check: (s) => s[3][0] },
    { label: "✓ You've built a techno pattern", desc: "16 steps. 4 bars. Kick, snare, hi-hat, bass. This is the skeleton of nearly every techno track ever made. Add or remove steps to see how the pattern changes.", check: () => true },
  ];

  const currentGuide = guides[guideStep];
  const guideComplete = currentGuide?.check(steps);

  const toggleStep = (track, step) => {
    setSteps(prev => {
      const n = prev.map(r => [...r]);
      n[track][step] = !n[track][step];
      return n;
    });
  };

  const playStep = (ctx, s, st) => {
    const out = ctx.destination;
    const t = ctx.currentTime;
    if (st[0][s]) { // kick
      const g = ctx.createGain(); g.gain.setValueAtTime(0.7, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
      const osc = ctx.createOscillator(); osc.frequency.setValueAtTime(150, t); osc.frequency.exponentialRampToValueAtTime(40, t + 0.3);
      osc.connect(g); g.connect(out); osc.start(t); osc.stop(t + 0.5);
    }
    if (st[1][s]) { // snare
      const sz = Math.floor(ctx.sampleRate * 0.12);
      const buf = ctx.createBuffer(1, sz, ctx.sampleRate);
      const d = buf.getChannelData(0); for (let i = 0; i < sz; i++) d[i] = Math.random() * 2 - 1;
      const src = ctx.createBufferSource(); src.buffer = buf;
      const g = ctx.createGain(); g.gain.setValueAtTime(0.3, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
      const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 2000;
      src.connect(bp); bp.connect(g); g.connect(out); src.start(t); src.stop(t + 0.15);
    }
    if (st[2][s]) { // hat
      const sz = Math.floor(ctx.sampleRate * 0.05);
      const buf = ctx.createBuffer(1, sz, ctx.sampleRate);
      const d = buf.getChannelData(0); for (let i = 0; i < sz; i++) d[i] = Math.random() * 2 - 1;
      const src = ctx.createBufferSource(); src.buffer = buf;
      const g = ctx.createGain(); g.gain.setValueAtTime(0.15, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
      const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 7000;
      src.connect(hp); hp.connect(g); g.connect(out); src.start(t); src.stop(t + 0.06);
    }
    if (st[3][s]) { // bass
      const osc = ctx.createOscillator(); osc.type = 'sawtooth';
      osc.frequency.value = [55, 65, 49, 58][s % 4];
      const g = ctx.createGain(); g.gain.setValueAtTime(0.25, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 400;
      osc.connect(lp); lp.connect(g); g.connect(out); osc.start(t); osc.stop(t + 0.3);
    }
  };

  const toggle = () => {
    if (playing) { clearInterval(timerRef.current); setPlaying(false); setCurrentStep(-1); return; }
    const ctx = getCtx(); ctxRef.current = ctx;
    stepRef.current = 0; setPlaying(true);
    const interval = (60 / bpm / 4) * 1000;
    timerRef.current = setInterval(() => {
      const s = stepRef.current;
      setCurrentStep(s);
      playStep(ctx, s, stepsRef.current);
      stepRef.current = (s + 1) % 16;
    }, interval);
  };

  const reset = () => {
    clearInterval(timerRef.current); setPlaying(false); setCurrentStep(-1);
    setSteps(TRACKS.map(t => [...t.defaultSteps])); setGuideStep(0);
  };

  const loadPreset = (name) => {
    const presets = {
      '4/4': [[1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0],[0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0],[0,0,1,0,0,0,1,0,0,0,1,0,0,0,1,0],[1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0]].map(r => r.map(Boolean)),
      'Offbeat': [[1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0],[0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0],[0,0,1,0,0,0,1,0,0,0,1,0,0,0,1,0],[0,0,1,0,0,0,0,0,0,0,1,0,0,0,0,0]].map(r => r.map(Boolean)),
      'Syncopated': [[1,0,0,1,0,0,1,0,1,0,0,0,1,0,0,0],[0,0,0,0,0,0,1,0,0,0,0,0,0,0,1,0],[1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0],[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,0]].map(r => r.map(Boolean)),
    };
    if (presets[name]) setSteps(presets[name]);
  };

  useEffect(() => () => clearInterval(timerRef.current), []);
  useEffect(() => {
    if (playing) { clearInterval(timerRef.current); setPlaying(false); setTimeout(toggle, 50); }
  }, [bpm]);

  return (
    <div style={{ background: '#09090f', border: `1px solid ${color}22`, padding: 20, marginBottom: 24 }}>
      <div style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 10, color, letterSpacing: 2, marginBottom: 14 }}>🎛️ INTERACTIVE — 16-STEP SEQUENCER</div>

      {/* Guided tutorial */}
      <div style={{ background: color + '0f', border: `1px solid ${color}33`, borderLeft: `3px solid ${color}`, padding: '12px 14px', marginBottom: 16 }}>
        <div style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 10, color, letterSpacing: 2, marginBottom: 6 }}>
          GUIDED BUILD {guideStep + 1}/{guides.length}
        </div>
        <div style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: 15, color: '#e0e0e0', fontWeight: 600, marginBottom: 4 }}>{currentGuide.label}</div>
        <div style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: 14, color: '#888', lineHeight: 1.6 }}>{currentGuide.desc}</div>
        {guideComplete && guideStep < guides.length - 1 && (
          <button onClick={() => setGuideStep(g => g + 1)}
            style={{ marginTop: 8, background: color, border: 'none', color: '#000', padding: '5px 14px', cursor: 'pointer', fontFamily: "'Share Tech Mono',monospace", fontSize: 10, letterSpacing: 2, fontWeight: 700 }}>
            NEXT STEP →
          </button>
        )}
      </div>

      {/* Beat labels */}
      <div className="seq-scroll">
      <div style={{ display: 'grid', gridTemplateColumns: '52px repeat(16, 1fr)', gap: 2, marginBottom: 4, paddingLeft: 2, minWidth: 420 }}>
        <div />
        {Array.from({ length: 16 }, (_, i) => (
          <div key={i} style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 7, color: i % 4 === 0 ? '#555' : '#2a2a2a', textAlign: 'center', letterSpacing: 0 }}>
            {i % 4 === 0 ? `B${Math.floor(i / 4) + 1}` : '·'}
          </div>
        ))}
      </div>

      {/* Step grid */}
      {TRACKS.map((track, ti) => (
        <div key={ti} style={{ display: 'grid', gridTemplateColumns: '52px repeat(16, 1fr)', gap: 2, marginBottom: 3 }}>
          <div style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 8, color: track.col, letterSpacing: 1, display: 'flex', alignItems: 'center', paddingRight: 4, justifyContent: 'flex-end' }}>
            {track.name}
          </div>
          {steps[ti].map((on, si) => (
            <button key={si} onClick={() => toggleStep(ti, si)}
              style={{
                height: 28, border: `1px solid ${on ? track.col + '88' : si % 4 === 0 ? '#ffffff12' : '#ffffff08'}`,
                background: currentStep === si ? '#ffffff20' : on ? track.col + (currentStep === si ? 'ff' : '55') : 'transparent',
                cursor: 'pointer', borderRadius: 2,
                boxShadow: on && currentStep === si ? `0 0 8px ${track.col}` : 'none',
                marginLeft: si % 4 === 0 && si > 0 ? 3 : 0,
                transition: 'background 0.05s',
              }} />
          ))}
        </div>
      ))}
      </div>{/* end seq-scroll */}

      {/* Controls */}
      <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap', alignItems: 'center' }}>
        <button onClick={toggle}
          style={{ background: playing ? '#ff704320' : color + '20', border: `1px solid ${playing ? '#ff7043' : color}`, color: playing ? '#ff7043' : color, padding: '8px 16px', cursor: 'pointer', fontFamily: "'Share Tech Mono',monospace", fontSize: 11, letterSpacing: 2 }}>
          {playing ? '⏹ STOP' : '▶ PLAY'}
        </button>
        <button onClick={reset}
          style={{ background: 'transparent', border: '1px solid #ffffff15', color: '#555', padding: '8px 12px', cursor: 'pointer', fontFamily: "'Share Tech Mono',monospace", fontSize: 10, letterSpacing: 1 }}>
          RESET
        </button>
        {['4/4', 'Offbeat', 'Syncopated'].map(p => (
          <button key={p} onClick={() => loadPreset(p)}
            style={{ background: 'transparent', border: '1px solid #ffffff15', color: '#666', padding: '8px 12px', cursor: 'pointer', fontFamily: "'Share Tech Mono',monospace", fontSize: 10, letterSpacing: 1 }}>
            {p.toUpperCase()}
          </button>
        ))}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 10, color: '#555' }}>{bpm}</span>
          <input type="range" min="80" max="180" value={bpm} onChange={e => setBpm(+e.target.value)}
            style={{ width: 80, accentColor: color }} />
        </div>
      </div>
      <p style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: 12, color: '#444', marginTop: 10 }}>
        Click the preset buttons to hear 4/4, Offbeat, and Syncopated patterns. Then click individual steps to change them. Every pattern you've ever heard in techno was built exactly this way.
      </p>
    </div>
  );
}

// M5 — Piano keyboard with note frequencies
function M5Interactive({ getCtx, color }) {
  const [activeNote, setActiveNote] = useState(null);
  const oscRef = useRef(null);

  const notes = [
    { name: 'C3', freq: 130.8, black: false }, { name: 'C#3', freq: 138.6, black: true },
    { name: 'D3', freq: 146.8, black: false }, { name: 'D#3', freq: 155.6, black: true },
    { name: 'E3', freq: 164.8, black: false }, { name: 'F3', freq: 174.6, black: false },
    { name: 'F#3', freq: 185.0, black: true }, { name: 'G3', freq: 196.0, black: false },
    { name: 'G#3', freq: 207.7, black: true }, { name: 'A3', freq: 220.0, black: false },
    { name: 'A#3', freq: 233.1, black: true }, { name: 'B3', freq: 246.9, black: false },
    { name: 'C4', freq: 261.6, black: false }, { name: 'C#4', freq: 277.2, black: true },
    { name: 'D4', freq: 293.7, black: false }, { name: 'D#4', freq: 311.1, black: true },
    { name: 'E4', freq: 329.6, black: false },
  ];

  const playNote = (note) => {
    const ctx = getCtx();
    if (oscRef.current) { try { oscRef.current.stop(); } catch(e){} }
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sawtooth'; osc.frequency.value = note.freq;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 800;
    g.gain.setValueAtTime(0.3, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);
    osc.connect(lp); lp.connect(g); g.connect(ctx.destination);
    osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 1.3);
    oscRef.current = osc; setActiveNote(note.name);
    setTimeout(() => setActiveNote(null), 600);
  };

  const playScale = (type) => {
    const ctx = getCtx();
    const major = [0,2,4,5,7,9,11,12];
    const minor = [0,2,3,5,7,8,10,12];
    const pattern = type === 'major' ? major : minor;
    const baseNotes = notes.filter(n => !n.black);
    pattern.forEach((semitone, i) => {
      setTimeout(() => {
        const freq = 130.8 * Math.pow(2, semitone / 12);
        const ctx2 = getCtx();
        const osc = ctx2.createOscillator();
        const g = ctx2.createGain();
        osc.type = 'sawtooth'; osc.frequency.value = freq;
        const lp = ctx2.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900;
        g.gain.setValueAtTime(0.25, ctx2.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, ctx2.currentTime + 0.4);
        osc.connect(lp); lp.connect(g); g.connect(ctx2.destination);
        osc.start(ctx2.currentTime); osc.stop(ctx2.currentTime + 0.5);
      }, i * 200);
    });
  };

  const whites = notes.filter(n => !n.black);
  const keyW = 36;

  return (
    <div style={{ background: '#09090f', border: `1px solid ${color}22`, padding: 20, marginBottom: 24, overflowX: 'auto' }}>
      <div style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 10, color, letterSpacing: 2, marginBottom: 14 }}>🎛️ INTERACTIVE — NOTE KEYBOARD</div>

      {/* Active note info */}
      <div style={{ height: 40, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 16 }}>
        {activeNote ? (
          <>
            <span style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 28, color, letterSpacing: 2 }}>{activeNote}</span>
            <span style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 12, color: '#555' }}>
              {notes.find(n => n.name === activeNote)?.freq}Hz
            </span>
          </>
        ) : (
          <span style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 11, color: '#333', letterSpacing: 1 }}>CLICK ANY KEY TO HEAR IT</span>
        )}
      </div>

      {/* Keyboard */}
      <div style={{ position: 'relative', height: 120, marginBottom: 16, minWidth: whites.length * keyW }}>
        {/* White keys */}
        {whites.map((note, i) => (
          <button key={note.name} onClick={() => playNote(note)}
            style={{ position: 'absolute', left: i * keyW, top: 0, width: keyW - 2, height: 110, background: activeNote === note.name ? color + '44' : '#e8e8e8', border: '1px solid #888', borderRadius: '0 0 4px 4px', cursor: 'pointer', zIndex: 1 }}>
            {i % 7 === 0 && (
              <span style={{ position: 'absolute', bottom: 6, left: 0, right: 0, textAlign: 'center', fontFamily: "'Share Tech Mono',monospace", fontSize: 8, color: '#888' }}>
                {note.name.replace(/\d/, '')}
              </span>
            )}
          </button>
        ))}
        {/* Black keys */}
        {(() => {
          const blackPositions = [0.7, 1.7, 3.7, 4.7, 5.7, 7.7, 8.7, 10.7, 11.7, 12.7, 14.7, 15.7];
          return notes.filter(n => n.black).map((note, i) => (
            <button key={note.name} onClick={() => playNote(note)}
              style={{ position: 'absolute', left: (blackPositions[i] * keyW) + 2, top: 0, width: keyW * 0.6, height: 70, background: activeNote === note.name ? color : '#1a1a1a', border: '1px solid #000', borderRadius: '0 0 3px 3px', cursor: 'pointer', zIndex: 2 }}>
            </button>
          ));
        })()}
      </div>

      {/* Scale buttons */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <button onClick={() => playScale('major')}
          style={{ background: '#69f0ae20', border: '1px solid #69f0ae44', color: '#69f0ae', padding: '8px 16px', cursor: 'pointer', fontFamily: "'Share Tech Mono',monospace", fontSize: 10, letterSpacing: 2 }}>
          ▶ PLAY MAJOR SCALE (bright)
        </button>
        <button onClick={() => playScale('minor')}
          style={{ background: '#ba68c820', border: '1px solid #ba68c844', color: '#ba68c8', padding: '8px 16px', cursor: 'pointer', fontFamily: "'Share Tech Mono',monospace", fontSize: 10, letterSpacing: 2 }}>
          ▶ PLAY MINOR SCALE (dark)
        </button>
      </div>
      <p style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: 12, color: '#444', marginTop: 10 }}>
        Click C3 (leftmost) then C4 — same note, one octave apart. Hear how they're the same but different. Then play both scales and feel the immediate emotional contrast.
      </p>
    </div>
  );
}

// M6 — Major vs Minor comparison
function M6Interactive({ getCtx, color }) {
  const [playing, setPlaying] = useState(null);

  const playChord = (type) => {
    const ctx = getCtx();
    setPlaying(type);
    const chords = {
      major: [261.6, 329.6, 392.0],
      minor: [261.6, 311.1, 392.0],
      eastern: [261.6, 277.2, 329.6, 392.0],
    };
    chords[type].forEach(freq => {
      const osc = ctx.createOscillator(); osc.type = 'sawtooth';
      osc.frequency.value = freq;
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1200;
      const g = ctx.createGain(); g.gain.setValueAtTime(0.12, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 2.5);
      osc.connect(lp); lp.connect(g); g.connect(ctx.destination);
      osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 2.6);
    });
    setTimeout(() => setPlaying(null), 2600);
  };

  const playMelody = (type) => {
    const ctx = getCtx();
    setPlaying(type + '_mel');
    const melodies = {
      major_mel: [261.6, 293.7, 329.6, 349.2, 392.0, 440.0, 493.9, 523.2],
      minor_mel: [261.6, 293.7, 311.1, 349.2, 392.0, 415.3, 466.2, 523.2],
    };
    melodies[type + '_mel'].forEach((freq, i) => {
      setTimeout(() => {
        const osc = ctx.createOscillator(); osc.type = 'sawtooth';
        osc.frequency.value = freq;
        const g = ctx.createGain(); g.gain.setValueAtTime(0.2, ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
        const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900;
        osc.connect(lp); lp.connect(g); g.connect(ctx.destination);
        osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.4);
      }, i * 200);
    });
    setTimeout(() => setPlaying(null), 1800);
  };

  const options = [
    { key: 'major', label: 'MAJOR CHORD', sub: 'Bright · Resolved · Euphoric', col: '#69f0ae', desc: 'Full-On Psy, Goa Trance, Melodic Techno — the uplifting festival sound' },
    { key: 'minor', label: 'MINOR CHORD', sub: 'Dark · Tense · Emotional', col: '#ba68c8', desc: 'Dark Psy, Industrial Techno, Dark Techno — the underground night sound' },
    { key: 'eastern', label: 'EASTERN CHORD', sub: 'Exotic · Ancient · Spiritual', col: '#ffca28', desc: 'Goa Trance, Tribal Psy — the Goa beach party sound' },
  ];

  return (
    <div style={{ background: '#09090f', border: `1px solid ${color}22`, padding: 20, marginBottom: 24 }}>
      <div style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 10, color, letterSpacing: 2, marginBottom: 14 }}>🎛️ INTERACTIVE — SCALE EMOTION COMPARATOR</div>
      <p style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: 13, color: '#666', marginBottom: 16 }}>Same notes, different arrangement. Hear how one change in the note pattern completely transforms the emotional feeling.</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
        {options.map(opt => (
          <div key={opt.key} style={{ background: playing === opt.key ? opt.col + '15' : '#09090f', border: `1px solid ${playing === opt.key ? opt.col : '#ffffff0a'}`, padding: '14px 16px', transition: 'all 0.2s' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
              <button onClick={() => playChord(opt.key)}
                style={{ background: opt.col + '20', border: `1px solid ${opt.col}44`, color: opt.col, padding: '6px 14px', cursor: 'pointer', fontFamily: "'Share Tech Mono',monospace", fontSize: 10, letterSpacing: 2, flexShrink: 0 }}>
                {playing === opt.key ? '♪' : '▶'} {opt.label}
              </button>
              <span style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 10, color: opt.col, letterSpacing: 1 }}>{opt.sub}</span>
            </div>
            <div style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: 13, color: '#555' }}>{opt.desc}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <button onClick={() => playMelody('major')}
          style={{ background: '#69f0ae10', border: '1px solid #69f0ae33', color: '#69f0ae', padding: '8px 14px', cursor: 'pointer', fontFamily: "'Share Tech Mono',monospace", fontSize: 10, letterSpacing: 1 }}>
          ▶ MAJOR MELODY
        </button>
        <button onClick={() => playMelody('minor')}
          style={{ background: '#ba68c810', border: '1px solid #ba68c833', color: '#ba68c8', padding: '8px 14px', cursor: 'pointer', fontFamily: "'Share Tech Mono',monospace", fontSize: 10, letterSpacing: 1 }}>
          ▶ MINOR MELODY
        </button>
      </div>
      <p style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: 12, color: '#444', marginTop: 10 }}>
        Play Major then Minor chord back to back. Feel the difference in your body, not just your ears. Then play both melodies. One sounds like a sunrise festival. One sounds like the dark tent at midnight.
      </p>
    </div>
  );
}

// M7 — Frequency band visualiser
function M7Interactive({ getCtx, color }) {
  const [playing, setPlaying] = useState(null);
  const [activeBand, setActiveBand] = useState(null);

  const bands = [
    { name: 'SUB BASS', range: '20–60Hz', col: '#ff5252', desc: 'Felt in your chest. The kick drum body. At high volumes, this is what makes raves physical experiences, not just musical ones. Most headphones cannot reproduce this accurately — you need subwoofers.', freq: 45, type: 'sine', gain: 0.5, dur: 1.5 },
    { name: 'BASS', range: '60–200Hz', col: '#ff7043', desc: 'The kick drum attack and the bassline melody. This is the most important and most crowded frequency range in electronic music. The kick and bassline share this space — EQ carves room for both.', freq: 100, type: 'sine', gain: 0.4, dur: 1.2 },
    { name: 'LOW MIDS', range: '200Hz–1kHz', col: '#ffca28', desc: 'The body of most instruments. Snare warmth, bassline harmonics, pad texture. Too much here = muddy, congested sound. Too little = thin and hollow. Most subtle mixing decisions happen here.', freq: 400, type: 'sawtooth', gain: 0.2, dur: 1.0 },
    { name: 'HIGH MIDS', range: '1kHz–8kHz', col: '#69f0ae', desc: 'Presence and attack. Snare crack, synth leads, what you consciously perceive as "the music". Sounds here cut through a mix and feel immediate and close. Most of what you identify as a specific sound lives here.', freq: 2500, type: 'sawtooth', gain: 0.15, dur: 0.8 },
    { name: 'HIGHS', range: '8kHz–20kHz', col: '#4fc3f7', desc: 'Hi-hats, cymbals, air and sparkle. Adds brightness and space to a mix. Walk outside a club and these frequencies disappear first — they do not travel through walls. What you hear outside is mostly sub-bass and bass.', freq: 10000, type: 'square', gain: 0.08, dur: 0.5 },
  ];

  const playBand = (band) => {
    const ctx = getCtx();
    setPlaying(band.name);
    const osc = ctx.createOscillator(); osc.type = band.type;
    osc.frequency.value = band.freq;
    const g = ctx.createGain(); g.gain.setValueAtTime(band.gain, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + band.dur);
    osc.connect(g); g.connect(ctx.destination);
    osc.start(ctx.currentTime); osc.stop(ctx.currentTime + band.dur + 0.1);
    setTimeout(() => setPlaying(null), band.dur * 1000 + 100);
  };

  return (
    <div style={{ background: '#09090f', border: `1px solid ${color}22`, padding: 20, marginBottom: 24 }}>
      <div style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 10, color, letterSpacing: 2, marginBottom: 14 }}>🎛️ INTERACTIVE — FREQUENCY BAND EXPLORER</div>
      <p style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: 13, color: '#666', marginBottom: 16 }}>Click each frequency band to hear a representative sound from that range. Click the band name to read what lives there.</p>

      {/* Spectrum bar */}
      <div style={{ display: 'flex', height: 8, borderRadius: 4, overflow: 'hidden', marginBottom: 16 }}>
        {bands.map(b => (
          <div key={b.name} style={{ flex: 1, background: b.col + (activeBand === b.name ? 'ff' : '44'), transition: 'background 0.2s', cursor: 'pointer' }}
            onClick={() => setActiveBand(activeBand === b.name ? null : b.name)} />
        ))}
      </div>
      <div style={{ display: 'flex', marginBottom: 20 }}>
        <span style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 9, color: '#333' }}>20Hz</span>
        <span style={{ marginLeft: 'auto', fontFamily: "'Share Tech Mono',monospace", fontSize: 9, color: '#333' }}>20,000Hz</span>
      </div>

      {/* Band cards */}
      {bands.map(band => (
        <div key={band.name} style={{ marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button onClick={() => playBand(band)}
              style={{ background: playing === band.name ? band.col + '33' : band.col + '15', border: `1px solid ${band.col}44`, color: band.col, padding: '6px 12px', cursor: 'pointer', fontFamily: "'Share Tech Mono',monospace", fontSize: 10, letterSpacing: 1, flexShrink: 0, minWidth: 28 }}>
              {playing === band.name ? '♪' : '▶'}
            </button>
            <button onClick={() => setActiveBand(activeBand === band.name ? null : band.name)}
              style={{ flex: 1, background: 'transparent', border: `1px solid ${activeBand === band.name ? band.col + '44' : '#ffffff0a'}`, color: activeBand === band.name ? band.col : '#888', padding: '6px 12px', cursor: 'pointer', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 10, letterSpacing: 1 }}>{band.name}</span>
              <span style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 9, color: '#444' }}>{band.range}</span>
            </button>
          </div>
          {activeBand === band.name && (
            <div style={{ background: band.col + '08', border: `1px solid ${band.col}22`, borderTop: 'none', padding: '10px 12px' }}>
              <p style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: 14, color: '#aaa', margin: 0, lineHeight: 1.6 }}>{band.desc}</p>
            </div>
          )}
        </div>
      ))}
      <p style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: 12, color: '#444', marginTop: 14 }}>
        Use headphones or speakers with a subwoofer for Sub Bass — you literally cannot hear it on laptop speakers, only feel it. That physical sensation at a rave is almost entirely this frequency range.
      </p>
    </div>
  );
}

// M8 — Guided full pattern builder
function M8Interactive({ getCtx, color }) {
  const [steps, setSteps] = useState({
    kick: new Array(16).fill(false),
    hat: new Array(16).fill(false),
    snare: new Array(16).fill(false),
    bass: new Array(16).fill(false),
  });
  const [playing, setPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(-1);
  const [bpm, setBpm] = useState(132);
  const [buildStep, setBuildStep] = useState(0);
  const timerRef = useRef(null);
  const stepsRef = useRef(steps);
  stepsRef.current = steps;

  const buildSteps = [
    { label: "Silence", desc: "This is what a track sounds like before anything exists. Press play — just silence. Every techno track starts here.", action: null },
    { label: "Add the kick — the pulse (Module 2 + 4)", desc: "The foundation of everything. 4 kicks per bar on every beat. This alone is already a recognisable loop.", action: () => setSteps(p => ({ ...p, kick: p.kick.map((_, i) => [0,4,8,12].includes(i)) })) },
    { label: "Add the hi-hat — the offbeat (Module 4)", desc: "Between every kick, a hi-hat. The offbeat. Suddenly it has energy and forward motion.", action: () => setSteps(p => ({ ...p, hat: p.hat.map((_, i) => [2,6,10,14].includes(i)) })) },
    { label: "Add the snare — the backbeat (Module 4)", desc: "One snare on beat 3. This gives the pattern a centre of gravity. The groove locks in.", action: () => setSteps(p => ({ ...p, snare: p.snare.map((_, i) => i === 8) })) },
    { label: "Add the bassline — melody in the low end (Module 5)", desc: "Four bass notes stepping through a minor scale (Module 6). Now you have rhythm AND melody. This is a complete techno loop.", action: () => setSteps(p => ({ ...p, bass: p.bass.map((_, i) => [0,4,8,12].includes(i)) })) },
    { label: "Your first techno pattern — all concepts combined", desc: "Sound (Module 1) · Pulse (Module 2) · BPM at 132 (Module 3) · 16-step grid in 4/4 (Module 4) · Bass notes from a scale (Modules 5 + 6) · Each element in its frequency range (Module 7). This is how every techno track begins.", action: null },
  ];

  const currentBuild = buildSteps[buildStep];

  const applyBuildStep = (idx) => {
    setBuildStep(idx);
    if (buildSteps[idx].action) buildSteps[idx].action();
  };

  const toggle = () => {
    if (playing) { clearInterval(timerRef.current); setPlaying(false); setCurrentStep(-1); return; }
    const ctx = getCtx(); let s = 0; setPlaying(true);
    const interval = (60 / bpm / 4) * 1000;
    timerRef.current = setInterval(() => {
      setCurrentStep(s);
      const t = ctx.currentTime; const st = stepsRef.current;
      if (st.kick[s]) {
        const g = ctx.createGain(); g.gain.setValueAtTime(0.65, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.38);
        const osc = ctx.createOscillator(); osc.frequency.setValueAtTime(150, t); osc.frequency.exponentialRampToValueAtTime(42, t + 0.28);
        osc.connect(g); g.connect(ctx.destination); osc.start(t); osc.stop(t + 0.45);
      }
      if (st.hat[s]) {
        const sz = Math.floor(ctx.sampleRate * 0.04);
        const buf = ctx.createBuffer(1, sz, ctx.sampleRate); const d = buf.getChannelData(0);
        for (let i = 0; i < sz; i++) d[i] = Math.random() * 2 - 1;
        const src = ctx.createBufferSource(); src.buffer = buf;
        const g = ctx.createGain(); g.gain.setValueAtTime(0.12, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.03);
        const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 8000;
        src.connect(hp); hp.connect(g); g.connect(ctx.destination); src.start(t); src.stop(t + 0.05);
      }
      if (st.snare[s]) {
        const sz = Math.floor(ctx.sampleRate * 0.1);
        const buf = ctx.createBuffer(1, sz, ctx.sampleRate); const d = buf.getChannelData(0);
        for (let i = 0; i < sz; i++) d[i] = Math.random() * 2 - 1;
        const src = ctx.createBufferSource(); src.buffer = buf;
        const g = ctx.createGain(); g.gain.setValueAtTime(0.28, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
        const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1800;
        src.connect(bp); bp.connect(g); g.connect(ctx.destination); src.start(t); src.stop(t + 0.12);
      }
      if (st.bass[s]) {
        const bassNotes = [110, 123.5, 98, 116.5];
        const osc = ctx.createOscillator(); osc.type = 'sawtooth'; osc.frequency.value = bassNotes[Math.floor(s/4) % 4];
        const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 350;
        const g = ctx.createGain(); g.gain.setValueAtTime(0.28, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
        osc.connect(lp); lp.connect(g); g.connect(ctx.destination); osc.start(t); osc.stop(t + 0.28);
      }
      s = (s + 1) % 16;
    }, interval);
  };

  useEffect(() => () => clearInterval(timerRef.current), []);

  const trackDefs = [
    { key: 'kick', name: 'KICK', col: '#ff6b6b', hz: '~60Hz' },
    { key: 'hat', name: 'HI-HAT', col: '#4fc3f7', hz: '~10kHz' },
    { key: 'snare', name: 'SNARE', col: '#ffca28', hz: '~200Hz' },
    { key: 'bass', name: 'BASS', col: '#69f0ae', hz: '~110Hz' },
  ];

  return (
    <div style={{ background: '#09090f', border: `1px solid ${color}22`, padding: 20, marginBottom: 24 }}>
      <div style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 10, color, letterSpacing: 2, marginBottom: 14 }}>🎛️ GUIDED PATTERN BUILD — ALL 8 MODULES COMBINED</div>

      {/* Build steps */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 20 }}>
        {buildSteps.map((bs, i) => (
          <button key={i} onClick={() => applyBuildStep(i)}
            style={{ background: buildStep === i ? color + '15' : 'transparent', border: `1px solid ${buildStep === i ? color + '55' : '#ffffff0a'}`, padding: '10px 14px', cursor: 'pointer', textAlign: 'left' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 10, color: buildStep === i ? color : '#333', width: 16 }}>{i + 1}</span>
              <div>
                <div style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 10, color: buildStep === i ? color : '#555', letterSpacing: 1 }}>{bs.label.toUpperCase()}</div>
                {buildStep === i && <div style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: 13, color: '#888', marginTop: 3, lineHeight: 1.5 }}>{bs.desc}</div>}
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="seq-scroll">
      {trackDefs.map(track => (
        <div key={track.key} style={{ display: 'grid', gridTemplateColumns: '72px repeat(16, 1fr)', gap: 2, marginBottom: 3, minWidth: 460 }}>
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', paddingRight: 6 }}>
            <span style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 8, color: track.col, letterSpacing: 1 }}>{track.name}</span>
            <span style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 7, color: '#333' }}>{track.hz}</span>
          </div>
          {steps[track.key].map((on, si) => (
            <div key={si} style={{
              height: 24, border: `1px solid ${on ? track.col + '66' : si % 4 === 0 ? '#ffffff10' : '#ffffff06'}`,
              background: currentStep === si ? '#ffffff22' : on ? track.col + '55' : 'transparent',
              borderRadius: 2, marginLeft: si % 4 === 0 && si > 0 ? 3 : 0,
              boxShadow: on && currentStep === si ? `0 0 6px ${track.col}` : 'none',
              transition: 'background 0.05s',
            }} />
          ))}
        </div>
      ))}
      </div>{/* end seq-scroll */}

      {/* Playback */}
      <div style={{ display: 'flex', gap: 10, marginTop: 14, alignItems: 'center' }}>
        <button onClick={toggle}
          style={{ background: playing ? '#ff704320' : color + '20', border: `1px solid ${playing ? '#ff7043' : color}`, color: playing ? '#ff7043' : color, padding: '8px 18px', cursor: 'pointer', fontFamily: "'Share Tech Mono',monospace", fontSize: 11, letterSpacing: 2 }}>
          {playing ? '⏹ STOP' : '▶ PLAY'}
        </button>
        <span style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 10, color: '#555' }}>{bpm} BPM</span>
        <input type="range" min="110" max="160" value={bpm} onChange={e => setBpm(+e.target.value)}
          style={{ flex: 1, accentColor: color }} />
      </div>
    </div>
  );
}

export default function TechnoVocab() {
  const isMobile = useIsMobile();
  const [activeCategory, setActiveCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("glossary");
  const [expandedId, setExpandedId] = useState(null);
  const [bpm, setBpm] = useState(140);
  const [beating, setBeating] = useState(false);
  const [beatFlash, setBeatFlash] = useState(false);
  const [playingGenre, setPlayingGenre] = useState(null);
  const [isPaused, setIsPaused] = useState(false);
  const [genreBeatStep, setGenreBeatStep] = useState(0);

  const audioCtxRef = useRef(null);
  const masterOutRef = useRef(null);
  const schedulerTimerRef = useRef(null);
  const visualTimerRef = useRef(null);
  const nextStepTimeRef = useRef(0);
  const currentStepRef = useRef(0);
  const currentPatternRef = useRef(null);
  // Sync refs — React state is async so we need these for instant toggle logic
  const playingGenreRef = useRef(null);
  const isPausedRef = useRef(false);

  useEffect(() => {
    let iv;
    if (beating) {
      const ms = (60 / bpm) * 1000;
      iv = setInterval(() => { setBeatFlash(true); setTimeout(() => setBeatFlash(false), 80); }, ms);
    }
    return () => clearInterval(iv);
  }, [beating, bpm]);

  const initAudio = () => {
    if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const master = ctx.createGain(); master.gain.value = 0.75;
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -10; comp.ratio.value = 4;
      master.connect(comp); comp.connect(ctx.destination);
      audioCtxRef.current = ctx; masterOutRef.current = master;
    }
    return { ctx: audioCtxRef.current, out: masterOutRef.current };
  };

  // Stop everything — wipes genre, resets step counter
  const fullStop = () => {
    if (schedulerTimerRef.current) { clearInterval(schedulerTimerRef.current); schedulerTimerRef.current = null; }
    if (visualTimerRef.current)    { clearInterval(visualTimerRef.current);    visualTimerRef.current = null; }
    currentPatternRef.current = null;
    playingGenreRef.current = null;
    isPausedRef.current = false;
    setPlayingGenre(null);
    setIsPaused(false);
    setGenreBeatStep(0);
  };

  // Pause — suspends AudioContext + stops scheduler, keeps step position
  const pauseGenre = () => {
    if (schedulerTimerRef.current) { clearInterval(schedulerTimerRef.current); schedulerTimerRef.current = null; }
    if (visualTimerRef.current)    { clearInterval(visualTimerRef.current);    visualTimerRef.current = null; }
    if (audioCtxRef.current) audioCtxRef.current.suspend();
    isPausedRef.current = true;
    setIsPaused(true);
  };

  // Resume — unfreezes AudioContext, restarts scheduler from current step
  const resumeGenre = () => {
    const ctx = audioCtxRef.current, out = masterOutRef.current;
    const pattern = currentPatternRef.current;
    if (!ctx || !out || !pattern) return;
    ctx.resume().then(() => {
      // Reset lookahead to just ahead of now so scheduler doesn't skip beats
      nextStepTimeRef.current = ctx.currentTime + 0.1;
      const stepDuration = (60 / pattern.bpm) / 4;
      const schedule = () => {
        if (!audioCtxRef.current || !masterOutRef.current || !currentPatternRef.current) return;
        if (nextStepTimeRef.current < audioCtxRef.current.currentTime - stepDuration) {
          nextStepTimeRef.current = audioCtxRef.current.currentTime + 0.05;
        }
        while (nextStepTimeRef.current < audioCtxRef.current.currentTime + 0.25) {
          const step = currentStepRef.current;
          try { currentPatternRef.current.playStep(step, audioCtxRef.current, nextStepTimeRef.current, masterOutRef.current); } catch (e) {}
          nextStepTimeRef.current += stepDuration;
          currentStepRef.current = (step + 1) % 16;
        }
      };
      schedulerTimerRef.current = setInterval(schedule, 50);
      visualTimerRef.current = setInterval(() => setGenreBeatStep(s => (s + 1) % 16), stepDuration * 1000);
      isPausedRef.current = false;
      setIsPaused(false);
    });
  };

  // Start a brand-new genre from step 0
  const startGenre = (genreKey) => {
    const pattern = getAudio(genreKey);
    if (!pattern) return;
    const { ctx, out } = initAudio();
    if (ctx.state === 'suspended') ctx.resume();
    playingGenreRef.current = genreKey;
    isPausedRef.current = false;
    currentStepRef.current = 0;
    nextStepTimeRef.current = ctx.currentTime + 0.1;
    currentPatternRef.current = pattern;
    const stepDuration = (60 / pattern.bpm) / 4;
    const schedule = () => {
      const c = audioCtxRef.current, o = masterOutRef.current;
      if (!c || !o || !currentPatternRef.current) return;
      if (nextStepTimeRef.current < c.currentTime - stepDuration) {
        nextStepTimeRef.current = c.currentTime + 0.05;
      }
      while (nextStepTimeRef.current < c.currentTime + 0.25) {
        const step = currentStepRef.current;
        try { currentPatternRef.current.playStep(step, c, nextStepTimeRef.current, o); } catch (e) {}
        nextStepTimeRef.current += stepDuration;
        currentStepRef.current = (step + 1) % 16;
      }
    };
    schedulerTimerRef.current = setInterval(schedule, 50);
    visualTimerRef.current = setInterval(() => setGenreBeatStep(s => (s + 1) % 16), stepDuration * 1000);
    setPlayingGenre(genreKey);
    setIsPaused(false);
    setGenreBeatStep(0);
  };

  // Main handler called by every play button
  const handleGenreButton = (genreKey) => {
    const currentlyPlaying = playingGenreRef.current;
    const currentlyPaused = isPausedRef.current;

    if (currentlyPlaying === genreKey) {
      // Same genre clicked
      if (!currentlyPaused) {
        pauseGenre();       // Playing → Pause
      } else {
        resumeGenre();      // Paused → Resume
      }
    } else {
      // Different genre clicked — stop whatever's running, start new one
      fullStop();
      startGenre(genreKey);
    }
  };

  useEffect(() => () => {
    if (schedulerTimerRef.current) clearInterval(schedulerTimerRef.current);
    if (visualTimerRef.current)    clearInterval(visualTimerRef.current);
    if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') audioCtxRef.current.close();
  }, []);

  const filtered = terms.filter(t => {
    const mc = activeCategory === "All" || t.category === activeCategory;
    const ms = t.term.toLowerCase().includes(search.toLowerCase()) || t.description.toLowerCase().includes(search.toLowerCase());
    return mc && ms;
  });

  // Beat dots visualizer
  const BeatDots = ({ genreKey, color }) => {
    const isThisGenre = playingGenre === genreKey;
    const isActivelyPlaying = isThisGenre && !isPaused;
    const beatIndex = Math.floor(genreBeatStep / 4);
    const subIndex = genreBeatStep % 4;
    return (
      <div style={{ display:'flex', gap:6, alignItems:'center' }}>
        {[0,1,2,3].map(i => (
          <div key={i} style={{
            width:10, height:10, borderRadius:'50%',
            background: isActivelyPlaying && beatIndex===i ? color : 'transparent',
            border:`1px solid ${isThisGenre ? color : '#333'}`,
            transition:'background 0.04s',
            boxShadow: isActivelyPlaying && beatIndex===i ? `0 0 8px ${color}` : 'none',
            opacity: isThisGenre && isPaused ? 0.4 : 1,
          }} />
        ))}
        {isActivelyPlaying && (
          <div style={{ display:'flex', gap:3, marginLeft:4 }}>
            {[0,1,2,3].map(i => (
              <div key={i} style={{ width:5, height:5, borderRadius:'50%', background: subIndex===i ? color+'aa':'#1a1a1a', transition:'background 0.04s' }} />
            ))}
          </div>
        )}
      </div>
    );
  };

  // Genre card with play/pause button
  const GenreCard = ({ genreKey, title, description, compact=false }) => {
    const audio = GENRE_AUDIO[genreKey];
    const isThisGenre = playingGenre === genreKey;
    const isActivelyPlaying = isThisGenre && !isPaused;
    const isThisPaused = isThisGenre && isPaused;
    if (!audio) return null;

    // Button icon: ▶ = not loaded / paused, ⏸ = playing
    const btnIcon = isActivelyPlaying ? '⏸' : '▶';
    const btnTitle = isActivelyPlaying ? 'Pause' : isThisPaused ? 'Resume' : 'Play demo';

    return (
      <div style={{
        border:`1px solid ${isThisGenre ? audio.color+'55':'#ffffff0a'}`,
        background: isThisGenre ? audio.color+'08':'#0a0a10',
        padding: compact ? '14px 16px':'20px 22px',
        transition:'all 0.2s',
        borderLeft:`3px solid ${isThisGenre ? audio.color:'#ffffff0a'}`,
        marginBottom: compact ? 4:0,
      }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:12 }}>
          <div style={{ flex:1 }}>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:4 }}>
              <span style={{ fontSize: compact ? 14:16 }}>{audio.emoji}</span>
              <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize: compact ? 20:24, color:'#fff', letterSpacing:2 }}>{title}</span>
              <span style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:10, color:audio.color, letterSpacing:1, background:audio.color+'18', padding:'2px 8px', border:`1px solid ${audio.color}33` }}>
                {audio.bpm} BPM
              </span>
            </div>
            {!compact && description && (
              <p style={{ fontFamily:"'Rajdhani',sans-serif", fontSize:14, color:'#777', margin:'0 0 8px', lineHeight:1.6 }}>{description}</p>
            )}
            <div style={{ display:'flex', alignItems:'center', gap:12, marginTop:6 }}>
              <BeatDots genreKey={genreKey} color={audio.color} />
              {isActivelyPlaying && <span style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:10, color:audio.color, letterSpacing:2 }}>◉ PLAYING</span>}
              {isThisPaused && <span style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:10, color:'#666', letterSpacing:2 }}>⏸ PAUSED</span>}
            </div>
          </div>
          <button
            onClick={() => handleGenreButton(genreKey)}
            style={{
              background: isThisGenre ? audio.color+'22':'transparent',
              border:`1px solid ${isThisGenre ? audio.color:'#ffffff22'}`,
              color: isThisGenre ? audio.color:'#888',
              width:44, height:44, borderRadius:'50%', cursor:'pointer',
              fontSize:16, display:'flex', alignItems:'center', justifyContent:'center',
              transition:'all 0.15s', flexShrink:0,
              boxShadow: isActivelyPlaying ? `0 0 20px ${audio.color}44`:'none',
            }}
            title={btnTitle}
          >
            {btnIcon}
          </button>
        </div>
      </div>
    );
  };

  return (
    <div style={{ minHeight:"100vh", background:"#050507", fontFamily:"'Courier New',monospace", color:"#e0e0e0", overflowX:"hidden", width:"100%", maxWidth:"100vw" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&family=Bebas+Neue&family=Rajdhani:wght@300;400;600;700&display=swap');
        *{box-sizing:border-box} html,body{overflow-x:hidden;width:100%}
        ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:#0a0a0f}::-webkit-scrollbar-thumb{background:#00ffcc44;border-radius:2px}
        .glitch-text{animation:glitch 8s infinite}
        @keyframes glitch{0%,92%,100%{text-shadow:none;transform:translate(0)}93%{text-shadow:-2px 0 #ff0080,2px 0 #00ffcc;transform:translate(1px,-1px)}94%{text-shadow:2px 0 #ff0080,-2px 0 #00ffcc;transform:translate(-1px,1px)}95%{text-shadow:none;transform:translate(0)}96%{text-shadow:-1px 0 #ff0080;transform:translate(2px,0)}97%{text-shadow:none;transform:translate(0)}}
        .scanlines{position:fixed;top:0;left:0;right:0;bottom:0;background:repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.07) 2px,rgba(0,0,0,0.07) 4px);pointer-events:none;z-index:9999}
        .tab-btn{background:transparent;border:1px solid #ffffff18;color:#888;padding:10px 22px;cursor:pointer;font-family:'Share Tech Mono',monospace;font-size:13px;letter-spacing:2px;text-transform:uppercase;transition:all 0.2s}
        .tab-btn:hover{color:#00ffcc;border-color:#00ffcc44}.tab-btn.active{background:#00ffcc15;border-color:#00ffcc;color:#00ffcc;box-shadow:0 0 20px #00ffcc22}
        .cat-btn{background:transparent;border:1px solid #ffffff15;color:#666;padding:7px 16px;cursor:pointer;font-family:'Share Tech Mono',monospace;font-size:11px;letter-spacing:1.5px;text-transform:uppercase;transition:all 0.15s;border-radius:2px}
        .cat-btn:hover{color:#fff;border-color:#ffffff40}.cat-btn.active{background:#ffffff12;border-color:#ffffff55;color:#fff}
        .term-card{border:1px solid #ffffff0a;background:#0a0a10;padding:18px 20px;cursor:pointer;transition:all 0.2s;border-left:3px solid transparent;margin-bottom:4px}
        .term-card:hover{background:#0f0f18;border-color:#ffffff18}.term-card.open{background:#0c0c16;border-left-color:#00ffcc;border-color:#00ffcc22}
        .search-input{background:#0a0a12;border:1px solid #ffffff18;color:#e0e0e0;padding:12px 18px;font-family:'Share Tech Mono',monospace;font-size:13px;width:100%;outline:none;letter-spacing:1px;transition:border-color 0.2s}
        .search-input:focus{border-color:#00ffcc55;box-shadow:0 0 20px #00ffcc11}.search-input::placeholder{color:#333}
        .bpm-slider{-webkit-appearance:none;width:100%;height:4px;background:linear-gradient(to right,#00ffcc,#ff1744);border-radius:2px;outline:none;cursor:pointer}
        .bpm-slider::-webkit-slider-thumb{-webkit-appearance:none;width:20px;height:20px;background:#fff;border-radius:50%;box-shadow:0 0 10px #00ffccaa;cursor:pointer}
        .beat-circle{width:80px;height:80px;border-radius:50%;border:2px solid #00ffcc;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all 0.05s;font-family:'Share Tech Mono',monospace;font-size:11px;letter-spacing:1px;color:#00ffcc;text-align:center;background:transparent}
        .beat-circle.flash{background:#00ffcc33;box-shadow:0 0 40px #00ffcc88,0 0 80px #00ffcc44;transform:scale(1.15)}.beat-circle.active{box-shadow:0 0 20px #00ffcc44}
        @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}.fade-in{animation:fadeIn 0.3s ease forwards}
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}.spin{animation:spin 2s linear infinite}
        /* ── MOBILE RESPONSIVE ── */
        /* Tab scroll — always on, not just mobile */
        .tab-outer{overflow-x:auto;-webkit-overflow-scrolling:touch;scrollbar-width:none;border-bottom:1px solid rgba(255,255,255,0.04)}
        .tab-outer::-webkit-scrollbar{display:none}
        .tab-inner{display:flex;padding:0 8px;width:max-content;min-width:100%;justify-content:center}
        @media(max-width:768px){.tab-inner{justify-content:flex-start}}
        .tab-btn{white-space:nowrap;flex-shrink:0}
        /* Seq scroll — always on */
        .seq-scroll{overflow-x:auto;-webkit-overflow-scrolling:touch;padding-bottom:6px}
        .seq-scroll::-webkit-scrollbar{height:2px}
        .seq-scroll::-webkit-scrollbar-thumb{background:#00ffcc33;border-radius:2px}
        @media(max-width:768px){
          .tab-btn{padding:8px 10px;font-size:10px;letter-spacing:1px}
          .term-card{padding:12px 14px}
          .beat-circle{width:54px;height:54px;font-size:9px}
          .search-input{font-size:12px;padding:10px 14px}
          .cat-btn{padding:5px 10px;font-size:10px}
          .genre-cols{grid-template-columns:1fr !important}
          .dj-grid{grid-template-columns:1fr !important}
          .tech-cards{grid-template-columns:1fr !important}
          .m3-options{flex-direction:column}
        }
      `}</style>
      <div className="scanlines" />

      {/* Header */}
      <div style={{ position:"relative", zIndex:10, borderBottom:"1px solid #ffffff0a", padding: isMobile ? "20px 16px 14px" : "30px 24px 20px" }}>
        <div style={{ maxWidth:900, margin:"0 auto" }}>
          <h1 className="glitch-text" style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:"clamp(48px,10vw,80px)", color:"#fff", letterSpacing:6, margin:0, lineHeight:1 }}>TECHNO LEXICON</h1>
          <p style={{ color:"#00ffcc", fontFamily:"'Share Tech Mono',monospace", fontSize:isMobile?10:12, letterSpacing:isMobile?1:3, margin:"4px 0 0", textTransform:"uppercase", lineHeight:1.5 }}>
            // The Underground Dictionary — BPM · Genres · Production · DJ Skills
          </p>
          {playingGenre && (
            <div style={{ display:'flex', alignItems:'center', gap:10, marginTop:10 }}>
              <svg className={isPaused ? '' : 'spin'} width={14} height={14} viewBox="0 0 14 14">
                <circle cx={7} cy={7} r={6} fill="none" stroke={getAudio(playingGenre)?.color} strokeWidth={1.5} strokeDasharray="12 8" />
              </svg>
              <span style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:11, color:getAudio(playingGenre)?.color, letterSpacing:2 }}>
                {isPaused ? 'PAUSED' : 'NOW PLAYING'} // {playingGenre} @ {getAudio(playingGenre)?.bpm} BPM
              </span>
              <button onClick={fullStop} style={{ background:'transparent', border:`1px solid ${getAudio(playingGenre)?.color}44`, color:getAudio(playingGenre)?.color, padding:'2px 10px', cursor:'pointer', fontFamily:"'Share Tech Mono',monospace", fontSize:10, letterSpacing:2 }}>⏹ STOP</button>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="tab-outer" style={{ position:"relative", zIndex:10 }}>
        <div className="tab-inner">
          {[["foundations","FOUNDATIONS"],["glossary","GLOSSARY"],["bpm","BPM GUIDE"],["genres","GENRE MAP + AUDIO"],["dj","DJ BOOTH"]].map(([id,lbl]) => (
            <button key={id} className={`tab-btn ${activeTab===id?"active":""}`} onClick={() => setActiveTab(id)}>{lbl}</button>
          ))}
        </div>
      </div>

      <div style={{ maxWidth:900, margin:"0 auto", padding: isMobile ? "14px 12px" : "24px", position:"relative", zIndex:10 }}>

        {/* ══ GLOSSARY ══ */}
        {activeTab==="glossary" && (
          <div className="fade-in">
            <input className="search-input" placeholder="SEARCH TERMS..." value={search} onChange={e => setSearch(e.target.value)} style={{ marginBottom:20 }} />
            <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:24 }}>
              {categories.map(c => <button key={c} className={`cat-btn ${activeCategory===c?"active":""}`} onClick={() => setActiveCategory(c)}>{c}</button>)}
            </div>
            <p style={{ color:"#444", fontSize:11, fontFamily:"'Share Tech Mono',monospace", letterSpacing:2, marginBottom:12 }}>{filtered.length} TERMS FOUND</p>
            {filtered.map(term => (
              term.category==="Genres" && GENRE_AUDIO[term.term] ? (
                <div key={term.id} style={{ marginBottom:4 }}>
                  <GenreCard genreKey={term.term} title={term.term} description={term.description} compact={true} />
                  <div style={{ background:'#08080f', border:'1px solid #ffffff0a', borderTop:'none', padding:'0 16px' }}>
                    <button onClick={() => setExpandedId(expandedId===term.id?null:term.id)} style={{ background:'transparent', border:'none', color:'#444', cursor:'pointer', fontFamily:"'Share Tech Mono',monospace", fontSize:11, letterSpacing:2, padding:'8px 0' }}>
                      {expandedId===term.id?'▲ LESS':'▼ MORE INFO'}
                    </button>
                  </div>
                  {expandedId===term.id && (
                    <div style={{ background:'#0a0a12', border:'1px solid #ffffff0a', borderTop:'none', padding:'14px 20px' }} className="fade-in">
                      {/* Level badge */}
                      {term.level && (() => {
                        const lvlColor = term.level==='Beginner'?'#69f0ae':term.level==='Intermediate'?'#ffca28':'#ff7043';
                        return <span style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:10, letterSpacing:2, color:lvlColor, background:lvlColor+'18', border:`1px solid ${lvlColor}44`, padding:'3px 10px', display:'inline-block', marginBottom:12 }}>{term.level.toUpperCase()}</span>;
                      })()}
                      {/* Plain English */}
                      {term.plain && (
                        <div style={{ background:'#0d1a14', border:'1px solid #69f0ae22', borderLeft:'3px solid #69f0ae', padding:'12px 16px', marginBottom:12 }}>
                          <div style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:10, color:'#69f0ae', letterSpacing:2, marginBottom:6 }}>💡 IN PLAIN ENGLISH</div>
                          <p style={{ fontFamily:"'Rajdhani',sans-serif", fontSize:15, color:'#d4d4d4', margin:0, lineHeight:1.7 }}>{term.plain}</p>
                        </div>
                      )}
                      <p style={{ color:"#c0c0c0", fontFamily:"'Rajdhani',sans-serif", fontSize:15, lineHeight:1.7, margin:"0 0 12px" }}>{term.description}</p>
                      {term.why && (
                        <div style={{ background:'#0a0a1a', border:'1px solid #7986cb22', borderLeft:'3px solid #7986cb', padding:'10px 14px', marginBottom:12 }}>
                          <div style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:10, color:'#7986cb', letterSpacing:2, marginBottom:6 }}>⚡ WHY IT MATTERS</div>
                          <p style={{ fontFamily:"'Rajdhani',sans-serif", fontSize:15, color:'#aaa', margin:0, lineHeight:1.6 }}>{term.why}</p>
                        </div>
                      )}
                      {term.listen && (
                        <div style={{ background:'#0d0d12', border:'1px solid #ffca2822', borderLeft:'3px solid #ffca28', padding:'10px 14px', marginBottom:12 }}>
                          <div style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:10, color:'#ffca28', letterSpacing:2, marginBottom:6 }}>🎧 HOW TO HEAR IT</div>
                          <p style={{ fontFamily:"'Rajdhani',sans-serif", fontSize:15, color:'#aaa', margin:0, lineHeight:1.6 }}>{term.listen}</p>
                        </div>
                      )}
                      <div style={{ background:"#00ffcc05", border:"1px solid #00ffcc15", padding:"10px 14px", borderLeft:"2px solid #00ffcc44" }}>
                        <span style={{ color:"#00ffcc88", fontFamily:"'Share Tech Mono',monospace", fontSize:10, letterSpacing:2 }}>REAL WORLD // </span>
                        <span style={{ color:"#666", fontFamily:"'Rajdhani',sans-serif", fontSize:14 }}>{term.example}</span>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div key={term.id} className={`term-card ${expandedId===term.id?"open":""}`} onClick={() => setExpandedId(expandedId===term.id?null:term.id)}
                  style={{ borderLeftColor: playingGenre===term.term ? (TERM_AUDIO[term.term]?.color||'#00ffcc') : 'transparent' }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:16 }}>
                      <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:22, letterSpacing:2, color:"#fff" }}>{term.term}</span>
                      <span style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:12, color:"#666", letterSpacing:1 }}>— {term.short}</span>
                    </div>
                    <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                      {/* Play button for terms that have audio demos */}
                      {(TERM_AUDIO[term.term] || RHYTHM_AUDIO[term.term]) && (() => {
                        const audio = TERM_AUDIO[term.term] || RHYTHM_AUDIO[term.term];
                        const isThisTerm = playingGenre === term.term;
                        const isActivelyPlaying = isThisTerm && !isPaused;
                        return (
                          <button
                            onClick={e => { e.stopPropagation(); handleGenreButton(term.term); }}
                            title={audio.label}
                            style={{
                              background: isThisTerm ? audio.color+'22':'transparent',
                              border:`1px solid ${isThisTerm ? audio.color:'#ffffff22'}`,
                              color: isThisTerm ? audio.color:'#666',
                              width:32, height:32, borderRadius:'50%', cursor:'pointer',
                              fontSize:12, display:'flex', alignItems:'center', justifyContent:'center',
                              transition:'all 0.15s', flexShrink:0,
                              boxShadow: isActivelyPlaying ? `0 0 14px ${audio.color}55`:'none',
                            }}
                          >
                            {isActivelyPlaying ? '⏸' : '▶'}
                          </button>
                        );
                      })()}
                      <span style={{ display:'inline-block', padding:'4px 12px', fontSize:10, letterSpacing:2, textTransform:'uppercase', fontFamily:"'Share Tech Mono',monospace", background:(categoryColors[term.category]||"#888")+"22", color:categoryColors[term.category]||"#888", border:`1px solid ${categoryColors[term.category]||"#888"}44` }}>{term.category}</span>
                      <span style={{ color:"#444", fontSize:18, transform:expandedId===term.id?"rotate(180deg)":"none", transition:"transform 0.2s" }}>▾</span>
                    </div>
                  </div>
                  {expandedId===term.id && (
                    <div style={{ marginTop:14, paddingTop:14, borderTop:"1px solid #ffffff0a" }} className="fade-in">

                      {/* Level + audio demo row */}
                      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:16, flexWrap:'wrap', rowGap:8 }}>
                        {term.level && (() => {
                          const lvlColor = term.level==='Beginner' ? '#69f0ae' : term.level==='Intermediate' ? '#ffca28' : '#ff7043';
                          return <span style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:10, letterSpacing:2, color:lvlColor, background:lvlColor+'18', border:`1px solid ${lvlColor}44`, padding:'3px 10px' }}>{term.level.toUpperCase()}</span>;
                        })()}
                        {(TERM_AUDIO[term.term] || RHYTHM_AUDIO[term.term]) && (() => {
                          const audio = TERM_AUDIO[term.term] || RHYTHM_AUDIO[term.term];
                          const isThisTerm = playingGenre === term.term;
                          const isActivelyPlaying = isThisTerm && !isPaused;
                          return (
                            <button onClick={e => { e.stopPropagation(); handleGenreButton(term.term); }}
                              style={{ background:isThisTerm?audio.color+'22':'transparent', border:`1px solid ${isThisTerm?audio.color:'#ffffff22'}`, color:isThisTerm?audio.color:'#888', padding:'3px 12px', borderRadius:2, cursor:'pointer', fontFamily:"'Share Tech Mono',monospace", fontSize:10, letterSpacing:2, display:'flex', alignItems:'center', gap:6 }}>
                              <span>{isActivelyPlaying?'⏸':'▶'}</span>
                              <span>{isActivelyPlaying ? 'PAUSE' : isThisTerm ? 'RESUME' : 'PLAY DEMO'}</span>
                              {isThisTerm && <BeatDots genreKey={term.term} color={audio.color} />}
                            </button>
                          );
                        })()}
                      </div>

                      {/* Plain English */}
                      {term.plain && (
                        <div style={{ background:'#0d1a14', border:'1px solid #69f0ae22', borderLeft:'3px solid #69f0ae', padding:'12px 16px', marginBottom:14 }}>
                          <div style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:10, color:'#69f0ae', letterSpacing:2, marginBottom:6 }}>💡 IN PLAIN ENGLISH</div>
                          <p style={{ fontFamily:"'Rajdhani',sans-serif", fontSize:16, color:'#d4d4d4', margin:0, lineHeight:1.7 }}>{term.plain}</p>
                        </div>
                      )}

                      {/* Step sequencer visual */}
                      {term.visual && term.visual.length > 0 && (
                        <div style={{ background:'#070710', border:'1px solid #ffffff0a', padding:'12px 14px', marginBottom:14 }}>
                          <div style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:10, color:'#555', letterSpacing:2, marginBottom:10 }}>🎛️ THE PATTERN — 16 STEPS = 1 BAR</div>
                          <div className="seq-scroll">
                          {term.visual.map((row, ri) => (
                            <div key={ri} style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6, minWidth:300 }}>
                              <span style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:9, color:'#555', letterSpacing:1, width:52, flexShrink:0, textAlign:'right' }}>{row.label}</span>
                              <div style={{ display:'flex', gap:2 }}>
                                {row.p.map((v, si) => {
                                  const beat = Math.floor(si / 4);
                                  const stepColors = { 0:'transparent', 1:'#ffffff30', 2:'#00ffcc', 3:'#ffffff15' };
                                  const borderColors = { 0:'#ffffff0f', 1:'#ffffff20', 2:'#00ffcc66', 3:'#ffffff12' };
                                  return (
                                    <div key={si} style={{
                                      width:13, height:16, borderRadius:1,
                                      background: v===2 ? '#00ffcc' : v===1 ? '#ffffff35' : v===3 ? '#ffffff10' : 'transparent',
                                      border:`1px solid ${v===2?'#00ffcc88':v===1?'#ffffff30':v===3?'#ffffff15':'#ffffff0f'}`,
                                      marginLeft: si%4===0 && si>0 ? 4 : 0,
                                      boxShadow: v===2 ? '0 0 6px #00ffcc55' : 'none',
                                    }} />
                                  );
                                })}
                              </div>
                            </div>
                          ))}
                          {/* Beat labels */}
                          <div style={{ display:'flex', gap:2, paddingLeft:60, minWidth:300 }}>
                            {[1,2,3,4].map(b => (
                              <div key={b} style={{ width:58, fontFamily:"'Share Tech Mono',monospace", fontSize:8, color:'#333', letterSpacing:1, textAlign:'center', marginLeft: b>1?4:0 }}>BEAT {b}</div>
                            ))}
                          </div>
                          </div>{/* end seq-scroll */}
                        </div>
                      )}

                      {/* What it is */}
                      <div style={{ marginBottom:12 }}>
                        <div style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:10, color:'#555', letterSpacing:2, marginBottom:6 }}>📖 WHAT IT IS</div>
                        <p style={{ color:"#c0c0c0", fontFamily:"'Rajdhani',sans-serif", fontSize:15, lineHeight:1.7, margin:0 }}>{term.description}</p>
                      </div>

                      {/* Why it matters */}
                      {term.why && (
                        <div style={{ background:'#0a0a1a', border:'1px solid #7986cb22', borderLeft:'3px solid #7986cb', padding:'10px 14px', marginBottom:12 }}>
                          <div style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:10, color:'#7986cb', letterSpacing:2, marginBottom:6 }}>⚡ WHY IT MATTERS IN TECHNO</div>
                          <p style={{ fontFamily:"'Rajdhani',sans-serif", fontSize:15, color:'#aaa', margin:0, lineHeight:1.6 }}>{term.why}</p>
                        </div>
                      )}

                      {/* Listen for */}
                      {term.listen && (
                        <div style={{ background:'#0d0d12', border:'1px solid #ffca2822', borderLeft:'3px solid #ffca28', padding:'10px 14px', marginBottom:12 }}>
                          <div style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:10, color:'#ffca28', letterSpacing:2, marginBottom:6 }}>🎧 HOW TO HEAR IT</div>
                          <p style={{ fontFamily:"'Rajdhani',sans-serif", fontSize:15, color:'#aaa', margin:0, lineHeight:1.6 }}>{term.listen}</p>
                        </div>
                      )}

                      {/* Example */}
                      <div style={{ background:"#00ffcc05", border:"1px solid #00ffcc15", padding:"10px 14px", borderLeft:"2px solid #00ffcc44" }}>
                        <span style={{ color:"#00ffcc88", fontFamily:"'Share Tech Mono',monospace", fontSize:10, letterSpacing:2 }}>REAL WORLD // </span>
                        <span style={{ color:"#666", fontFamily:"'Rajdhani',sans-serif", fontSize:14 }}>{term.example}</span>
                      </div>

                    </div>
                  )}
                </div>
              )
            ))}
          </div>
        )}

        {/* ══ BPM ══ */}
        {activeTab==="bpm" && (
          <div className="fade-in">
            <div style={{ marginBottom:40 }}>
              <h2 style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:36, letterSpacing:4, color:"#fff", marginBottom:8 }}>WHAT IS BPM?</h2>
              <p style={{ color:"#888", fontFamily:"'Rajdhani',sans-serif", fontSize:16, lineHeight:1.7, maxWidth:600 }}>
                BPM = Beats Per Minute. Every time the kick drum hits = one beat. Count how many kick hits happen in 60 seconds = the BPM. Higher BPM = faster, more intense. Lower BPM = deeper, more hypnotic.
              </p>
            </div>
            <div style={{ background:"#0a0a12", border:"1px solid #ffffff0a", padding:30, marginBottom:32 }}>
              <div style={{ display:"flex", alignItems:"center", gap:30, marginBottom:30 }}>
                <div className={`beat-circle ${beatFlash?"flash":""} ${beating?"active":""}`} onClick={() => setBeating(b=>!b)}>
                  <div style={{ textAlign:"center" }}><div style={{ fontSize:10 }}>{beating?"◼ STOP":"▶ FEEL"}</div><div style={{ fontSize:10, marginTop:2 }}>THE BPM</div></div>
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
                    <span style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:11, color:"#555", letterSpacing:2 }}>SLOW / DEEP</span>
                    <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:42, color:"#00ffcc", letterSpacing:4 }}>{bpm} BPM</span>
                    <span style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:11, color:"#555", letterSpacing:2 }}>FAST / INTENSE</span>
                  </div>
                  <input type="range" className="bpm-slider" min={100} max={200} value={bpm} onChange={e => setBpm(Number(e.target.value))} />
                  <div style={{ display:"flex", justifyContent:"space-between", marginTop:6 }}>
                    {[100,120,130,140,150,160,180,200].map(v => <span key={v} style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:9, color:"#333", letterSpacing:1 }}>{v}</span>)}
                  </div>
                </div>
              </div>
              {(() => { const m=[...bpmRanges].reverse().find(r=>bpm>=r.min); return m?(
                <div style={{ textAlign:"center", padding:"12px 0", borderTop:"1px solid #ffffff08" }}>
                  <span style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:11, color:"#555", letterSpacing:2 }}>AT {bpm} BPM → </span>
                  <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:22, color:m.color, letterSpacing:3, marginLeft:8 }}>{m.genre}</span>
                  <span style={{ fontFamily:"'Rajdhani',sans-serif", fontSize:14, color:"#666", marginLeft:12 }}>{m.desc}</span>
                </div>
              ):null; })()}
            </div>
            <h3 style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:24, letterSpacing:3, color:"#fff", marginBottom:16 }}>BPM RANGES BY GENRE</h3>
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              {bpmRanges.map(r => (
                <div key={r.genre} style={{ display:"grid", gridTemplateColumns:"minmax(120px,180px) 1fr 60px", gap:8, alignItems:"center" }}>
                  <span style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:12, color:r.color, letterSpacing:1 }}>{r.genre}</span>
                  <div style={{ background:"#0a0a12", height:16, border:"1px solid #ffffff08", position:"relative" }}>
                    <div style={{ position:"absolute", left:`${r.min-100}%`, width:`${r.max-r.min}%`, background:r.color, height:"100%", opacity:0.7, borderRadius:1 }} />
                  </div>
                  <span style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:11, color:"#666", textAlign:"right" }}>{r.min}–{r.max}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ══ GENRES + AUDIO ══ */}
        {activeTab==="genres" && (
          <div className="fade-in">
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end', marginBottom:24, flexWrap:'wrap', gap:10 }}>
              <div>
                <h2 style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:36, letterSpacing:4, color:"#fff", marginBottom:4 }}>GENRE MAP + AUDIO</h2>
                <p style={{ color:"#888", fontFamily:"'Rajdhani',sans-serif", fontSize:14, margin:0 }}>Press ▶ on any genre to hear a synthesized audio demo — all sounds generated in your browser</p>
              </div>
              {playingGenre && <button onClick={fullStop} style={{ background:'transparent', border:'1px solid #ff444444', color:'#ff4444', padding:'8px 16px', cursor:'pointer', fontFamily:"'Share Tech Mono',monospace", fontSize:11, letterSpacing:2 }}>⏹ STOP ALL</button>}
            </div>

            <div className="genre-cols" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20, marginBottom:40 }}>
              <div>
                <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:28, color:"#00e5ff", letterSpacing:4, marginBottom:4 }}>TECHNO</div>
                <div style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:10, color:"#00e5ff55", letterSpacing:2, marginBottom:16 }}>Detroit, 1980s → Berlin → Global</div>
                <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                  {['Detroit Techno','Minimal Techno','Melodic Techno','Ambient Techno','Dub Techno','Bleep Techno','Hypnotic Techno','Dark Techno','Hard Groove','Progressive Techno','Hard Techno','Schranz','Industrial Techno','Peak Time Techno','Acid Techno','EBM','Hard Bounce','Freetekno','Gabber'].map(g => (
                    <GenreCard key={g} genreKey={g} title={g} description={terms.find(t=>t.term===g)?.description} />
                  ))}
                </div>
              </div>
              <div>
                <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:28, color:"#ce93d8", letterSpacing:4, marginBottom:4 }}>PSYTRANCE</div>
                <div style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:10, color:"#ce93d855", letterSpacing:2, marginBottom:16 }}>Goa, India, 1980s → Global</div>
                <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                  {['Goa Trance','Neogoa','Progressive Psy','Psybient','Psytrance','Tribal Psy','Full-On Psy','Twilight Psy','Suomi Psy','Zenonesque','Dark Psy','Forest Psy','Hi-Tech / Nitzhonot','Psycore','Psychedelic Techno'].map(g => (
                    <GenreCard key={g} genreKey={g} title={g} description={terms.find(t=>t.term===g)?.description} />
                  ))}
                </div>
              </div>
            </div>

            <h3 style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:22, letterSpacing:3, color:"#fff", marginBottom:16 }}>QUICK BPM REFERENCE</h3>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(min(250px,100%),1fr))", gap:2 }}>
              {bpmRanges.map(r => (
                <div key={r.genre} style={{ padding:"14px 18px", background:"#0a0a10", border:"1px solid #ffffff08", borderLeft:`3px solid ${r.color}` }}>
                  <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:18, color:r.color, letterSpacing:2 }}>{r.genre}</div>
                  <div style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:11, color:"#555", margin:"3px 0" }}>{r.min}–{r.max} BPM</div>
                  <div style={{ fontFamily:"'Rajdhani',sans-serif", fontSize:13, color:"#888" }}>{r.desc}</div>
                </div>
              ))}
            </div>
          </div>
        )}


        {/* ══ FOUNDATIONS ══ */}
        {activeTab==="foundations" && (
          <div style={{ padding:"0 24px" }}>
            <FoundationsModule />
          </div>
        )}

        {/* ══ DJ BOOTH ══ */}
        {activeTab==="dj" && (
          <div style={{ width:'100%', overflowX:'hidden' }}><DJBooth /></div>
        )}

      </div>

      <div style={{ borderTop:"1px solid #ffffff08", padding:"20px 24px", textAlign:"center", marginTop:40 }}>
        <p style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:10, color:"#333", letterSpacing:3 }}>TECHNO LEXICON // {terms.length} TERMS // AUDIO SYNTHESIZED IN BROWSER — NO SAMPLES</p>
      </div>
    </div>
  );
}
