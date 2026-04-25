/**
 * Single requestAnimationFrame loop. The controller pushes a tick callback in
 * once at boot; the loop owns the rAF handle and a delta clock.
 */
export default class Loop {
  private running = false;
  private handle = 0;
  private last = 0;
  private tick: (dt: number, elapsed: number) => void;
  private startTime = 0;

  constructor(tick: (dt: number, elapsed: number) => void) {
    this.tick = tick;
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.startTime = performance.now();
    this.last = this.startTime;
    const frame = (now: number) => {
      if (!this.running) return;
      const dt = Math.min(0.1, (now - this.last) / 1000);
      const elapsed = (now - this.startTime) / 1000;
      this.last = now;
      try {
        this.tick(dt, elapsed);
      } catch (err) {
        console.error('Engine loop tick error:', err);
      }
      this.handle = requestAnimationFrame(frame);
    };
    this.handle = requestAnimationFrame(frame);
  }

  stop(): void {
    this.running = false;
    if (this.handle) cancelAnimationFrame(this.handle);
    this.handle = 0;
  }

  isRunning(): boolean {
    return this.running;
  }
}
