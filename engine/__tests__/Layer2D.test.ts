import { describe, it, expect, beforeEach } from 'vitest';
import { installCanvas2DMock } from '../../test-utils/canvas-2d-mock';
installCanvas2DMock();
import Layer2D from '../layers/Layer2D';

describe('Layer2D', () => {
  let domRoot: HTMLElement;

  beforeEach(() => {
    domRoot = document.createElement('div');
    document.body.appendChild(domRoot);
  });

  it('creates an offscreen canvas with a 2D context', () => {
    const layer = new Layer2D(domRoot);
    expect(layer.canvas).toBeInstanceOf(HTMLCanvasElement);
    expect(layer.ctx).toBeDefined();
  });

  it('resize() updates internal dimensions and canvas size', () => {
    const layer = new Layer2D(domRoot);
    layer.resize(800, 600);
    expect(layer.width).toBe(800);
    expect(layer.height).toBe(600);
    expect(layer.canvas.width).toBe(800);
    expect(layer.canvas.height).toBe(600);
  });

  it('resize() clamps to a minimum of 1px so context() never returns 0', () => {
    const layer = new Layer2D(domRoot);
    layer.resize(0, 0);
    expect(layer.canvas.width).toBe(1);
    expect(layer.canvas.height).toBe(1);
  });

  it('context() exposes the canvas, ctx, dom root, and dimensions', () => {
    const layer = new Layer2D(domRoot);
    layer.resize(640, 480);
    const ctx = layer.context();
    expect(ctx.canvas).toBe(layer.canvas);
    expect(ctx.ctx).toBe(layer.ctx);
    expect(ctx.domRoot).toBe(domRoot);
    expect(ctx.width).toBe(640);
    expect(ctx.height).toBe(480);
  });

  it('setOverlayOpacity() drives DOM root opacity and pointer-events', () => {
    const layer = new Layer2D(domRoot);
    layer.setOverlayOpacity(0);
    expect(domRoot.style.opacity).toBe('0');
    expect(domRoot.style.pointerEvents).toBe('none');
    layer.setOverlayOpacity(0.8);
    expect(domRoot.style.opacity).toBe('0.8');
    expect(domRoot.style.pointerEvents).toBe('auto');
    layer.setOverlayOpacity(2);
    expect(domRoot.style.opacity).toBe('1');
  });
});
