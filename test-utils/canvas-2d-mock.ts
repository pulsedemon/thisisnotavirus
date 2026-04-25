import { vi } from 'vitest';

/**
 * jsdom 27 returns `null` from `canvas.getContext('2d')` because it lacks a
 * software canvas implementation. Tests that don't actually need real pixels
 * can stub the prototype method to return a no-op CanvasRenderingContext2D.
 *
 * Call once in a test file (typically inside a top-level `beforeAll` or
 * directly at module scope before importing the system under test).
 */
export function installCanvas2DMock(): void {
  const proto = HTMLCanvasElement.prototype as unknown as {
    getContext: ((type: string, ...rest: unknown[]) => unknown) & {
      _mocked?: boolean;
    };
  };
  if (proto.getContext._mocked) return;
  const stub = createStubContext();
  const original = proto.getContext;
  const mocked = vi.fn(function (
    this: HTMLCanvasElement,
    type: string,
    ...rest: unknown[]
  ) {
    if (type === '2d') return stub;
    return original.call(this, type, ...rest);
  }) as ((type: string, ...rest: unknown[]) => unknown) & { _mocked?: boolean };
  mocked._mocked = true;
  proto.getContext = mocked;
}

function createStubContext(): CanvasRenderingContext2D {
  const noop = () => undefined;
  const ctx = {
    canvas: undefined,
    fillStyle: '#000',
    strokeStyle: '#000',
    globalAlpha: 1,
    globalCompositeOperation: 'source-over',
    imageSmoothingEnabled: true,
    lineWidth: 1,
    font: '10px sans-serif',
    textAlign: 'start',
    textBaseline: 'alphabetic',
    fillRect: noop,
    strokeRect: noop,
    clearRect: noop,
    drawImage: noop,
    getImageData: () => ({
      data: new Uint8ClampedArray(4),
      width: 1,
      height: 1,
    }),
    putImageData: noop,
    createImageData: () => ({
      data: new Uint8ClampedArray(4),
      width: 1,
      height: 1,
    }),
    save: noop,
    restore: noop,
    translate: noop,
    rotate: noop,
    scale: noop,
    beginPath: noop,
    moveTo: noop,
    lineTo: noop,
    closePath: noop,
    fill: noop,
    stroke: noop,
    arc: noop,
    rect: noop,
    fillText: noop,
    strokeText: noop,
    measureText: () => ({
      width: 0,
      actualBoundingBoxAscent: 0,
      actualBoundingBoxDescent: 0,
    }),
    createLinearGradient: () => ({ addColorStop: noop }),
    createRadialGradient: () => ({ addColorStop: noop }),
    setTransform: noop,
    transform: noop,
    resetTransform: noop,
  };
  return ctx as unknown as CanvasRenderingContext2D;
}
