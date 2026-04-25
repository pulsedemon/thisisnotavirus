import { describe, it, expect, beforeEach, vi } from 'vitest';
import { installCanvas2DMock } from '../../test-utils/canvas-2d-mock';
installCanvas2DMock();
vi.mock('three', async () => {
  const { engineThreeMockModule } = await import(
    '../../test-utils/engine-three-mocks'
  );
  return engineThreeMockModule();
});
import Compositor from '../layers/Compositor';
import Layer2D from '../layers/Layer2D';
import Layer3D from '../layers/Layer3D';

function makeCompositor() {
  const dom = document.createElement('div');
  document.body.appendChild(dom);
  const layer2D = new Layer2D(dom);
  const layer3D = new Layer3D();
  layer2D.resize(100, 100);
  layer3D.resize(100, 100);
  const canvas = document.createElement('canvas');
  document.body.appendChild(canvas);
  const compositor = new Compositor(canvas, layer2D, layer3D);
  return { compositor, canvas, layer2D, layer3D };
}

function clearBody(): void {
  while (document.body.firstChild)
    document.body.removeChild(document.body.firstChild);
}

describe('Compositor', () => {
  beforeEach(() => {
    clearBody();
  });

  it('lists registered transition effects', () => {
    const { compositor } = makeCompositor();
    const list = compositor.listEffects();
    expect(list).toContain('cross-fade');
    expect(list).toContain('chromatic-tear');
  });

  it('setEffect() returns true for known effect, false for unknown', () => {
    const { compositor } = makeCompositor();
    expect(compositor.setEffect('chromatic-tear')).toBe(true);
    expect(compositor.getEffectName()).toBe('chromatic-tear');
    expect(compositor.setEffect('does-not-exist')).toBe(false);
  });

  it('setBlend() clamps values to [0, 1]', () => {
    const { compositor } = makeCompositor();
    compositor.setBlend(2, -3);
    const { blend2D, blend3D } = compositor.getBlend();
    expect(blend2D).toBe(1);
    expect(blend3D).toBe(0);
  });

  it('setProgress() clamps to [0, 1]', () => {
    const { compositor } = makeCompositor();
    compositor.setProgress(-5);
    compositor.setProgress(0.5);
    expect(() => compositor.render()).not.toThrow();
  });

  it('resize() forwards to renderer', () => {
    const { compositor } = makeCompositor();
    compositor.resize(640, 360);
    expect(compositor.width).toBe(640);
    expect(compositor.height).toBe(360);
  });

  it('dispose() releases internals without throwing', () => {
    const { compositor } = makeCompositor();
    expect(() => compositor.dispose()).not.toThrow();
  });
});
