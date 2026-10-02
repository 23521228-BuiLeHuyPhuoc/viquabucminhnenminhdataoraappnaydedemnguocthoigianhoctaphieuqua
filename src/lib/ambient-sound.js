/**
 * AmbientSound - Procedural Ambient Sound Engine using Web Audio API
 * Generates natural focus sounds 100% offline with zero external audio assets.
 * Preserves low CPU and memory footprint.
 */

let audioCtx = null;
let currentSource = null;
let gainNode = null;
let currentSoundType = 'off'; // 'off' | 'rain' | 'clock' | 'zen'
let volume = 0.35;
let tickTimer = null;

function getAudioContext() {
  if (typeof window === 'undefined') return null;
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return null;
  if (!audioCtx || audioCtx.state === 'closed') {
    audioCtx = new AudioContextClass();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

// Generate natural continuous rain sound via filtered pink/brown noise
function createRainNode(ctx) {
  const bufferSize = ctx.sampleRate * 2;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  let lastOut = 0.0;

  for (let i = 0; i < bufferSize; i++) {
    const white = Math.random() * 2 - 1;
    // Pink noise filtering
    lastOut = (lastOut + 0.02 * white) / 1.02;
    data[i] = lastOut * 3.5;
  }

  const noise = ctx.createBufferSource();
  noise.buffer = buffer;
  noise.loop = true;

  // Bandpass filter for gentle rain acoustics
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(1000, ctx.currentTime);

  noise.connect(filter);
  return { source: noise, output: filter };
}

// Generate deep ocean / zen wave rumble
function createZenNode(ctx) {
  const bufferSize = ctx.sampleRate * 3;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  let b0 = 0, b1 = 0, b2 = 0;

  for (let i = 0; i < bufferSize; i++) {
    const white = Math.random() * 2 - 1;
    b0 = 0.99 * b0 + white * 0.05;
    b1 = 0.96 * b1 + white * 0.11;
    b2 = 0.86 * b2 + white * 0.25;
    data[i] = (b0 + b1 + b2) * 0.4;
  }

  const noise = ctx.createBufferSource();
  noise.buffer = buffer;
  noise.loop = true;

  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(450, ctx.currentTime);

  noise.connect(filter);
  return { source: noise, output: filter };
}

// Play a subtle wooden clock tick
function playClockTick(ctx, outputNode) {
  if (!ctx || ctx.state !== 'running') return;
  const osc = ctx.createOscillator();
  const tickGain = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(800, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(120, ctx.currentTime + 0.035);

  tickGain.gain.setValueAtTime(0.4, ctx.currentTime);
  tickGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.035);

  osc.connect(tickGain);
  tickGain.connect(outputNode);

  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.04);
}

export const ambientSound = {
  getSound: () => currentSoundType,
  getVolume: () => volume,

  setVolume: newVol => {
    volume = Math.max(0, Math.min(1, newVol));
    if (gainNode && audioCtx) {
      gainNode.gain.setValueAtTime(volume, audioCtx.currentTime);
    }
  },

  play: type => {
    const ctx = getAudioContext();
    if (!ctx) return;

    // Stop current sound
    ambientSound.stop();

    if (type === 'off') {
      currentSoundType = 'off';
      return;
    }

    gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(volume, ctx.currentTime);
    gainNode.connect(ctx.destination);

    currentSoundType = type;

    if (type === 'rain') {
      const { source, output } = createRainNode(ctx);
      output.connect(gainNode);
      source.start();
      currentSource = source;
    } else if (type === 'zen') {
      const { source, output } = createZenNode(ctx);
      output.connect(gainNode);
      source.start();
      currentSource = source;
    } else if (type === 'clock') {
      playClockTick(ctx, gainNode);
      tickTimer = setInterval(() => {
        playClockTick(ctx, gainNode);
      }, 1000);
    }
  },

  stop: () => {
    if (tickTimer) {
      clearInterval(tickTimer);
      tickTimer = null;
    }
    if (currentSource) {
      try {
        currentSource.stop();
        currentSource.disconnect();
      } catch (e) {}
      currentSource = null;
    }
    if (gainNode) {
      try {
        gainNode.disconnect();
      } catch (e) {}
      gainNode = null;
    }
    currentSoundType = 'off';
  },

  toggleNext: () => {
    const sequence = ['off', 'rain', 'zen', 'clock'];
    const currentIndex = sequence.indexOf(currentSoundType);
    const nextIndex = (currentIndex + 1) % sequence.length;
    const nextType = sequence[nextIndex];
    ambientSound.play(nextType);
    return nextType;
  },
};
