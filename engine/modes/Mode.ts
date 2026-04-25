import type {
  LayerBlend,
  VirusKeyboardEvent,
  VirusModule,
} from '../modules/VirusModule';

export interface ModeEnterOptions {
  initialId?: string;
  /** Provided when a transition is in progress so the mode can sync visuals. */
  transition?: {
    effect: string;
    durationMs: number;
  };
}

export interface ModeContext {
  /** Resolves a virus id to a mounted VirusModule (handles native + iframe). */
  createModule(id: string): Promise<VirusModule>;
  /** Gives the active 2D layer's draw context (for clearing per-frame, etc). */
  getLayer2DContext(): {
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
    domRoot: HTMLElement;
    width: number;
    height: number;
  };
  /** Gives the shared 3D layer state. */
  getLayer3DContext(): {
    scene: import('three').Scene;
    camera: import('three').Camera;
    renderer: import('three').WebGLRenderer;
    width: number;
    height: number;
  };
  /** Sets the compositor layer blend (0..1 each). */
  setBlend(blend: LayerBlend): void;
  /** Sets compositor transition progress (0..1). */
  setTransitionProgress(progress: number): void;
  /** Sets compositor effect by name. */
  setTransitionEffect(name: string): void;
}

export interface Mode {
  readonly name: string;
  enter(ctx: ModeContext, opts?: ModeEnterOptions): Promise<void>;
  exit(): Promise<void>;
  /** Called once per frame after layer renders, before composite. */
  tick(dt: number, elapsed: number): void;
  /** Drive playlist advancement (skip-next, interval tick, etc). */
  advance(id: string): Promise<void>;
  /**
   * Mount a pre-constructed module under `id`. Used for mixed viruses, where
   * the controller hands the mode an `IframeVirusModule` pointing at the lab
   * page rather than resolving the id through the registry.
   */
  advanceWith?(id: string, module: VirusModule): Promise<void>;
  /** Forwarded keyboard events while this mode is active. */
  onKeyboard?(event: VirusKeyboardEvent): void;
  /** Currently-active virus id, used by `current()` lookups. */
  currentId(): string | null;
  /** Active module(s) — the router asks for the keyboard target. */
  activeModule(): VirusModule | null;
}
