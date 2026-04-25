import type { Layer2DContext } from '../modules/VirusModule';

/**
 * Layer2D owns a single shared offscreen canvas (where 2D-canvas viruses
 * draw via `ctx.layer2D.ctx`) plus a DOM overlay root (where DOM- and
 * iframe-based viruses mount their elements).
 *
 * The compositor samples the offscreen canvas as a texture; the DOM overlay
 * is composited by the browser as a separate layer with CSS opacity/visibility
 * driven by the active blend.
 */
export default class Layer2D {
  readonly canvas: HTMLCanvasElement;
  readonly ctx: CanvasRenderingContext2D;
  readonly domRoot: HTMLElement;
  width = 0;
  height = 0;

  constructor(domRoot: HTMLElement) {
    this.canvas = document.createElement('canvas');
    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw new Error('Layer2D: failed to acquire 2D context');
    this.ctx = ctx;
    this.domRoot = domRoot;
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.canvas.width = Math.max(1, Math.floor(width));
    this.canvas.height = Math.max(1, Math.floor(height));
  }

  context(): Layer2DContext {
    return {
      canvas: this.canvas,
      ctx: this.ctx,
      domRoot: this.domRoot,
      width: this.width,
      height: this.height,
    };
  }

  /** Clears the shared canvas. Modules redraw into it during their `update`. */
  beginFrame(): void {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  /** Sets DOM overlay opacity (used by compositor to mirror layer blend). */
  setOverlayOpacity(opacity: number): void {
    this.domRoot.style.opacity = String(Math.max(0, Math.min(1, opacity)));
    this.domRoot.style.pointerEvents = opacity > 0.05 ? 'auto' : 'none';
  }
}
