export interface AudioSettings {
  musicVolume: number; // 0..1
  sfxVolume: number; // 0..1
  muted: boolean;
}

class ProceduralAudioEngine {
  private ctx: AudioContext | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private loopTimer: number | null = null;
  private mode: 'none' | 'menu' | 'run' = 'none';
  private mood: 'synth' | 'nature' | 'epic' | 'retro' | 'chill' = 'synth';
  private step = 0;

  private settings: AudioSettings = {
    musicVolume: 0.45,
    sfxVolume: 0.75,
    muted: false,
  };

  constructor() {
    try {
      const saved = typeof window !== 'undefined' ? window.localStorage.getItem('zcr_audio') : null;
      if (saved) {
        const parsed = JSON.parse(saved) as Partial<AudioSettings>;
        if (typeof parsed.musicVolume === 'number') this.settings.musicVolume = parsed.musicVolume;
        if (typeof parsed.sfxVolume === 'number') this.settings.sfxVolume = parsed.sfxVolume;
        if (typeof parsed.muted === 'boolean') this.settings.muted = parsed.muted;
      }
    } catch {
      // Ignore storage errors
    }
  }

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
      this.musicGain = this.ctx.createGain();
      this.sfxGain = this.ctx.createGain();
      this.musicGain.connect(this.ctx.destination);
      this.sfxGain.connect(this.ctx.destination);
      this.applyGains();
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private applyGains() {
    if (!this.ctx || !this.musicGain || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const mVol = this.settings.muted ? 0 : this.settings.musicVolume * 0.25;
    const sVol = this.settings.muted ? 0 : this.settings.sfxVolume * 0.55;
    this.musicGain.gain.setTargetAtTime(mVol, now, 0.04);
    this.sfxGain.gain.setTargetAtTime(sVol, now, 0.02);
  }

  getSettings(): AudioSettings {
    return { ...this.settings };
  }

  updateSettings(next: Partial<AudioSettings>) {
    this.settings = { ...this.settings, ...next };
    this.applyGains();
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('zcr_audio', JSON.stringify(this.settings));
      }
    } catch {
      // Ignore storage errors
    }
  }

  unlock() {
    this.ensureContext();
  }

  setMusicMode(mode: 'none' | 'menu' | 'run', mood: 'synth' | 'nature' | 'epic' | 'retro' | 'chill' = 'synth') {
    if (this.mode === mode && this.mood === mood) return;
    this.mode = mode;
    this.mood = mood;
    if (this.loopTimer !== null) {
      window.clearInterval(this.loopTimer);
      this.loopTimer = null;
    }
    if (mode === 'none' || typeof window === 'undefined') return;

    const intervalMs = mode === 'run' ? 180 : 420;
    this.step = 0;
    this.loopTimer = window.setInterval(() => {
      if (this.settings.muted || this.settings.musicVolume <= 0.01) return;
      if (!this.ctx || this.ctx.state !== 'running') return;
      this.triggerMusicStep();
    }, intervalMs);
  }

  private triggerMusicStep() {
    const ctx = this.ctx;
    const target = this.musicGain;
    if (!ctx || !target) return;

    const scales: Record<typeof this.mood, number[]> = {
      synth: [130.81, 155.56, 174.61, 196.0, 233.08, 261.63],
      nature: [146.83, 174.61, 196.0, 220.0, 261.63, 293.66],
      epic: [110.0, 130.81, 146.83, 164.81, 196.0, 220.0],
      retro: [164.81, 196.0, 220.0, 246.94, 293.66, 329.63],
      chill: [130.81, 164.81, 196.0, 220.0, 246.94, 261.63],
    };

    const notes = scales[this.mood];
    const now = ctx.currentTime;
    const idx = this.step % notes.length;

    if (this.mode === 'menu') {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = this.mood === 'retro' ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(notes[idx] * (this.step % 12 < 6 ? 1 : 1.5), now);
      g.gain.setValueAtTime(0.001, now);
      g.gain.linearRampToValueAtTime(0.18, now + 0.05);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.38);
      osc.connect(g);
      g.connect(target);
      osc.start(now);
      osc.stop(now + 0.4);
    } else {
      // Energetic runner pulse
      const bassOsc = ctx.createOscillator();
      const bassG = ctx.createGain();
      bassOsc.type = this.mood === 'retro' ? 'square' : 'sawtooth';
      const bassFreq = notes[(this.step >> 1) % 4] * 0.5;
      bassOsc.frequency.setValueAtTime(bassFreq, now);

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(this.mood === 'synth' ? 680 : 480, now);

      bassG.gain.setValueAtTime(0.001, now);
      bassG.gain.linearRampToValueAtTime(0.24, now + 0.015);
      bassG.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

      bassOsc.connect(filter);
      filter.connect(bassG);
      bassG.connect(target);
      bassOsc.start(now);
      bassOsc.stop(now + 0.17);

      if (this.step % 2 === 0) {
        const leadOsc = ctx.createOscillator();
        const leadG = ctx.createGain();
        leadOsc.type = 'triangle';
        leadOsc.frequency.setValueAtTime(notes[(this.step * 2) % notes.length] * 2, now);
        leadG.gain.setValueAtTime(0.001, now);
        leadG.gain.linearRampToValueAtTime(0.12, now + 0.01);
        leadG.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        leadOsc.connect(leadG);
        leadG.connect(target);
        leadOsc.start(now);
        leadOsc.stop(now + 0.16);
      }
    }

    this.step += 1;
  }

  playUiClick() {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain || this.settings.muted) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(640, now);
    osc.frequency.exponentialRampToValueAtTime(920, now + 0.045);
    g.gain.setValueAtTime(0.18, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.055);
    osc.connect(g);
    g.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.06);
  }

  playLaneSwitch() {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain || this.settings.muted) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'triangle';
    const jitter = 0.94 + Math.random() * 0.12;
    osc.frequency.setValueAtTime(280 * jitter, now);
    osc.frequency.exponentialRampToValueAtTime(420 * jitter, now + 0.07);
    g.gain.setValueAtTime(0.16, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    osc.connect(g);
    g.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.09);
  }

  playJump() {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain || this.settings.muted) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    const jitter = 0.95 + Math.random() * 0.1;
    osc.frequency.setValueAtTime(220 * jitter, now);
    osc.frequency.exponentialRampToValueAtTime(590 * jitter, now + 0.16);
    g.gain.setValueAtTime(0.28, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.19);
    osc.connect(g);
    g.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.2);
  }

  playSlide() {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain || this.settings.muted) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sawtooth';
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(480, now);
    filter.frequency.exponentialRampToValueAtTime(160, now + 0.2);

    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(90, now + 0.2);
    g.gain.setValueAtTime(0.2, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

    osc.connect(filter);
    filter.connect(g);
    g.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.23);
  }

  playCoinTrap() {
    // Distinct metallic coin chime + urgent stop tone because grabbing a coin ENDS the timer!
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain || this.settings.muted) return;
    const now = ctx.currentTime;
    const freqs = [987.77, 1318.51, 622.25];
    freqs.forEach((f, idx) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = idx === 2 ? 'sawtooth' : 'sine';
      const t = now + idx * 0.065;
      osc.frequency.setValueAtTime(f, t);
      g.gain.setValueAtTime(0.28, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.26);
      osc.connect(g);
      g.connect(this.sfxGain!);
      osc.start(t);
      osc.stop(t + 0.27);
    });
  }

  playCollision() {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain || this.settings.muted) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(38, now + 0.34);
    g.gain.setValueAtTime(0.45, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.36);
    osc.connect(g);
    g.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.38);
  }

  playNewRecord() {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain || this.settings.muted) return;
    const now = ctx.currentTime;
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'triangle';
      const t = now + i * 0.08;
      osc.frequency.setValueAtTime(f, t);
      g.gain.setValueAtTime(0.25, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.32);
      osc.connect(g);
      g.connect(this.sfxGain!);
      osc.start(t);
      osc.stop(t + 0.34);
    });
  }
}

export const soundEngine = new ProceduralAudioEngine();
