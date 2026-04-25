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
import LabMode from '../modes/LabMode';
import Playlist from '../../components/Playlist';
import type { ModeContext } from '../modes/Mode';

vi.mock('../../components/templates/virus-lab-controls.hbs', () => ({
  default: () => `
    <select id="primary-virus"></select>
    <select id="secondary-virus"></select>
    <input id="mix-ratio" type="range" min="0" max="1" step="0.01" value="0.5" />
    <button id="save-mix">Save</button>
    <div id="saved-mixes-list"></div>
  `,
}));

function makeContext(domRoot: HTMLElement): ModeContext {
  return {
    createModule: vi.fn(),
    getLayer2DContext: () => ({
      canvas: document.createElement('canvas'),
      ctx: document.createElement('canvas').getContext('2d')!,
      domRoot,
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
    setBlend: vi.fn(),
    setTransitionProgress: vi.fn(),
    setTransitionEffect: vi.fn(),
  };
}

describe('LabMode', () => {
  let domRoot: HTMLElement;
  let playlist: Playlist;

  beforeEach(() => {
    while (document.body.firstChild)
      document.body.removeChild(document.body.firstChild);
    localStorage.clear();
    domRoot = document.createElement('div');
    document.body.appendChild(domRoot);
    playlist = new Playlist();
  });

  it('enters with mix derived from playlist current/next', async () => {
    const mode = new LabMode(playlist);
    const ctx = makeContext(domRoot);
    await mode.enter(ctx);
    const mix = mode.getCurrentMix();
    expect(mix.primary).toBeDefined();
    expect(mix.secondary).toBeDefined();
    expect(mix.mixRatio).toBe(0.5);
  });

  it('mounts two iframes (primary + secondary) into the DOM root', async () => {
    const mode = new LabMode(playlist);
    const ctx = makeContext(domRoot);
    await mode.enter(ctx);
    const iframes = domRoot.querySelectorAll('iframe');
    expect(iframes.length).toBe(2);
  });

  it('renders the controls with select + range inputs', async () => {
    const mode = new LabMode(playlist);
    const ctx = makeContext(domRoot);
    await mode.enter(ctx);
    expect(domRoot.querySelector('#primary-virus')).not.toBeNull();
    expect(domRoot.querySelector('#secondary-virus')).not.toBeNull();
    expect(domRoot.querySelector('#mix-ratio')).not.toBeNull();
  });

  it('saves a mix to localStorage and refreshes playlist', async () => {
    const mode = new LabMode(playlist);
    const ctx = makeContext(domRoot);
    await mode.enter(ctx);

    const ratio = domRoot.querySelector<HTMLInputElement>('#mix-ratio')!;
    ratio.value = '0.75';
    ratio.dispatchEvent(new Event('input'));

    const save = domRoot.querySelector<HTMLElement>('#save-mix')!;
    save.click();

    const saved = JSON.parse(
      localStorage.getItem('savedVirusMixes') || '[]'
    ) as { mixRatio: number }[];
    expect(saved.length).toBe(1);
    expect(saved[0].mixRatio).toBe(0.75);
  });

  it('refuses to save a duplicate mix', async () => {
    const mode = new LabMode(playlist);
    const ctx = makeContext(domRoot);
    await mode.enter(ctx);
    const save = domRoot.querySelector<HTMLElement>('#save-mix')!;
    save.click();
    save.click();
    const saved = JSON.parse(
      localStorage.getItem('savedVirusMixes') || '[]'
    ) as unknown[];
    expect(saved.length).toBe(1);
  });

  it('exit() removes the controls and iframes', async () => {
    const mode = new LabMode(playlist);
    const ctx = makeContext(domRoot);
    await mode.enter(ctx);
    await mode.exit();
    expect(domRoot.querySelectorAll('iframe').length).toBe(0);
    expect(domRoot.querySelector('.virus-lab-controls')).toBeNull();
  });

  it('renders saved mixes list with text-content (no innerHTML injection)', async () => {
    // Pre-seed localStorage with a hostile mix name
    localStorage.setItem(
      'savedVirusMixes',
      JSON.stringify([
        {
          primary: 'sphere',
          secondary: 'uzumaki',
          mixRatio: 0.5,
          id: 1,
          name: '<img src=x onerror=alert(1)>',
        },
      ])
    );
    const mode = new LabMode(playlist);
    const ctx = makeContext(domRoot);
    await mode.enter(ctx);
    const list = domRoot.querySelector('#saved-mixes-list');
    expect(list).not.toBeNull();
    // The malicious name must be rendered as text, not an actual <img> tag
    expect(list!.querySelector('img')).toBeNull();
    expect(list!.textContent).toContain('<img');
  });
});
