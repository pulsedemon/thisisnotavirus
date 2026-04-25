import { describe, it, expect, beforeEach, vi } from 'vitest';
import { installCanvas2DMock } from '../../test-utils/canvas-2d-mock';
installCanvas2DMock();
vi.mock('three', async () => {
  const { engineThreeMockModule } = await import(
    '../../test-utils/engine-three-mocks'
  );
  return engineThreeMockModule();
});
import * as THREE from 'three';
import ClassicMode from '../modes/ClassicMode';
import type { ModeContext } from '../modes/Mode';
import type {
  LayerBlend,
  VirusModule,
  VirusModuleCapabilities,
} from '../modules/VirusModule';

class FakeModule implements VirusModule {
  readonly id: string;
  readonly capabilities: VirusModuleCapabilities;
  mount = vi.fn();
  update = vi.fn();
  unmount = vi.fn();
  resize = vi.fn();
  onKeyboard = vi.fn();
  constructor(id: string, capabilities: VirusModuleCapabilities) {
    this.id = id;
    this.capabilities = capabilities;
  }
}

function makeContext(modules: Record<string, VirusModule>): ModeContext {
  const setBlend = vi.fn<(blend: LayerBlend) => void>();
  return {
    createModule: vi.fn((id: string) => {
      const mod = modules[id];
      if (!mod) return Promise.reject(new Error(`unknown id ${id}`));
      return Promise.resolve(mod);
    }),
    getLayer2DContext: () => ({
      canvas: document.createElement('canvas'),
      ctx: document.createElement('canvas').getContext('2d')!,
      domRoot: document.createElement('div'),
      width: 100,
      height: 100,
    }),
    getLayer3DContext: () => ({
      scene: new THREE.Scene(),
      camera: new THREE.PerspectiveCamera(),
      renderer: new THREE.WebGLRenderer(),
      width: 100,
      height: 100,
    }),
    setBlend,
    setTransitionProgress: vi.fn(),
    setTransitionEffect: vi.fn(),
  };
}

describe('ClassicMode', () => {
  let mode: ClassicMode;

  beforeEach(() => {
    mode = new ClassicMode();
  });

  it('reports its name', () => {
    expect(mode.name).toBe('classic');
  });

  it('enter() with initialId mounts that module', async () => {
    const mod = new FakeModule('a', { has2D: true, has3D: false });
    const ctx = makeContext({ a: mod });
    await mode.enter(ctx, { initialId: 'a' });
    expect(mod.mount).toHaveBeenCalledTimes(1);
    expect(mode.currentId()).toBe('a');
    expect(mode.activeModule()).toBe(mod);
  });

  it('advance() unmounts the previous module and mounts the new one', async () => {
    const a = new FakeModule('a', { has2D: true, has3D: false });
    const b = new FakeModule('b', { has2D: true, has3D: false });
    const ctx = makeContext({ a, b });
    await mode.enter(ctx, { initialId: 'a' });
    await mode.advance('b');
    expect(a.unmount).toHaveBeenCalledTimes(1);
    expect(b.mount).toHaveBeenCalledTimes(1);
    expect(mode.currentId()).toBe('b');
  });

  it('advance() to the same id is a no-op', async () => {
    const a = new FakeModule('a', { has2D: true, has3D: false });
    const ctx = makeContext({ a });
    await mode.enter(ctx, { initialId: 'a' });
    await mode.advance('a');
    expect(a.mount).toHaveBeenCalledTimes(1);
    expect(a.unmount).not.toHaveBeenCalled();
  });

  it('sets full-3D blend when active module is 3D-only', async () => {
    const m = new FakeModule('m', { has2D: false, has3D: true });
    const ctx = makeContext({ m });
    await mode.enter(ctx, { initialId: 'm' });
    // eslint-disable-next-line @typescript-eslint/unbound-method
    const setBlend = ctx.setBlend;
    expect(setBlend).toHaveBeenLastCalledWith({
      layer2D: 0,
      layer3D: 1,
    });
  });

  it('sets full-2D blend when active module is 2D-only', async () => {
    const m = new FakeModule('m', { has2D: true, has3D: false });
    const ctx = makeContext({ m });
    await mode.enter(ctx, { initialId: 'm' });
    // eslint-disable-next-line @typescript-eslint/unbound-method
    const setBlend = ctx.setBlend;
    expect(setBlend).toHaveBeenLastCalledWith({
      layer2D: 1,
      layer3D: 0,
    });
  });

  it('advanceWith() mounts a pre-built module', async () => {
    const ctx = makeContext({});
    await mode.enter(ctx);
    const injected = new FakeModule('mixed:1', {
      has2D: true,
      has3D: false,
    });
    await mode.advanceWith('mixed:1', injected);
    expect(injected.mount).toHaveBeenCalledTimes(1);
    expect(mode.currentId()).toBe('mixed:1');
    expect(mode.activeModule()).toBe(injected);
  });

  it('tick() drives the active module update with the current blend', async () => {
    const m = new FakeModule('m', { has2D: true, has3D: false });
    const ctx = makeContext({ m });
    await mode.enter(ctx, { initialId: 'm' });
    mode.tick(0.016, 1.0);
    expect(m.update).toHaveBeenCalledWith(0.016, {
      layer2D: 1,
      layer3D: 0,
    });
  });

  it('exit() unmounts the active module', async () => {
    const m = new FakeModule('m', { has2D: true, has3D: false });
    const ctx = makeContext({ m });
    await mode.enter(ctx, { initialId: 'm' });
    await mode.exit();
    expect(m.unmount).toHaveBeenCalled();
    expect(mode.activeModule()).toBeNull();
  });

  it('onKeyboard() routes events to the active module', async () => {
    const m = new FakeModule('m', { has2D: true, has3D: false });
    const ctx = makeContext({ m });
    await mode.enter(ctx, { initialId: 'm' });
    mode.onKeyboard({
      type: 'keydown',
      key: 'a',
      code: 'KeyA',
      shiftKey: false,
      ctrlKey: false,
      altKey: false,
      metaKey: false,
    });
    expect(m.onKeyboard).toHaveBeenCalled();
  });
});
