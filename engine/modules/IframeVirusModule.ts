import type {
  LayerBlend,
  VirusKeyboardEvent,
  VirusModule,
  VirusModuleCapabilities,
  VirusModuleContext,
} from './VirusModule';

interface IframeVirusOptions {
  /** Iframe `src`. For mixed viruses this is `/viruses/lab/?...`. */
  src: string;
  /** Optional className applied to the iframe. */
  className?: string;
}

/**
 * Compatibility shim that wraps an existing per-virus iframe page as a
 * VirusModule. Used for un-ported viruses so the playlist keeps working
 * unchanged while modules are migrated incrementally.
 *
 * Mounts the iframe into the Layer2D DOM overlay root. Keyboard forwarding
 * uses the existing `postMessage` protocol (`requestKeyboardControl` /
 * `keyboardEvent`) — viruses already implement the iframe side via
 * `utils/keyboard-control.ts`.
 */
export default class IframeVirusModule implements VirusModule {
  readonly id: string;
  readonly capabilities: VirusModuleCapabilities = {
    has2D: true,
    has3D: false,
    wantsKeyboard: true,
  };
  private opts: IframeVirusOptions;
  private iframe: HTMLIFrameElement | null = null;
  private parentEl: HTMLElement | null = null;

  constructor(id: string, opts: IframeVirusOptions) {
    this.id = id;
    this.opts = opts;
  }

  mount(ctx: VirusModuleContext): void {
    if (!ctx.layer2D) {
      throw new Error('IframeVirusModule requires layer2D context');
    }
    this.parentEl = ctx.layer2D.domRoot;

    const iframe = document.createElement('iframe');
    iframe.title = `virus: ${this.id}`;
    iframe.className = this.opts.className ?? 'virus-iframe iframe-module';
    iframe.style.width = '100%';
    iframe.style.height = '100%';
    iframe.style.border = '0';
    iframe.src = this.opts.src;
    this.parentEl.appendChild(iframe);
    this.iframe = iframe;
  }

  update(_dt: number, _blend: LayerBlend): void {
    // Iframes drive their own animation loop; nothing to update here.
  }

  resize(_w: number, _h: number): void {
    // CSS handles sizing; no-op.
  }

  onKeyboard(event: VirusKeyboardEvent): void {
    const win = this.iframe?.contentWindow;
    if (!win) return;
    win.postMessage(
      {
        type: 'keyboardEvent',
        eventType: event.type,
        key: event.key,
        code: event.code,
        shiftKey: event.shiftKey,
        ctrlKey: event.ctrlKey,
        altKey: event.altKey,
        metaKey: event.metaKey,
      },
      window.location.origin
    );
  }

  /** Exposes the iframe's contentWindow for legacy postMessage flows. */
  contentWindow(): Window | null {
    return this.iframe?.contentWindow ?? null;
  }

  unmount(): void {
    if (this.iframe?.parentNode) {
      this.iframe.parentNode.removeChild(this.iframe);
    }
    this.iframe = null;
    this.parentEl = null;
  }
}
