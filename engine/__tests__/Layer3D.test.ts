import { describe, it, expect, vi } from 'vitest';
vi.mock('three', async () => {
  const { engineThreeMockModule } = await import(
    '../../test-utils/engine-three-mocks'
  );
  return engineThreeMockModule();
});
import Layer3D from '../layers/Layer3D';

describe('Layer3D', () => {
  it('builds a scene, camera, renderer, and render target', () => {
    const layer = new Layer3D();
    expect(layer.scene).toBeDefined();
    expect(layer.camera).toBeDefined();
    expect(layer.renderer).toBeDefined();
    expect(layer.renderTarget).toBeDefined();
  });

  it('resize() updates internal dimensions', () => {
    const layer = new Layer3D();
    layer.resize(1024, 768);
    expect(layer.width).toBe(1024);
    expect(layer.height).toBe(768);
  });

  it('context() exposes scene, camera, renderer, and dimensions', () => {
    const layer = new Layer3D();
    layer.resize(320, 240);
    const ctx = layer.context();
    expect(ctx.scene).toBe(layer.scene);
    expect(ctx.camera).toBe(layer.camera);
    expect(ctx.renderer).toBe(layer.renderer);
    expect(ctx.width).toBe(320);
    expect(ctx.height).toBe(240);
  });

  it('render() drives renderer.render and toggles render target', () => {
    const layer = new Layer3D();
    layer.render();
    // Mocked WebGLRenderer methods on layer.renderer
    const r = layer.renderer as unknown as {
      render: { mock: { calls: unknown[] } };
      setRenderTarget: { mock: { calls: unknown[] } };
    };
    expect(r.render.mock.calls.length).toBeGreaterThan(0);
    expect(r.setRenderTarget.mock.calls.length).toBeGreaterThanOrEqual(2);
  });
});
