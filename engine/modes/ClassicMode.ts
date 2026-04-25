import type {
  LayerBlend,
  VirusKeyboardEvent,
  VirusModule,
  VirusModuleContext,
} from '../modules/VirusModule';
import type { Mode, ModeContext, ModeEnterOptions } from './Mode';

const FULL_2D: LayerBlend = { layer2D: 1, layer3D: 0 };
const FULL_3D: LayerBlend = { layer2D: 0, layer3D: 1 };

/**
 * ClassicMode mounts exactly one virus at a time. For native modules with
 * `has3D` capability the 3D layer is shown; otherwise the 2D layer is shown.
 * This preserves the original "one virus, fullscreen" feel of the playlist.
 */
export default class ClassicMode implements Mode {
  readonly name = 'classic';
  private ctx: ModeContext | null = null;
  private active: VirusModule | null = null;
  private activeId: string | null = null;
  private mounting: Promise<void> | null = null;
  private moduleClock = { elapsed: 0, delta: 0 };

  async enter(ctx: ModeContext, opts?: ModeEnterOptions): Promise<void> {
    this.ctx = ctx;
    if (opts?.initialId) {
      await this.advance(opts.initialId);
    }
  }

  exit(): Promise<void> {
    this.unmountActive();
    this.ctx = null;
    return Promise.resolve();
  }

  async advance(id: string): Promise<void> {
    if (!this.ctx) return;
    // Serialize mounts to avoid racing concurrent skips.
    const prev = this.mounting ?? Promise.resolve();
    this.mounting = prev.then(() => this.doAdvance(id));
    await this.mounting;
  }

  async advanceWith(id: string, mod: VirusModule): Promise<void> {
    if (!this.ctx) return;
    const prev = this.mounting ?? Promise.resolve();
    this.mounting = prev.then(() => this.doAdvanceWith(id, mod));
    await this.mounting;
  }

  private async doAdvance(id: string): Promise<void> {
    if (!this.ctx) return;
    if (this.activeId === id && this.active) return;
    this.unmountActive();

    const mod = await this.ctx.createModule(id);
    await this.mountModule(id, mod);
  }

  private async doAdvanceWith(id: string, mod: VirusModule): Promise<void> {
    if (!this.ctx) return;
    this.unmountActive();
    await this.mountModule(id, mod);
  }

  private async mountModule(id: string, mod: VirusModule): Promise<void> {
    if (!this.ctx) return;
    const moduleCtx = this.buildModuleContext(mod);
    await mod.mount(moduleCtx);

    this.active = mod;
    this.activeId = id;

    // Set blend based on capabilities. 2D-only viruses → show 2D; modules
    // that have 3D → show 3D layer (sky, sphere, etc.). Modules with both
    // capabilities default to showing both at full strength.
    const blend: LayerBlend =
      mod.capabilities.has3D && !mod.capabilities.has2D
        ? FULL_3D
        : mod.capabilities.has3D && mod.capabilities.has2D
          ? { layer2D: 1, layer3D: 1 }
          : FULL_2D;
    this.ctx.setBlend(blend);
  }

  private buildModuleContext(mod: VirusModule): VirusModuleContext {
    if (!this.ctx) throw new Error('ClassicMode: not entered');
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

  private unmountActive(): void {
    if (!this.active) return;
    try {
      this.active.unmount();
    } catch (err) {
      console.error('ClassicMode.unmount error:', err);
    }
    this.active = null;
    this.activeId = null;
  }

  tick(dt: number, elapsed: number): void {
    if (!this.active || !this.ctx) return;
    this.moduleClock.delta = dt;
    this.moduleClock.elapsed = elapsed;
    const blend = this.activeBlend();
    this.active.update(dt, blend);
  }

  private activeBlend(): LayerBlend {
    const mod = this.active;
    if (!mod) return FULL_2D;
    if (mod.capabilities.has3D && !mod.capabilities.has2D) return FULL_3D;
    if (mod.capabilities.has3D && mod.capabilities.has2D)
      return { layer2D: 1, layer3D: 1 };
    return FULL_2D;
  }

  onKeyboard(event: VirusKeyboardEvent): void {
    this.active?.onKeyboard?.(event);
  }

  currentId(): string | null {
    return this.activeId;
  }

  activeModule(): VirusModule | null {
    return this.active;
  }

  /** Push the current viewport size to the active module. */
  resize(width: number, height: number): void {
    this.active?.resize?.(width, height);
  }
}
