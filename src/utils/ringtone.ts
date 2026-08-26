// Reusable Ringtone Manager using Web Audio API Synthesizer
class RingtoneManager {
  private audioCtx: AudioContext | null = null;
  private isRinging: boolean = false;
  private timer: ReturnType<typeof setInterval> | null = null;
  private isUnlocked: boolean = false;

  constructor() {
    this.initUnlockListener();
  }

  private initUnlockListener() {
    if (typeof window === 'undefined') return;

    const unlock = () => {
      if (!this.audioCtx) {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          this.audioCtx = new AudioContextClass();
        }
      }
      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }
      this.isUnlocked = true;
      window.removeEventListener('click', unlock);
      window.removeEventListener('keydown', unlock);
      window.removeEventListener('touchstart', unlock);
    };

    window.addEventListener('click', unlock);
    window.addEventListener('keydown', unlock);
    window.addEventListener('touchstart', unlock);
  }

  public play() {
    if (this.isRinging) return;
    this.isRinging = true;

    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
    }

    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(console.warn);
    }

    // Play a dual-tone chime pulse immediately, then loop every 2.2 seconds
    this.playChimePulse();
    this.timer = setInterval(() => {
      if (this.isRinging) {
        this.playChimePulse();
      }
    }, 2200);
  }

  public stop() {
    this.isRinging = false;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private playChimePulse() {
    if (!this.audioCtx || this.audioCtx.state !== 'running') return;

    try {
      const now = this.audioCtx.currentTime;

      // Dual tone 440Hz + 480Hz (US ringback / traditional phone chime)
      const osc1 = this.audioCtx.createOscillator();
      const osc2 = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc1.type = 'sine';
      osc2.type = 'sine';
      osc1.frequency.setValueAtTime(440, now);
      osc2.frequency.setValueAtTime(480, now);

      // Fade in/out envelope
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.15, now + 0.05);
      gain.gain.setValueAtTime(0.15, now + 1.2);
      gain.gain.linearRampToValueAtTime(0, now + 1.3);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 1.3);
      osc2.stop(now + 1.3);
    } catch (err) {
      console.warn('[RingtoneManager playChimePulse error]', err);
    }
  }
}

export const ringtoneManager = new RingtoneManager();
