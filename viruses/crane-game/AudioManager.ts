/**
 * Audio Manager for procedural sound generation and playback
 * Generates arcade-style sound effects using Web Audio API
 */
export class AudioManager {
  private audioContext: AudioContext;
  private sounds = new Map<string, AudioBuffer>();
  private isEnabled = true;

  constructor() {
    try {
      this.audioContext = new (window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext)();
      this.loadSounds();
    } catch {
      console.warn("Web Audio API not supported");
    }
  }

  loadSounds(): void {
    // Generate procedural sounds since we don't have audio files
    this.generateProceduralSounds();
  }

  private generateProceduralSounds() {
    // Generate basic sound effects using oscillators
    const soundTypes = [
      "clawDescend",
      "clawGrab",
      "prizeDrop",
      "win",
      "lose",
      "ambient",
      "coin",
    ];

    soundTypes.forEach((soundName) => {
      const buffer = this.generateProceduralSound(soundName);
      if (buffer) this.sounds.set(soundName, buffer);
    });
  }

  private generateProceduralSound(soundName: string): AudioBuffer | null {
    try {
      const sampleRate = this.audioContext.sampleRate;
      const duration = this.getSoundDuration(soundName);
      const buffer = this.audioContext.createBuffer(
        1,
        sampleRate * duration,
        sampleRate,
      );
      const data = buffer.getChannelData(0);

      for (let i = 0; i < data.length; i++) {
        const t = i / sampleRate;

        switch (soundName) {
          case "clawDescend": {
            // Mechanical whirring sound
            data[i] =
              Math.sin(t * 150) * Math.exp(-t * 2) * 0.3 +
              Math.sin(t * 75) * Math.exp(-t * 1.5) * 0.2;
            break;
          }
          case "clawGrab":
            // Sharp metallic clank
            data[i] = Math.sin(t * 800) * Math.exp(-t * 8) * 0.4;
            break;
          case "prizeDrop": {
            // Soft thud with some bounce
            const envelope = Math.exp(-t * 3);
            data[i] =
              (Math.sin(t * 100) * envelope + Math.random() * 0.1) * 0.3;
            break;
          }
          case "win": {
            // Celebratory ascending notes
            const noteFreq = 220 + (Math.floor(t * 4) % 5) * 110;
            data[i] =
              Math.sin(t * noteFreq * 2 * Math.PI) * Math.exp(-t * 0.5) * 0.4;
            break;
          }
          case "coin": {
            // Coin dropping sound
            data[i] = Math.sin(t * 600) * Math.exp(-t * 6) * 0.5;
            break;
          }
          case "lose": {
            // Depressing descending notes (opposite of win sound)
            const loseNoteFreq = 220 - (Math.floor(t * 3) % 4) * 80; // Descending minor scale
            data[i] =
              Math.sin(t * loseNoteFreq * 2 * Math.PI) *
              Math.exp(-t * 0.8) *
              0.3;
            break;
          }
          default: {
            data[i] = 0;
            break;
          }
        }
      }

      return buffer;
    } catch {
      return null;
    }
  }

  private getSoundDuration(soundName: string): number {
    const durations = {
      clawDescend: 0.8,
      clawGrab: 0.3,
      prizeDrop: 0.6,
      win: 1.5,
      lose: 1.2,
      ambient: 2.0,
      coin: 0.4,
    };
    return durations[soundName as keyof typeof durations] || 0.5;
  }

  playSound(name: string, volume = 0.5, pitch = 1.0) {
    if (!this.isEnabled || !this.sounds.has(name)) return;

    try {
      const buffer = this.sounds.get(name)!;
      const source = this.audioContext.createBufferSource();
      const gainNode = this.audioContext.createGain();

      source.buffer = buffer;
      source.playbackRate.value = pitch;
      gainNode.gain.value = Math.min(volume, 1.0);

      source.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      source.start();
    } catch {
      console.warn("Failed to play sound:", name);
    }
  }

  setEnabled(enabled: boolean) {
    this.isEnabled = enabled;
  }
}
