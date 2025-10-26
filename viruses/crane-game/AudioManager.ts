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
    const soundTypes = ["clawDescend", "clawBounce", "win", "lose"];

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
            // Clean mechanical whirring sound - normalized to prevent clipping
            const motorFreq = 100 + t * 40; // Rising pitch like a motor speeding up
            const harmonicFreq = motorFreq * 1.5; // Slight detuning for mechanical character
            const envelope = Math.exp(-t * 1.5); // Natural decay

            // Reduced amplitudes: 0.5 + 0.15 = 0.65 max (prevents clipping)
            data[i] =
              Math.sin(t * motorFreq * 2 * Math.PI) * envelope * 0.5 +
              Math.sin(t * harmonicFreq * 2 * Math.PI) * envelope * 0.15;
            break;
          }
          case "clawBounce": {
            // Video game style collision sound - sharp impact with harmonics
            const impactFreq = 150 + t * 100; // Low fundamental for solid impact feel
            const envelope = Math.exp(-t * 8); // Sharp attack, quick decay

            // Normalized harmonics to prevent clipping
            // Total: 0.5 + 0.2 + 0.1 + 0.25 = 1.05, then * 0.65 = 0.68 max
            const fundamental = Math.sin(t * impactFreq * 2 * Math.PI) * 0.5;
            const harmonic1 =
              Math.sin(t * impactFreq * 2.5 * 2 * Math.PI) * 0.2;
            const harmonic2 = Math.sin(t * impactFreq * 4 * 2 * Math.PI) * 0.1;

            // Add click/attack transient for video game feel
            const click =
              t < 0.05
                ? Math.sin(t * impactFreq * 20 * 2 * Math.PI) *
                  Math.exp(-t * 50) *
                  0.25
                : 0;

            // Properly normalized - prevents clipping
            data[i] =
              (fundamental + harmonic1 + harmonic2 + click) * envelope * 0.65;
            break;
          }
          case "win": {
            // Celebratory ascending notes
            const noteFreq = 220 + (Math.floor(t * 4) % 5) * 110;
            data[i] =
              Math.sin(t * noteFreq * 2 * Math.PI) * Math.exp(-t * 0.5) * 0.4;
            break;
          }
          case "lose": {
            // Depressing descending notes with smooth fade-out (no clipping)
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
      clawDescend: 2.0,
      clawBounce: 0.3,
      win: 1.5,
      lose: 1.2,
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
      // Clamp volume to 0.85 max to provide headroom for multiple simultaneous sounds
      gainNode.gain.value = Math.min(volume * 0.85, 0.85);

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
