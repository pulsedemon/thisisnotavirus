import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import TVStaticLoading from '../TVStaticLoading';

describe('TVStaticLoading', () => {
  let rafId: number;
  let originalRaf: typeof requestAnimationFrame;
  let originalCaf: typeof cancelAnimationFrame;

  beforeEach(() => {
    rafId = 0;
    originalRaf = globalThis.requestAnimationFrame;
    originalCaf = globalThis.cancelAnimationFrame;

    // Mock requestAnimationFrame to return incrementing IDs but not call the callback
    globalThis.requestAnimationFrame = vi.fn(() => ++rafId);
    globalThis.cancelAnimationFrame = vi.fn();

    // Mock canvas getContext to avoid jsdom "Not implemented" warnings
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      createImageData: vi.fn(() => ({ data: new Uint8ClampedArray(0) })),
      putImageData: vi.fn(),
    } as unknown as ReturnType<HTMLCanvasElement['getContext']>);

    // Mock performance.now for throttle logic
    vi.spyOn(performance, 'now').mockReturnValue(0);
  });

  afterEach(() => {
    // Clean up any canvas elements left in the DOM
    document.querySelectorAll('.tv-static-canvas').forEach(el => el.remove());

    globalThis.requestAnimationFrame = originalRaf;
    globalThis.cancelAnimationFrame = originalCaf;

    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should create a canvas element', () => {
      new TVStaticLoading();
      // Access the private canvas through the show/hide behavior
      // The canvas should exist but not be in the DOM yet
      expect(document.querySelector('.tv-static-canvas')).toBeNull();
    });

    it('should not append canvas to DOM on construction', () => {
      new TVStaticLoading();
      const canvasElements = document.querySelectorAll('.tv-static-canvas');
      expect(canvasElements.length).toBe(0);
    });

    it('should accept custom configuration', () => {
      const tvStatic = new TVStaticLoading({
        bufferW: 640,
        bufferH: 360,
        fadeSpeed: 0.05,
      });
      // No error means it accepted the config
      expect(tvStatic).toBeDefined();
    });

    it('should work with default configuration', () => {
      const tvStatic = new TVStaticLoading();
      expect(tvStatic).toBeDefined();
    });
  });

  describe('show', () => {
    it('should append canvas to document body', () => {
      const tvStatic = new TVStaticLoading();
      tvStatic.show();

      const canvas = document.querySelector('.tv-static-canvas');
      expect(canvas).not.toBeNull();
      expect(canvas).toBeInstanceOf(HTMLCanvasElement);

      tvStatic.hide();
    });

    it('should start animation with requestAnimationFrame', () => {
      const tvStatic = new TVStaticLoading();
      tvStatic.show();

      // The _animate method calls requestAnimationFrame
      expect(globalThis.requestAnimationFrame).toHaveBeenCalled();

      tvStatic.hide();
    });

    it('should apply correct styles to the canvas', () => {
      const tvStatic = new TVStaticLoading();
      tvStatic.show();

      const canvas = document.querySelector(
        '.tv-static-canvas'
      ) as HTMLCanvasElement;
      expect(canvas.style.position).toBe('fixed');
      expect(canvas.style.top).toBe('0px');
      expect(canvas.style.left).toBe('0px');
      expect(canvas.style.zIndex).toBe('9999');

      tvStatic.hide();
    });
  });

  describe('hide', () => {
    it('should remove canvas from document body', () => {
      const tvStatic = new TVStaticLoading();
      tvStatic.show();

      expect(document.querySelector('.tv-static-canvas')).not.toBeNull();

      tvStatic.hide();

      expect(document.querySelector('.tv-static-canvas')).toBeNull();
    });

    it('should cancel the animation frame', () => {
      const tvStatic = new TVStaticLoading();
      tvStatic.show();
      tvStatic.hide();

      expect(globalThis.cancelAnimationFrame).toHaveBeenCalled();
    });
  });

  describe('show/hide idempotency', () => {
    it('should not duplicate canvas when show() is called twice', () => {
      const tvStatic = new TVStaticLoading();
      tvStatic.show();
      tvStatic.show();

      const canvasElements = document.querySelectorAll('.tv-static-canvas');
      expect(canvasElements.length).toBe(1);

      tvStatic.hide();
    });

    it('should be safe to call hide() when not shown', () => {
      const tvStatic = new TVStaticLoading();
      expect(() => tvStatic.hide()).not.toThrow();
    });

    it('should be safe to call hide() twice', () => {
      const tvStatic = new TVStaticLoading();
      tvStatic.show();
      tvStatic.hide();
      expect(() => tvStatic.hide()).not.toThrow();
    });

    it('should allow show after hide', () => {
      const tvStatic = new TVStaticLoading();
      tvStatic.show();
      tvStatic.hide();
      tvStatic.show();

      const canvasElements = document.querySelectorAll('.tv-static-canvas');
      expect(canvasElements.length).toBe(1);

      tvStatic.hide();
    });
  });
});
