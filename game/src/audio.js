// Neon Drift — all sound is synthesised with WebAudio; no audio files.
// Short bleeps for pickups and hits, a low engine hum while boosting,
// and a tiny looping arpeggio as background music.
export class SoundBank {
  constructor() {
    this.context = null;
    this.musicTimer = null;
    this.muted = false;
    this.musicStep = 0;
  }

  // Browsers require a user gesture before audio starts; call from the first input.
  ensure() {
    if (!this.context) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      this.context = new AudioContext();
      this.master = this.context.createGain();
      this.master.gain.value = 0.35;
      this.master.connect(this.context.destination);
    }
    if (this.context.state === 'suspended') void this.context.resume();
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.35;
    return this.muted;
  }

  tone({ frequency = 440, endFrequency = null, duration = 0.12, type = 'sine', volume = 0.5, delay = 0 }) {
    if (!this.context || this.muted) return;
    const start = this.context.currentTime + delay;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    if (endFrequency) oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, endFrequency), start + duration);
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(volume, start + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
    oscillator.connect(gain);
    gain.connect(this.master);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.05);
  }

  pickup() {
    this.tone({ frequency: 880, endFrequency: 1320, duration: 0.12, type: 'triangle', volume: 0.45 });
  }

  nearMiss() {
    this.tone({ frequency: 1200, endFrequency: 1800, duration: 0.08, type: 'square', volume: 0.18 });
  }

  shieldUp() {
    this.tone({ frequency: 520, duration: 0.1, type: 'triangle', volume: 0.4 });
    this.tone({ frequency: 780, duration: 0.14, type: 'triangle', volume: 0.4, delay: 0.09 });
  }

  hit() {
    this.tone({ frequency: 220, endFrequency: 55, duration: 0.35, type: 'sawtooth', volume: 0.6 });
    this.tone({ frequency: 90, endFrequency: 40, duration: 0.3, type: 'square', volume: 0.35, delay: 0.02 });
  }

  boost() {
    this.tone({ frequency: 180, endFrequency: 520, duration: 0.22, type: 'sawtooth', volume: 0.22 });
  }

  win() {
    [523, 659, 784, 1047].forEach((frequency, i) => {
      this.tone({ frequency, duration: 0.22, type: 'triangle', volume: 0.45, delay: i * 0.13 });
    });
  }

  lose() {
    [392, 330, 262, 196].forEach((frequency, i) => {
      this.tone({ frequency, duration: 0.28, type: 'triangle', volume: 0.4, delay: i * 0.16 });
    });
  }

  click() {
    this.tone({ frequency: 660, duration: 0.06, type: 'square', volume: 0.25 });
  }

  // A quiet 8-step synth arpeggio; the game loop calls tick() once per beat.
  startMusic() {
    if (!this.context || this.musicTimer) return;
    const notes = [220, 261.63, 329.63, 392, 329.63, 261.63, 293.66, 246.94];
    this.musicTimer = window.setInterval(() => {
      if (this.muted) return;
      const note = notes[this.musicStep % notes.length];
      this.tone({ frequency: note, duration: 0.22, type: 'triangle', volume: 0.12 });
      this.musicStep += 1;
    }, 240);
  }

  stopMusic() {
    if (this.musicTimer) {
      window.clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
  }
}
