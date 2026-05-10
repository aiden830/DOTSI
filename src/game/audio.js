export class AudioManager {
  constructor() {
    this.context = null;
    this.masterGain = null;
    this.enabled = true;
    this.music = new Audio("./assets/music/dotsi-world-theme.mp3");
    this.music.loop = true;
    this.music.volume = 0.34;
    this.music.preload = "auto";
    this.musicStarted = false;
  }

  ensureReady() {
    if (!this.enabled) {
      return;
    }
    if (!this.context) {
      this.context = new AudioContext();
      this.masterGain = this.context.createGain();
      this.masterGain.gain.value = 0.12;
      this.masterGain.connect(this.context.destination);
    }
    if (this.context.state === "suspended") {
      this.context.resume().catch(() => {});
    }
    this.playMusic();
  }

  toggle() {
    this.enabled = !this.enabled;
    if (!this.enabled && this.masterGain) {
      this.masterGain.gain.value = 0;
    } else if (this.enabled && this.masterGain) {
      this.masterGain.gain.value = 0.12;
    }
    if (!this.enabled) {
      this.music.pause();
    } else {
      this.playMusic();
    }
  }

  playMusic() {
    if (!this.enabled) {
      return;
    }
    this.musicStarted = true;
    this.music.play().catch(() => {});
  }

  beep({ frequency = 440, duration = 0.12, type = "sine", gain = 0.16, slide = 0 } = {}) {
    if (!this.enabled) {
      return;
    }
    this.ensureReady();
    if (!this.context || !this.masterGain) {
      return;
    }

    const time = this.context.currentTime;
    const osc = this.context.createOscillator();
    const amp = this.context.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, time);
    if (slide) {
      osc.frequency.linearRampToValueAtTime(frequency + slide, time + duration);
    }
    amp.gain.setValueAtTime(0.0001, time);
    amp.gain.exponentialRampToValueAtTime(gain, time + 0.01);
    amp.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    osc.connect(amp);
    amp.connect(this.masterGain);
    osc.start(time);
    osc.stop(time + duration + 0.02);
  }

  jump() {
    this.beep({ frequency: 480, duration: 0.11, type: "triangle", slide: 120, gain: 0.09 });
  }

  collect() {
    this.beep({ frequency: 720, duration: 0.14, type: "sine", slide: 180, gain: 0.07 });
  }

  powerup() {
    this.beep({ frequency: 540, duration: 0.18, type: "triangle", slide: 260, gain: 0.09 });
    this.beep({ frequency: 820, duration: 0.12, type: "sine", slide: 120, gain: 0.05 });
  }

  hit() {
    this.beep({ frequency: 240, duration: 0.16, type: "square", slide: -40, gain: 0.05 });
  }

  stomp() {
    this.beep({ frequency: 340, duration: 0.09, type: "triangle", slide: -110, gain: 0.08 });
  }

  ui() {
    this.beep({ frequency: 610, duration: 0.08, type: "sine", slide: 60, gain: 0.05 });
  }
}
