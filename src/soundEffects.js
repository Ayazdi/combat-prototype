let audioContext;
let masterGain;

const getAudioContext = () => {
  if (typeof window === 'undefined') return null;
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return null;

  if (!audioContext) {
    audioContext = new AudioContextClass();
    masterGain = audioContext.createGain();
    masterGain.gain.value = 0.28;
    masterGain.connect(audioContext.destination);
  }

  if (audioContext.state === 'suspended') {
    audioContext.resume().catch(() => {});
  }

  return audioContext;
};

const tone = (ctx, { frequency, duration = 0.12, type = 'sine', gain = 0.18, detune = 0, delay = 0, slideTo = null }) => {
  const start = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const amp = ctx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(frequency, start);
  if (slideTo !== null) {
    osc.frequency.exponentialRampToValueAtTime(slideTo, start + duration);
  }
  osc.detune.value = detune;

  amp.gain.setValueAtTime(0.0001, start);
  amp.gain.exponentialRampToValueAtTime(gain, start + 0.012);
  amp.gain.exponentialRampToValueAtTime(0.0001, start + duration);

  osc.connect(amp);
  amp.connect(masterGain);
  osc.start(start);
  osc.stop(start + duration + 0.02);
};

const noise = (ctx, { duration = 0.12, gain = 0.12, delay = 0, filter = 900, type = 'bandpass' }) => {
  const start = ctx.currentTime + delay;
  const bufferSize = Math.max(1, Math.floor(ctx.sampleRate * duration));
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);

  for (let i = 0; i < bufferSize; i += 1) {
    data[i] = Math.random() * 2 - 1;
  }

  const source = ctx.createBufferSource();
  const amp = ctx.createGain();
  const biquad = ctx.createBiquadFilter();

  source.buffer = buffer;
  biquad.type = type;
  biquad.frequency.value = filter;
  amp.gain.setValueAtTime(gain, start);
  amp.gain.exponentialRampToValueAtTime(0.0001, start + duration);

  source.connect(biquad);
  biquad.connect(amp);
  amp.connect(masterGain);
  source.start(start);
};

const sounds = {
  playerTurn: (ctx) => {
    tone(ctx, { frequency: 440, duration: 0.13, type: 'triangle', gain: 0.11 });
    tone(ctx, { frequency: 660, duration: 0.16, type: 'triangle', gain: 0.1, delay: 0.08 });
  },
  enemyTurn: (ctx) => {
    tone(ctx, { frequency: 146, duration: 0.28, type: 'sawtooth', gain: 0.1, slideTo: 98 });
    noise(ctx, { duration: 0.18, gain: 0.04, filter: 260, type: 'lowpass' });
  },
  cardPick: (ctx) => {
    noise(ctx, { duration: 0.08, gain: 0.055, filter: 1800 });
    tone(ctx, { frequency: 520, duration: 0.09, type: 'triangle', gain: 0.07, slideTo: 760 });
  },
  cardDeal: (ctx) => {
    noise(ctx, { duration: 0.07, gain: 0.045, filter: 1300 });
    tone(ctx, { frequency: 260, duration: 0.06, type: 'square', gain: 0.035 });
  },
  discard: (ctx) => {
    noise(ctx, { duration: 0.12, gain: 0.09, filter: 520, type: 'lowpass' });
    tone(ctx, { frequency: 120, duration: 0.14, type: 'triangle', gain: 0.09, slideTo: 70 });
  },
  reroll: (ctx) => {
    [330, 392, 494, 660].forEach((frequency, i) => {
      tone(ctx, { frequency, duration: 0.09, type: 'triangle', gain: 0.07, delay: i * 0.045 });
    });
    noise(ctx, { duration: 0.18, gain: 0.035, filter: 2400 });
  },
  submit: (ctx) => {
    tone(ctx, { frequency: 220, duration: 0.08, type: 'square', gain: 0.06 });
    tone(ctx, { frequency: 440, duration: 0.12, type: 'triangle', gain: 0.08, delay: 0.055 });
  },
  attack: (ctx) => {
    noise(ctx, { duration: 0.11, gain: 0.12, filter: 2600 });
    tone(ctx, { frequency: 180, duration: 0.11, type: 'sawtooth', gain: 0.08, slideTo: 110 });
  },
  defence: (ctx) => {
    tone(ctx, { frequency: 392, duration: 0.18, type: 'sine', gain: 0.08 });
    tone(ctx, { frequency: 784, duration: 0.2, type: 'triangle', gain: 0.05, delay: 0.02 });
  },
  combo: (ctx) => {
    [523, 659, 784].forEach((frequency, i) => {
      tone(ctx, { frequency, duration: 0.12, type: 'triangle', gain: 0.07, delay: i * 0.07 });
    });
  },
  enemyAttack: (ctx) => {
    noise(ctx, { duration: 0.14, gain: 0.14, filter: 1800 });
    tone(ctx, { frequency: 92, duration: 0.22, type: 'sawtooth', gain: 0.11, slideTo: 55 });
  },
  enemyDefend: (ctx) => {
    tone(ctx, { frequency: 180, duration: 0.22, type: 'triangle', gain: 0.08 });
    noise(ctx, { duration: 0.16, gain: 0.045, filter: 720, type: 'bandpass' });
  },
  perk: (ctx) => {
    [440, 554, 659, 880].forEach((frequency, i) => {
      tone(ctx, { frequency, duration: 0.11, type: 'sine', gain: 0.06, delay: i * 0.055 });
    });
  },
  victory: (ctx) => {
    [392, 523, 659, 784].forEach((frequency, i) => {
      tone(ctx, { frequency, duration: 0.18, type: 'triangle', gain: 0.075, delay: i * 0.08 });
    });
  },
  defeat: (ctx) => {
    tone(ctx, { frequency: 196, duration: 0.28, type: 'sawtooth', gain: 0.09, slideTo: 82 });
    tone(ctx, { frequency: 98, duration: 0.36, type: 'triangle', gain: 0.075, delay: 0.08, slideTo: 49 });
  },
};

export const playSound = (name) => {
  const ctx = getAudioContext();
  const sound = sounds[name];
  if (!ctx || !sound || !masterGain) return;
  sound(ctx);
};
