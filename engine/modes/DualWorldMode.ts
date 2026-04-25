import type {
  LayerBlend,
  VirusKeyboardEvent,
  VirusModule,
  VirusModuleContext,
} from '../modules/VirusModule';
import type { Mode, ModeContext, ModeEnterOptions } from './Mode';

/**
 * DualWorldMode keeps a 2D module and a 3D module mounted simultaneously and
 * blends between them via the compositor. This is the mode where Matrix-style
 * transitions actually live: `transitionTo` shifts the layer weights while
 * `setTransitionProgress` drives the chromatic-tear shader.
 *
 * When `advance(id)` is called, the new virus replaces whichever slot it
 * fits — modules with `has3D` go into the 3D slot; pure-2D modules go into
 * the 2D slot.
 */
export default class DualWorldMode implements Mode {
  readonly name = 'dual-world';
  private ctx: ModeContext | null = null;
  private slot2D: VirusModule | null = null;
  private slot3D: VirusModule | null = null;
  private slot2DId: string | null = null;
  private slot3DId: string | null = null;
  private moduleClock = { elapsed: 0, delta: 0 };
  private currentBlend: LayerBlend = { layer2D: 0.5, layer3D: 0.5 };

  async enter(ctx: ModeContext, opts?: ModeEnterOptions): Promise<void> {
    this.ctx = ctx;
    ctx.setBlend(this.currentBlend);
    if (opts?.initialId) {
      await this.advance(opts.initialId);
    }
  }

  exit(): Promise<void> {
    if (this.slot2D) {
      try {
        this.slot2D.unmount();
      } catch (err) {
        console.error('DualWorldMode.unmount(2D) error:', err);
      }
    }
    if (this.slot3D) {
      try {
        this.slot3D.unmount();
      } catch (err) {
        console.error('DualWorldMode.unmount(3D) error:', err);
      }
    }
    this.slot2D = null;
    this.slot3D = null;
    this.slot2DId = null;
    this.slot3DId = null;
    this.ctx = null;
    return Promise.resolve();
  }

  async advance(id: string): Promise<void> {
    if (!this.ctx) return;
    const mod = await this.ctx.createModule(id);
    await this.mountIntoSlot(id, mod);
  }

  async advanceWith(id: string, mod: VirusModule): Promise<void> {
    if (!this.ctx) return;
    await this.mountIntoSlot(id, mod);
  }

  private async mountIntoSlot(id: string, mod: VirusModule): Promise<void> {
    if (!this.ctx) return;
    const moduleCtx = this.buildModuleContext(mod);
    await mod.mount(moduleCtx);
    if (mod.capabilities.has3D) {
      this.replaceSlot('3D', mod, id);
    } else {
      this.replaceSlot('2D', mod, id);
    }
  }

  private replaceSlot(slot: '2D' | '3D', mod: VirusModule, id: string): void {
    if (slot === '2D') {
      if (this.slot2D) {
        try {
          this.slot2D.unmount();
        } catch (err) {
          console.error('DualWorldMode.unmount(2D) error:', err);
        }
      }
      this.slot2D = mod;
      this.slot2DId = id;
    } else {
      if (this.slot3D) {
        try {
          this.slot3D.unmount();
        } catch (err) {
          console.error('DualWorldMode.unmount(3D) error:', err);
        }
      }
      this.slot3D = mod;
      this.slot3DId = id;
    }
  }

  private buildModuleContext(mod: VirusModule): VirusModuleContext {
    if (!this.ctx) throw new Error('DualWorldMode: not entered');
    return {
      layer2D: mod.capabilities.has2D
        ? this.ctx.getLayer2DContext()
        : undefined,
      layer3D: mod.capabilities.has3D
        ? this.ctx.getLayer3DContext()
        : undefined,
      clock: this.moduleClock,
    };
  }

  setBlend(blend: LayerBlend): void {
    this.currentBlend = blend;
    this.ctx?.setBlend(blend);
  }

  tick(dt: number, elapsed: number): void {
    this.moduleClock.delta = dt;
    this.moduleClock.elapsed = elapsed;
    if (this.slot2D) this.slot2D.update(dt, this.currentBlend);
    if (this.slot3D) this.slot3D.update(dt, this.currentBlend);
  }

  onKeyboard(event: VirusKeyboardEvent): void {
    // 3D slot wins keyboard; falls back to 2D.
    (this.slot3D ?? this.slot2D)?.onKeyboard?.(event);
  }

  currentId(): string | null {
    // Prefer the 3D slot id when present (it is the "world").
    return this.slot3DId ?? this.slot2DId;
  }

  activeModule(): VirusModule | null {
    return this.slot3D ?? this.slot2D;
  }

  resize(width: number, height: number): void {
    this.slot2D?.resize?.(width, height);
    this.slot3D?.resize?.(width, height);
  }
}
