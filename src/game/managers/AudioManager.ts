import type Phaser from 'phaser';
import { useSettingsStore } from '@/stores/settingsStore';

type SeName =
  | 'hit' | 'sword' | 'bow' | 'fire' | 'lightning' | 'explode' | 'freeze' | 'enemyDeath'
  | 'levelup' | 'recruit' | 'starUp' | 'drop' | 'boss' | 'bossDown' | 'warning' | 'waveClear'
  | 'victory' | 'defeat' | 'click' | 'breach' | 'chest' | 'evolution';

type BgmName = 'menu' | 'battle' | 'boss' | 'victory' | 'defeat';

/**
 * 全部音频通过 Web Audio 实时合成（PRD 25.1 允许 Web Audio），
 * 因此游戏完全离线可用、包体极小。
 */
class AudioManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private bgmGain: GainNode | null = null;
  private seGain: GainNode | null = null;
  private bgmTimer: number | null = null;
  private bgmStep = 0;
  private currentBgm: BgmName | null = null;
  private scene: Phaser.Scene | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private unlocked = false;

  setScene(scene: Phaser.Scene | null): void {
    this.scene = scene;
  }

  /** 必须由用户手势触发一次 */
  unlock(): void {
    if (this.unlocked) return;
    this.ensure();
    if (this.ctx?.state === 'suspended') void this.ctx.resume();
    this.unlocked = true;
  }

  private ensure(): AudioContext | null {
    if (this.ctx) return this.ctx;
    try {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      this.ctx = new Ctor();
      this.masterGain = this.ctx.createGain();
      this.bgmGain = this.ctx.createGain();
      this.seGain = this.ctx.createGain();
      this.bgmGain.connect(this.masterGain);
      this.seGain.connect(this.masterGain);
      this.masterGain.connect(this.ctx.destination);
      this.applyVolumes();
      // 噪声缓冲（用于打击/爆炸）
      const len = Math.floor(this.ctx.sampleRate * 0.6);
      this.noiseBuffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = this.noiseBuffer.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    } catch {
      this.ctx = null;
    }
    return this.ctx;
  }

  applyVolumes(): void {
    const s = useSettingsStore();
    if (!this.masterGain || !this.bgmGain || !this.seGain) return;
    const master = s.muted ? 0 : s.masterVolume;
    this.masterGain.gain.value = master;
    this.bgmGain.gain.value = s.musicVolume;
    this.seGain.gain.value = s.sfxVolume;
  }

  private tone(
    freq: number, dur: number, type: OscillatorType, vol: number, dest: GainNode | null,
    opts: { freqEnd?: number; delay?: number; attack?: number } = {},
  ): void {
    const ctx = this.ensure();
    if (!ctx || !dest) return;
    const t0 = ctx.currentTime + (opts.delay ?? 0);
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (opts.freqEnd !== undefined) osc.frequency.exponentialRampToValueAtTime(Math.max(20, opts.freqEnd), t0 + dur);
    const attack = opts.attack ?? 0.006;
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(vol, t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g);
    g.connect(dest);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  private noise(dur: number, vol: number, dest: GainNode | null, filterFreq = 1200, type: BiquadFilterType = 'lowpass', delay = 0): void {
    const ctx = this.ensure();
    if (!ctx || !dest || !this.noiseBuffer) return;
    const t0 = ctx.currentTime + delay;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const filter = ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = filterFreq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filter);
    filter.connect(g);
    g.connect(dest);
    src.start(t0);
    src.stop(t0 + dur + 0.02);
  }

  playSe(name: SeName): void {
    const s = useSettingsStore();
    if (s.muted || s.sfxVolume <= 0) return;
    const dest = this.seGain;
    if (!dest) return;
    switch (name) {
      case 'click':
        this.tone(880, 0.06, 'square', 0.14, dest, { freqEnd: 660 });
        break;
      case 'hit':
        this.noise(0.07, 0.18, dest, 2400, 'highpass');
        break;
      case 'sword':
        this.noise(0.1, 0.22, dest, 3200, 'bandpass');
        this.tone(520, 0.08, 'sawtooth', 0.1, dest, { freqEnd: 300 });
        break;
      case 'bow':
        this.tone(1200, 0.07, 'triangle', 0.12, dest, { freqEnd: 700 });
        break;
      case 'fire':
        this.noise(0.18, 0.2, dest, 900, 'lowpass');
        this.tone(180, 0.2, 'sawtooth', 0.09, dest, { freqEnd: 60 });
        break;
      case 'lightning':
        this.noise(0.12, 0.22, dest, 4000, 'highpass');
        this.tone(1800, 0.1, 'square', 0.1, dest, { freqEnd: 400 });
        break;
      case 'explode':
        this.noise(0.4, 0.3, dest, 500, 'lowpass');
        this.tone(90, 0.4, 'sawtooth', 0.16, dest, { freqEnd: 30 });
        break;
      case 'freeze':
        this.tone(1400, 0.22, 'sine', 0.13, dest, { freqEnd: 2600 });
        this.tone(2100, 0.18, 'sine', 0.08, dest, { freqEnd: 3400, delay: 0.05 });
        break;
      case 'enemyDeath':
        this.noise(0.12, 0.14, dest, 1600, 'lowpass');
        this.tone(300, 0.12, 'square', 0.07, dest, { freqEnd: 120 });
        break;
      case 'levelup':
        [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.16, 'square', 0.13, dest, { delay: i * 0.07 }));
        break;
      case 'recruit':
        [392, 523, 659].forEach((f, i) => this.tone(f, 0.18, 'triangle', 0.14, dest, { delay: i * 0.08 }));
        break;
      case 'starUp':
        [659, 784, 988, 1319].forEach((f, i) => this.tone(f, 0.2, 'sine', 0.15, dest, { delay: i * 0.09 }));
        break;
      case 'drop':
        [784, 1047].forEach((f, i) => this.tone(f, 0.14, 'triangle', 0.12, dest, { delay: i * 0.06 }));
        break;
      case 'boss':
        [110, 98, 82, 73].forEach((f, i) => this.tone(f, 0.5, 'sawtooth', 0.2, dest, { delay: i * 0.22, freqEnd: f * 0.7 }));
        this.noise(0.9, 0.16, dest, 300, 'lowpass', 0.1);
        break;
      case 'bossDown':
        [523, 622, 784, 1047, 1319].forEach((f, i) => this.tone(f, 0.28, 'square', 0.15, dest, { delay: i * 0.1 }));
        this.noise(0.6, 0.2, dest, 700, 'lowpass', 0.2);
        break;
      case 'warning':
        [880, 660, 880, 660].forEach((f, i) => this.tone(f, 0.18, 'square', 0.16, dest, { delay: i * 0.2 }));
        break;
      case 'waveClear':
        [523, 659, 784].forEach((f, i) => this.tone(f, 0.2, 'square', 0.12, dest, { delay: i * 0.08 }));
        break;
      case 'victory':
        [523, 659, 784, 1047, 1319].forEach((f, i) => this.tone(f, 0.4, 'square', 0.16, dest, { delay: i * 0.16 }));
        break;
      case 'defeat':
        [392, 349, 311, 233].forEach((f, i) => this.tone(f, 0.5, 'sawtooth', 0.16, dest, { delay: i * 0.24, freqEnd: f * 0.85 }));
        break;
      case 'breach':
        this.tone(150, 0.3, 'sawtooth', 0.2, dest, { freqEnd: 60 });
        this.noise(0.3, 0.18, dest, 500, 'lowpass');
        break;
      case 'chest':
        [659, 880, 1047, 1319].forEach((f, i) => this.tone(f, 0.18, 'triangle', 0.13, dest, { delay: i * 0.07 }));
        break;
      case 'evolution':
        [440, 554, 659, 880, 1109, 1319].forEach((f, i) => this.tone(f, 0.22, 'sine', 0.14, dest, { delay: i * 0.08 }));
        break;
    }
  }

  /* ---------------- BGM ---------------- */

  private bgmPatterns: Record<BgmName, { bass: number[]; lead: number[]; tempo: number; wave: OscillatorType }> = {
    menu: {
      bass: [131, 131, 165, 165, 147, 147, 175, 175],
      lead: [523, 0, 659, 0, 587, 0, 698, 0],
      tempo: 0.42,
      wave: 'triangle',
    },
    battle: {
      bass: [110, 110, 131, 131, 98, 98, 123, 123],
      lead: [440, 554, 659, 554, 494, 587, 698, 587],
      tempo: 0.28,
      wave: 'square',
    },
    boss: {
      bass: [82, 82, 87, 87, 73, 73, 78, 78],
      lead: [330, 392, 330, 294, 349, 415, 349, 311],
      tempo: 0.24,
      wave: 'sawtooth',
    },
    victory: {
      bass: [131, 165, 196, 262],
      lead: [523, 659, 784, 1047, 1319, 1047, 784, 659],
      tempo: 0.3,
      wave: 'square',
    },
    defeat: {
      bass: [98, 87, 82, 73],
      lead: [392, 349, 311, 262, 233, 196, 175, 147],
      tempo: 0.46,
      wave: 'triangle',
    },
  };

  playBgm(name: BgmName): void {
    const s = useSettingsStore();
    if (this.currentBgm === name) return;
    this.stopBgm();
    this.currentBgm = name;
    if (s.muted || s.musicVolume <= 0) return;
    this.ensure();
    this.bgmStep = 0;
    const pattern = this.bgmPatterns[name];
    const tick = () => {
      if (!this.bgmGain) return;
      const p = this.bgmPatterns[name];
      const i = this.bgmStep % p.bass.length;
      this.tone(p.bass[i], p.tempo * 0.9, p.wave, 0.11, this.bgmGain);
      const lead = p.lead[this.bgmStep % p.lead.length];
      if (lead > 0) this.tone(lead, p.tempo * 0.7, 'sine', 0.055, this.bgmGain);
      if (this.bgmStep % 4 === 2) this.noise(0.06, 0.05, this.bgmGain, 5000, 'highpass');
      this.bgmStep++;
    };
    tick();
    this.bgmTimer = window.setInterval(tick, pattern.tempo * 1000);
    if (this.ctx?.state === 'suspended') void this.ctx.resume();
  }

  stopBgm(): void {
    if (this.bgmTimer !== null) {
      window.clearInterval(this.bgmTimer);
      this.bgmTimer = null;
    }
    this.currentBgm = null;
  }

  pauseBgm(): void {
    if (this.bgmTimer !== null) {
      window.clearInterval(this.bgmTimer);
      this.bgmTimer = null;
    }
  }

  resumeBgm(): void {
    if (this.currentBgm && this.bgmTimer === null) this.playBgm(this.currentBgm);
  }
}

export const audio = new AudioManager();
