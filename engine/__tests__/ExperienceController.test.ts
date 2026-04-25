import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { installCanvas2DMock } from '../../test-utils/canvas-2d-mock';
installCanvas2DMock();
vi.mock('three', async () => {
  const { engineThreeMockModule } = await import(
    '../../test-utils/engine-three-mocks'
  );
  return engineThreeMockModule();
});
import ExperienceController from '../ExperienceController';
import Playlist from '../../components/Playlist';

vi.mock('@sentry/browser', () => ({
  captureException: vi.fn(),
  captureMessage: vi.fn(),
}));

vi.mock('../../components/flash/flash', () => ({
  default: class MockFlash {
    start = vi.fn();
    stop = vi.fn();
  },
}));

vi.mock('../../components/TVStaticLoading', () => ({
  default: class MockTVStaticLoading {
    show = vi.fn();
    hide = vi.fn();
  },
}));

vi.mock('../../utils/random', () => ({
  randomInt: (max: number) => Math.floor(Math.random() * max),
  randomIntBetween: vi.fn(() => 5),
  randomFloat: vi.fn(() => 0.5),
  randomBool: vi.fn(() => false),
  randomItem: <T>(arr: T[]): T => arr[0],
  randomRgbColor: () => '128,128,128',
}));

vi.mock('../../utils/gtag', () => ({
  safeGtag: vi.fn(),
}));

vi.mock('../../ui/floating-buttons', () => ({
  createLabButton: vi.fn(),
  createThumbnailButton: vi.fn(),
}));

vi.mock('../../utils/misc', () => ({
  shuffle: vi.fn((arr: string[]) => arr),
  formatVirusName: vi.fn((n: string) => n),
  isMobile: vi.fn(() => false),
}));

vi.mock('../../utils/savedMixes', () => ({
  loadSavedMixes: vi.fn(() => []),
  saveMixes: vi.fn(() => true),
}));

// Stub pilot module imports — we don't want real virus modules touching the
// shared scene during controller-level tests.
vi.mock('../../viruses/sphere/module', () => ({
  default: () => ({
    id: 'sphere',
    capabilities: { has2D: false, has3D: true },
    mount: vi.fn(),
    update: vi.fn(),
    unmount: vi.fn(),
    resize: vi.fn(),
  }),
}));

vi.mock('../../viruses/random-shapes/module', () => ({
  default: () => ({
    id: 'random-shapes',
    capabilities: { has2D: true, has3D: false },
    mount: vi.fn(),
    update: vi.fn(),
    unmount: vi.fn(),
    resize: vi.fn(),
  }),
}));

vi.mock('../../viruses/sky/module', () => ({
  default: () => ({
    id: 'sky',
    capabilities: { has2D: false, has3D: true },
    mount: vi.fn(),
    update: vi.fn(),
    unmount: vi.fn(),
    resize: vi.fn(),
  }),
}));

function setupDom(): void {
  while (document.body.firstChild)
    document.body.removeChild(document.body.firstChild);
  const loadingAnim = document.createElement('div');
  loadingAnim.id = 'loading-anim';
  document.body.appendChild(loadingAnim);
  const loadingRing = document.createElement('div');
  loadingRing.id = 'loading-ring';
  document.body.appendChild(loadingRing);
  const sourceCode = document.createElement('div');
  sourceCode.id = 'source-code';
  const a = document.createElement('a');
  sourceCode.appendChild(a);
  document.body.appendChild(sourceCode);
}

async function flushPromises(): Promise<void> {
  await new Promise<void>(resolve => setTimeout(resolve, 0));
  await new Promise<void>(resolve => setTimeout(resolve, 0));
}

describe('ExperienceController', () => {
  let playlist: Playlist;
  let controller: ExperienceController;

  beforeEach(() => {
    setupDom();
    vi.spyOn(console, 'log').mockImplementation(vi.fn());
    vi.spyOn(console, 'warn').mockImplementation(vi.fn());
    vi.spyOn(console, 'error').mockImplementation(vi.fn());
    playlist = new Playlist();
  });

  afterEach(() => {
    controller?.destroy();
    vi.restoreAllMocks();
    delete window.experience;
    window.history.replaceState({}, '', '/');
  });

  it('boots and mounts a virus from the playlist', async () => {
    controller = new ExperienceController(playlist, {
      skipLoop: true,
      skipFloatingButtons: true,
    });
    await flushPromises();
    expect(controller.currentMode).toBe('classic');
  });

  it('exposes window.experience by default', async () => {
    controller = new ExperienceController(playlist, {
      skipLoop: true,
      skipFloatingButtons: true,
    });
    await flushPromises();
    expect(window.experience).toBe(controller);
  });

  it('skipGlobal=true does not pollute window.experience', async () => {
    controller = new ExperienceController(playlist, {
      skipLoop: true,
      skipFloatingButtons: true,
      skipGlobal: true,
    });
    await flushPromises();
    expect(window.experience).toBeUndefined();
  });

  it('lists modes and transitions for devtools introspection', async () => {
    controller = new ExperienceController(playlist, {
      skipLoop: true,
      skipFloatingButtons: true,
      skipGlobal: true,
    });
    await flushPromises();
    expect(controller.listModes()).toEqual(
      expect.arrayContaining(['classic', 'dual-world', 'lab'])
    );
    expect(controller.listTransitions()).toEqual(
      expect.arrayContaining(['cross-fade', 'chromatic-tear'])
    );
  });

  it('setMode() switches active mode', async () => {
    controller = new ExperienceController(playlist, {
      skipLoop: true,
      skipFloatingButtons: true,
      skipGlobal: true,
    });
    await flushPromises();
    await controller.setMode('dual-world');
    expect(controller.currentMode).toBe('dual-world');
  });

  it('setMode() rejects unknown mode names', async () => {
    controller = new ExperienceController(playlist, {
      skipLoop: true,
      skipFloatingButtons: true,
      skipGlobal: true,
    });
    await flushPromises();
    await controller.setMode('does-not-exist');
    expect(controller.currentMode).toBe('classic');
  });

  it('skipNext debounces rapid calls', async () => {
    controller = new ExperienceController(playlist, {
      skipLoop: true,
      skipFloatingButtons: true,
      skipGlobal: true,
    });
    await flushPromises();
    const nextSpy = vi.spyOn(playlist, 'next');
    controller.skipNext();
    controller.skipNext();
    expect(nextSpy).toHaveBeenCalledTimes(1);
  });

  it('toggleLab opens and closes the lab mode', async () => {
    controller = new ExperienceController(playlist, {
      skipLoop: true,
      skipFloatingButtons: true,
      skipGlobal: true,
    });
    await flushPromises();
    expect(controller.isLabOpen).toBe(false);
    controller.toggleLab();
    await flushPromises();
    expect(controller.isLabOpen).toBe(true);
    controller.toggleLab();
    await flushPromises();
    expect(controller.isLabOpen).toBe(false);
  });

  it('transitionTo() resolves when the advancer reaches progress=1', async () => {
    controller = new ExperienceController(playlist, {
      skipLoop: true,
      skipFloatingButtons: true,
      skipGlobal: true,
    });
    await flushPromises();
    const promise = controller.transitionTo(
      { layer2D: 0, layer3D: 1 },
      { duration: 1 } // 1ms — guaranteed to land progress=1 next tick
    );
    // Wait one event loop tick for performance.now() to advance past 1ms.
    await new Promise<void>(resolve => setTimeout(resolve, 5));
    const c = controller as unknown as { advanceTransition: () => void };
    c.advanceTransition();
    await expect(promise).resolves.toBeUndefined();
  });

  it('sourceCodeUrl returns the GitHub tree URL', async () => {
    controller = new ExperienceController(playlist, {
      skipLoop: true,
      skipFloatingButtons: true,
      skipGlobal: true,
    });
    await flushPromises();
    expect(controller.sourceCodeUrl('sphere')).toBe(
      'https://github.com/pulsedemon/thisisnotavirus/tree/master/viruses/sphere'
    );
  });

  it('respects ?virus= deep-link', async () => {
    window.history.replaceState({}, '', '/?virus=sphere');
    const setCurrentSpy = vi.spyOn(playlist, 'setCurrentVirus');
    controller = new ExperienceController(playlist, {
      skipLoop: true,
      skipFloatingButtons: true,
      skipGlobal: true,
    });
    await flushPromises();
    expect(setCurrentSpy).toHaveBeenCalledWith('sphere');
  });

  it('virusHasKeyboardControl resets to false on loadVirus', async () => {
    controller = new ExperienceController(playlist, {
      skipLoop: true,
      skipFloatingButtons: true,
      skipGlobal: true,
    });
    await flushPromises();
    controller.virusHasKeyboardControl = true;
    await controller.loadVirus('sphere');
    expect(controller.virusHasKeyboardControl).toBe(false);
  });
});
