import type {
  LayerBlend,
  VirusModule,
  VirusModuleCapabilities,
  VirusModuleContext,
  VirusModuleFactory,
} from '../../engine/modules/VirusModule';
import {
  randomBool,
  randomIntBetween,
  randomRgbColor,
} from '../../utils/random';

/**
 * Native port of random-shapes. Draws into the shared 2D canvas every frame.
 *
 * The legacy version pushed 200 shapes per rAF callback; we keep the same
 * cadence by drawing N shapes per `update()`. Because Layer2D clears the
 * shared canvas at frame start, we need to redraw a stable pattern — instead
 * of accumulating, we maintain an internal "scratch" canvas that we copy onto
 * the shared one each frame.
 */
class RandomShapesModule implements VirusModule {
  readonly id: string;
  readonly capabilities: VirusModuleCapabilities = {
    has2D: true,
    has3D: false,
  };

  private scratch: HTMLCanvasElement;
  private scratchCtx: CanvasRenderingContext2D;
  private blockSize = randomIntBetween(10, 30);
  private useTriangles = randomBool();
  private bgColors = ['black', 'aqua', 'red'];
  private bgColor: string;
  private screenWidth = 0;
  private screenHeight = 0;
  private hostCtx: CanvasRenderingContext2D | null = null;

  constructor(id: string) {
    this.id = id;
    this.scratch = document.createElement('canvas');
    const ctx = this.scratch.getContext('2d');
    if (!ctx) throw new Error('random-shapes: failed to get 2d context');
    this.scratchCtx = ctx;
    this.bgColor = this.bgColors[randomIntBetween(0, this.bgColors.length)];
  }

  mount(ctx: VirusModuleContext): void {
    if (!ctx.layer2D) throw new Error('random-shapes requires layer2D');
    this.hostCtx = ctx.layer2D.ctx;
    this.resize(ctx.layer2D.width, ctx.layer2D.height);
  }

  resize(width: number, height: number): void {
    this.screenWidth = width;
    this.screenHeight = height;
    this.scratch.width = Math.max(1, Math.floor(width));
    this.scratch.height = Math.max(1, Math.floor(height));
    // Restart with the chosen background colour.
    this.scratchCtx.fillStyle = this.bgColor;
    this.scratchCtx.fillRect(0, 0, this.scratch.width, this.scratch.height);
  }

  update(_dt: number, _blend: LayerBlend): void {
    if (!this.hostCtx) return;
    for (let i = 0; i < 200; i++) {
      this.addShape();
    }
    // Composite the scratch canvas onto the shared layer.
    this.hostCtx.drawImage(this.scratch, 0, 0);
  }

  private addShape(): void {
    const x = this.randomAxis(this.screenWidth);
    const y = this.randomAxis(this.screenHeight);
    if (this.useTriangles) this.drawTriangle(x, y);
    else this.drawSquare(x, y);
  }

  private drawSquare(x: number, y: number): void {
    this.scratchCtx.fillStyle = `rgb(${randomRgbColor()})`;
    this.scratchCtx.fillRect(x, y, this.blockSize, this.blockSize);
  }

  private drawTriangle(x: number, y: number): void {
    this.scratchCtx.fillStyle = `rgb(${randomRgbColor()})`;
    const path = new Path2D();
    path.moveTo(x + this.blockSize, y);
    path.lineTo(x, y - this.blockSize);
    path.lineTo(x - this.blockSize, y);
    this.scratchCtx.fill(path);
  }

  private randomAxis(extent: number): number {
    if (extent <= 0 || this.blockSize <= 0) return 0;
    return (
      Math.round((Math.random() * extent) / this.blockSize) * this.blockSize
    );
  }

  unmount(): void {
    this.hostCtx = null;
  }
}

const factory: VirusModuleFactory = id => new RandomShapesModule(id);
export default factory;
