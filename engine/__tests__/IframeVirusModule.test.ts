import { describe, it, expect, beforeEach, vi } from 'vitest';
import { installCanvas2DMock } from '../../test-utils/canvas-2d-mock';
installCanvas2DMock();
import IframeVirusModule from '../modules/IframeVirusModule';
import type { VirusModuleContext } from '../modules/VirusModule';

function makeCtx(): VirusModuleContext {
  const domRoot = document.createElement('div');
  document.body.appendChild(domRoot);
  const canvas = document.createElement('canvas');
  return {
    layer2D: {
      canvas,
      ctx: canvas.getContext('2d')!,
      domRoot,
      width: 100,
      height: 100,
    },
    clock: { elapsed: 0, delta: 0 },
  };
}

function clearBody(): void {
  while (document.body.firstChild)
    document.body.removeChild(document.body.firstChild);
}

describe('IframeVirusModule', () => {
  beforeEach(() => {
    clearBody();
  });

  it('mount() appends an iframe with the configured src', () => {
    const ctx = makeCtx();
    const mod = new IframeVirusModule('emoji', { src: '/viruses/emoji/' });
    mod.mount(ctx);
    const iframe = ctx.layer2D!.domRoot.querySelector('iframe');
    expect(iframe).not.toBeNull();
    expect(iframe!.src).toContain('/viruses/emoji/');
  });

  it('mount() throws if no layer2D context is provided', () => {
    const mod = new IframeVirusModule('emoji', { src: '/viruses/emoji/' });
    expect(() => mod.mount({ clock: { elapsed: 0, delta: 0 } })).toThrowError(
      /layer2D/
    );
  });

  it('declares 2D + keyboard capabilities', () => {
    const mod = new IframeVirusModule('x', { src: '/x/' });
    expect(mod.capabilities.has2D).toBe(true);
    expect(mod.capabilities.has3D).toBe(false);
    expect(mod.capabilities.wantsKeyboard).toBe(true);
  });

  it('onKeyboard() forwards via postMessage to iframe.contentWindow', () => {
    const ctx = makeCtx();
    const mod = new IframeVirusModule('emoji', { src: '/viruses/emoji/' });
    mod.mount(ctx);
    const iframe = ctx.layer2D!.domRoot.querySelector(
      'iframe'
    ) as HTMLIFrameElement;
    const postMessage = vi.fn();
    Object.defineProperty(iframe, 'contentWindow', {
      value: { postMessage },
      configurable: true,
    });

    mod.onKeyboard({
      type: 'keydown',
      key: 'a',
      code: 'KeyA',
      shiftKey: false,
      ctrlKey: false,
      altKey: false,
      metaKey: false,
    });

    expect(postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'keyboardEvent',
        eventType: 'keydown',
        key: 'a',
        code: 'KeyA',
      }),
      window.location.origin
    );
  });

  it('unmount() removes the iframe from the DOM', () => {
    const ctx = makeCtx();
    const mod = new IframeVirusModule('emoji', { src: '/viruses/emoji/' });
    mod.mount(ctx);
    expect(ctx.layer2D!.domRoot.querySelector('iframe')).not.toBeNull();
    mod.unmount();
    expect(ctx.layer2D!.domRoot.querySelector('iframe')).toBeNull();
  });

  it('update() and resize() are no-ops (iframes self-drive)', () => {
    const mod = new IframeVirusModule('emoji', { src: '/viruses/emoji/' });
    expect(() => mod.update(0.016, { layer2D: 1, layer3D: 0 })).not.toThrow();
    expect(() => mod.resize?.(100, 100)).not.toThrow();
  });
});
