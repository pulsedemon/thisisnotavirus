import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Playlist from '../Playlist';
import VirusLoader from '../VirusLoader';
import type { StageLoad } from '../stage/Stage';
import type { VirusMix } from '../../types/VirusMix';

const { stageShow, stageClear, stageOnShown, labGetCurrentMix } = vi.hoisted(
  () => ({
    stageShow: vi.fn<(load: StageLoad) => void>(),
    stageClear: vi.fn(),
    stageOnShown: { current: (): void => undefined },
    labGetCurrentMix: vi.fn((): VirusMix | null => null),
  })
);

vi.mock('@sentry/browser', () => ({
  captureException: vi.fn(),
  captureMessage: vi.fn(),
}));

vi.mock('../stage/Stage', () => ({
  default: class MockStage {
    show = stageShow;
    clear = stageClear;
    activeWindow = null;
    constructor(_el: HTMLElement, _anim: HTMLDivElement, onShown: () => void) {
      stageOnShown.current = onShown;
    }
  },
}));

vi.mock('../VirusLab', () => ({
  default: class MockVirusLab {
    getCurrentMix = labGetCurrentMix;
    cleanup = vi.fn();
  },
}));

vi.mock('../../utils/random', () => ({
  randomIntBetween: vi.fn(() => 5),
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
  formatVirusName: vi.fn((name: string) => name),
  isMobile: vi.fn(() => false),
}));

vi.mock('../../utils/savedMixes', () => ({
  loadSavedMixes: vi.fn(() => []),
  saveMixes: vi.fn(() => true),
}));

function createPlaylist(): Playlist {
  return new Playlist();
}

function createVirusLoader(playlist: Playlist): VirusLoader {
  return new VirusLoader(playlist);
}

function priv(vl: VirusLoader): Record<string, unknown> {
  return vl as unknown as Record<string, unknown>;
}

function lastShown(): StageLoad {
  const call = stageShow.mock.lastCall;
  if (!call) throw new Error('stage.show was not called');
  return call[0];
}

function onShown() {
  stageOnShown.current();
}

describe('VirusLoader', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockReturnValue(0.6);

    vi.spyOn(console, 'log').mockImplementation(vi.fn());
    vi.spyOn(console, 'warn').mockImplementation(vi.fn());
    vi.spyOn(console, 'error').mockImplementation(vi.fn());

    const stage = document.createElement('div');
    stage.id = 'stage';
    document.body.appendChild(stage);

    const loadingAnim = document.createElement('div');
    loadingAnim.id = 'loading-anim';
    document.body.appendChild(loadingAnim);

    const loadingRing = document.createElement('div');
    loadingRing.id = 'loading-ring';
    document.body.appendChild(loadingRing);

    const sourceCode = document.createElement('div');
    sourceCode.id = 'source-code';
    const anchor = document.createElement('a');
    sourceCode.appendChild(anchor);
    document.body.appendChild(sourceCode);

    const menu = document.createElement('div');
    menu.id = 'menu';
    menu.innerHTML =
      '<div class="controls"><span id="play-pause">pause</span><span id="info-btn"></span></div>';
    document.body.appendChild(menu);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    document.body.textContent = '';
    window.history.replaceState({}, '', '/');
  });

  describe('constructor', () => {
    it('should throw when #stage is missing', () => {
      document.getElementById('stage')!.remove();
      const playlist = createPlaylist();
      expect(() => createVirusLoader(playlist)).toThrow(
        'Required element #stage not found'
      );
    });

    it('should throw when #loading-anim is missing', () => {
      document.getElementById('loading-anim')!.remove();
      const playlist = createPlaylist();
      expect(() => createVirusLoader(playlist)).toThrow(
        'Required element #loading-anim not found'
      );
    });

    it('should throw when #loading-ring is missing', () => {
      document.getElementById('loading-ring')!.remove();
      const playlist = createPlaylist();
      expect(() => createVirusLoader(playlist)).toThrow(
        'Required element #loading-ring not found'
      );
    });

    it('should initialize successfully with all required elements', () => {
      const playlist = createPlaylist();
      const vl = createVirusLoader(playlist);
      expect(vl).toBeDefined();
      expect(vl.virusHasKeyboardControl).toBe(false);
    });
  });

  describe('constructor deep-link', () => {
    it('should load deep-linked virus when ?virus= matches a known virus', () => {
      window.history.replaceState({}, '', '/?virus=tick-tock');

      const playlist = createPlaylist();
      const setCurrentVirusSpy = vi.spyOn(playlist, 'setCurrentVirus');

      createVirusLoader(playlist);

      expect(setCurrentVirusSpy).toHaveBeenCalledWith('tick-tock');
      expect(stageShow).toHaveBeenCalledOnce();
      expect(lastShown().src).toBe('/viruses/tick-tock/');
      vi.advanceTimersByTime(15000);
      expect(stageShow).toHaveBeenCalledOnce();
      expect(document.getElementById('play-pause')!.innerText).toBe(
        'play_arrow'
      );
    });

    it('should ignore ?virus= if virus is not in playlist', () => {
      window.history.replaceState({}, '', '/?virus=nonexistent-virus');

      const playlist = createPlaylist();
      const setCurrentVirusSpy = vi.spyOn(playlist, 'setCurrentVirus');
      const currentSpy = vi
        .spyOn(playlist, 'current')
        .mockReturnValue('random-shapes');

      createVirusLoader(playlist);

      expect(setCurrentVirusSpy).not.toHaveBeenCalled();
      expect(currentSpy).toHaveBeenCalled();
    });

    it('should call startRandomization when no deep-link is present', () => {
      const playlist = createPlaylist();
      const vl = createVirusLoader(playlist);

      expect(priv(vl).loadRandomInterval).toBeDefined();
    });
  });

  describe('loadVirus', () => {
    it('keeps Share visible and only enables loaded individual viruses', async () => {
      const share = vi.fn().mockResolvedValue(undefined);
      vi.stubGlobal('navigator', { share });
      const playlist = createPlaylist();
      const vl = createVirusLoader(playlist);
      vl.pauseRandomization();
      const button = document.getElementById(
        'share-virus'
      ) as HTMLButtonElement;

      expect(button.hidden).toBe(false);
      expect(button.getAttribute('aria-disabled')).toBe('true');
      vl.loadVirus('doors');
      onShown();
      expect(button.hidden).toBe(false);
      expect(button.getAttribute('aria-disabled')).toBe('false');
      button.click();
      await vi.advanceTimersByTimeAsync(0);
      expect(share).toHaveBeenCalledExactlyOnceWith({
        title: 'doors | THISISNOTAVIRUS',
        url: `${window.location.origin}/?virus=doors`,
      });

      vl.loadVirus('premix:sphere-uzumaki');
      expect(button.hidden).toBe(false);
      expect(button.getAttribute('aria-disabled')).toBe('true');
      onShown();
      expect(button.hidden).toBe(false);
      expect(button.getAttribute('aria-disabled')).toBe('true');
      button.click();
      expect(share).toHaveBeenCalledOnce();

      vl.loadVirus('tick-tock');
      expect(button.hidden).toBe(false);
      expect(button.getAttribute('aria-disabled')).toBe('true');
      onShown();
      expect(button.hidden).toBe(false);
      expect(button.getAttribute('aria-disabled')).toBe('false');
      button.click();
      await vi.advanceTimersByTimeAsync(0);
      expect(share).toHaveBeenLastCalledWith({
        title: 'tick-tock | THISISNOTAVIRUS',
        url: `${window.location.origin}/?virus=tick-tock`,
      });
    });

    it('should show a regular virus as an interactive frame', () => {
      const playlist = createPlaylist();
      const vl = createVirusLoader(playlist);

      vl.loadVirus('test-virus');

      expect(lastShown()).toEqual({
        virus: 'test-virus',
        src: '/viruses/test-virus/',
        interactive: true,
      });
    });

    it('should show a premix through the lab page without pointer input', () => {
      const playlist = createPlaylist();
      const vl = createVirusLoader(playlist);

      vl.loadVirus('premix:sphere-uzumaki');

      expect(lastShown()).toEqual({
        virus: 'premix:sphere-uzumaki',
        src: '/viruses/lab/?primary=sphere&secondary=uzumaki&ratio=0.5',
        interactive: false,
      });
    });

    it('should fall back when mix is not found', async () => {
      const Sentry = await import('@sentry/browser');

      const playlist = createPlaylist();
      const vl = createVirusLoader(playlist);

      vl.loadVirus('premix:nonexistent');

      expect(vi.mocked(Sentry.captureMessage)).toHaveBeenCalledWith(
        'Mix not found for ID: premix:nonexistent',
        'error'
      );
      expect(lastShown().src).toBe(`/viruses/${playlist.viruses[0]}/`);
    });

    it('should encode URL parameters for mixed viruses', () => {
      const playlist = createPlaylist();

      const vl = createVirusLoader(playlist);

      vi.spyOn(playlist, 'isMixedVirus').mockReturnValue(true);
      vi.spyOn(playlist, 'loadSavedMixes');
      vi.spyOn(playlist, 'getMixById').mockReturnValue({
        primary: 'test virus',
        secondary: 'other&virus',
        mixRatio: 0.75,
        id: 1,
      });

      vl.loadVirus('mixed:1');

      const { src } = lastShown();
      expect(src).toContain('primary=' + encodeURIComponent('test virus'));
      expect(src).toContain('secondary=' + encodeURIComponent('other&virus'));
      expect(src).toContain('ratio=0.75');
    });

    it('keeps a saved mix as the current playlist item after loading it', async () => {
      const { loadSavedMixes } = await import('../../utils/savedMixes');
      vi.mocked(loadSavedMixes).mockReturnValue([
        { id: 1, primary: 'sphere', secondary: 'uzumaki', mixRatio: 0.5 },
      ]);
      const playlist = createPlaylist();
      const vl = createVirusLoader(playlist);
      vl.pauseRandomization();

      vl.loadVirus('mixed:1');

      expect(lastShown().src).toContain('/viruses/lab/?primary=sphere');
      expect(playlist.current()).toBe('mixed:1');
    });

    it('makes the fallback virus current when a saved mix is missing', async () => {
      const { shuffle } = await import('../../utils/misc');
      const playlist = createPlaylist();
      const vl = createVirusLoader(playlist);
      vl.pauseRandomization();
      // so the playlist regenerated by the load doesn't already start at the fallback
      vi.mocked(shuffle).mockImplementationOnce(arr => [...arr].reverse());
      const sourceLink =
        document.querySelector<HTMLAnchorElement>('#source-code a')!;

      vl.loadVirus('mixed:9');
      onShown();

      expect(lastShown().src).toBe(`/viruses/${playlist.viruses[0]}/`);
      expect(playlist.current()).toBe(playlist.viruses[0]);
      expect(sourceLink.href).toContain(`/viruses/${playlist.viruses[0]}`);
    });

    it('points Share at the fallback virus', () => {
      const playlist = createPlaylist();
      const vl = createVirusLoader(playlist);
      vl.pauseRandomization();
      const button = document.getElementById(
        'share-virus'
      ) as HTMLButtonElement;

      vl.loadVirus('mixed:9');
      onShown();

      expect(button.value).toBe(playlist.viruses[0]);
      expect(button.getAttribute('aria-disabled')).toBe('false');
    });

    it('should catch errors and fall back when regular virus loading throws', async () => {
      const Sentry = await import('@sentry/browser');

      const playlist = createPlaylist();
      const vl = createVirusLoader(playlist);
      vl.pauseRandomization();
      playlist.setCurrentVirus('doors');
      const sourceLink =
        document.querySelector<HTMLAnchorElement>('#source-code a')!;
      stageShow.mockImplementationOnce(() => {
        throw new Error('Simulated show error');
      });

      vl.loadVirus('test-virus');
      onShown();

      expect(console.error).toHaveBeenCalledWith(
        'Error loading virus:',
        expect.any(Error)
      );
      expect(vi.mocked(Sentry.captureException)).toHaveBeenCalledWith(
        expect.any(Error)
      );
      expect(lastShown().src).toBe(`/viruses/${playlist.viruses[0]}/`);
      expect(playlist.current()).toBe(playlist.viruses[0]);
      expect(sourceLink.href).toContain(`/viruses/${playlist.viruses[0]}`);
    });

    it('should catch errors and fall back when mixed virus loading throws', async () => {
      const Sentry = await import('@sentry/browser');

      const playlist = createPlaylist();
      const vl = createVirusLoader(playlist);

      vi.spyOn(playlist, 'isMixedVirus').mockReturnValue(true);
      vi.spyOn(playlist, 'getPremixByName').mockImplementation(() => {
        throw new Error('Simulated mix error');
      });

      vl.loadVirus('premix:broken');

      expect(console.error).toHaveBeenCalledWith(
        'Error loading virus:',
        expect.any(Error)
      );
      expect(vi.mocked(Sentry.captureException)).toHaveBeenCalledWith(
        expect.any(Error)
      );
      expect(lastShown().src).toBe(`/viruses/${playlist.viruses[0]}/`);
    });

    it('shows the loading ring until the stage reports the virus shown', () => {
      const playlist = createPlaylist();
      const vl = createVirusLoader(playlist);
      const ring = document.getElementById('loading-ring')!;

      vl.loadVirus('doors');
      expect(ring.classList.contains('loading')).toBe(true);
      onShown();
      expect(ring.classList.contains('loading')).toBe(false);
    });
  });

  describe('skipNext / skipPrev', () => {
    it('should skip to next virus', () => {
      const playlist = createPlaylist();
      const nextSpy = vi.spyOn(playlist, 'next').mockReturnValue('next-virus');

      const vl = createVirusLoader(playlist);
      nextSpy.mockClear();

      vl.skipNext();

      expect(nextSpy).toHaveBeenCalledTimes(1);
      expect(lastShown().src).toBe('/viruses/next-virus/');
    });

    it('should skip to previous virus', () => {
      const playlist = createPlaylist();
      const prevSpy = vi.spyOn(playlist, 'prev').mockReturnValue('prev-virus');

      const vl = createVirusLoader(playlist);

      vl.skipPrev();

      expect(prevSpy).toHaveBeenCalledTimes(1);
      expect(lastShown().src).toBe('/viruses/prev-virus/');
    });

    it('should debounce rapid skip calls', () => {
      const playlist = createPlaylist();
      const nextSpy = vi.spyOn(playlist, 'next').mockReturnValue('next-virus');

      const vl = createVirusLoader(playlist);
      nextSpy.mockClear();

      vl.skipNext();
      vl.skipNext();

      expect(nextSpy).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(300);

      vl.skipNext();
      expect(nextSpy).toHaveBeenCalledTimes(2);
    });
  });

  describe('toggleLab', () => {
    it('should open lab and clear the stage', () => {
      const playlist = createPlaylist();
      const vl = createVirusLoader(playlist);

      expect(vl.isLabOpen).toBe(false);

      vl.toggleLab();

      expect(vl.isLabOpen).toBe(true);
      expect(document.getElementById('virus-lab')).not.toBeNull();
      expect(stageClear).toHaveBeenCalledOnce();
    });

    it('should close lab', () => {
      const playlist = createPlaylist();
      const vl = createVirusLoader(playlist);

      vl.toggleLab();
      expect(vl.isLabOpen).toBe(true);

      vl.toggleLab();
      expect(vl.isLabOpen).toBe(false);

      const labContainer = document.getElementById('virus-lab');
      expect(labContainer).toBeNull();
    });

    it('should resume randomization when closing lab', () => {
      const playlist = createPlaylist();
      const vl = createVirusLoader(playlist);

      vl.toggleLab();
      vl.toggleLab();

      expect(priv(vl).loadRandomInterval).toBeDefined();
    });

    it('stops rotation when the lab opens after pause and reload', () => {
      const playlist = createPlaylist();
      const vl = createVirusLoader(playlist);
      document.getElementById('play-pause')!.innerText = 'play_arrow';
      vl.pauseRandomization();
      vl.reloadCurrent();

      vl.toggleLab();
      stageShow.mockClear();
      vi.advanceTimersByTime(12000);

      expect(stageShow).not.toHaveBeenCalled();
    });

    it('ignores skip and reload while the lab is open', () => {
      const playlist = createPlaylist();
      const vl = createVirusLoader(playlist);

      vl.toggleLab();
      stageShow.mockClear();
      vl.skipNext();
      vi.advanceTimersByTime(300);
      vl.skipPrev();
      vi.advanceTimersByTime(300);
      vl.reloadCurrent();
      vi.advanceTimersByTime(12000);

      expect(stageShow).not.toHaveBeenCalled();
    });

    it('makes the fallback current when the lab closes on a deleted mix', () => {
      labGetCurrentMix.mockReturnValueOnce({
        id: 9,
        primary: 'sphere',
        secondary: 'uzumaki',
        mixRatio: 0.5,
      });
      const playlist = createPlaylist();
      const vl = createVirusLoader(playlist);
      vl.toggleLab();
      vl.toggleLab();
      onShown();

      expect(lastShown().src).toBe(`/viruses/${playlist.viruses[0]}/`);
      expect(playlist.current()).toBe(playlist.viruses[0]);
    });
  });

  describe('pauseRandomization / startRandomization', () => {
    it('should clear interval on pause', () => {
      const playlist = createPlaylist();
      const vl = createVirusLoader(playlist);

      expect(priv(vl).loadRandomInterval).toBeDefined();

      vl.pauseRandomization();
      stageShow.mockClear();
      vi.advanceTimersByTime(15000);

      expect(stageShow).not.toHaveBeenCalled();
    });

    it('should set interval on start', () => {
      const playlist = createPlaylist();
      const vl = createVirusLoader(playlist);

      vl.pauseRandomization();
      vl.startRandomization();
      expect(priv(vl).loadRandomInterval).toBeDefined();
    });

    it('should load next virus on interval tick', () => {
      const playlist = createPlaylist();
      const nextSpy = vi
        .spyOn(playlist, 'next')
        .mockReturnValue('interval-virus');

      const vl = createVirusLoader(playlist);
      nextSpy.mockClear();

      vl.startRandomization();

      vi.advanceTimersByTime(4999);
      expect(nextSpy).not.toHaveBeenCalled();

      vi.advanceTimersByTime(1);
      expect(nextSpy).toHaveBeenCalledTimes(1);
      expect(lastShown().src).toBe('/viruses/interval-virus/');
    });
  });

  describe('reloadCurrent', () => {
    it('should reload the current virus', () => {
      const playlist = createPlaylist();
      vi.spyOn(playlist, 'current').mockReturnValue('current-virus');

      const vl = createVirusLoader(playlist);
      stageShow.mockClear();

      vl.reloadCurrent();

      expect(stageShow).toHaveBeenCalledOnce();
      expect(lastShown().src).toBe('/viruses/current-virus/');
    });

    it('should debounce rapid reload calls', () => {
      const playlist = createPlaylist();
      const currentSpy = vi
        .spyOn(playlist, 'current')
        .mockReturnValue('current-virus');

      const vl = createVirusLoader(playlist);
      currentSpy.mockClear();

      vl.reloadCurrent();
      vl.reloadCurrent();

      vi.advanceTimersByTime(300);
      vl.reloadCurrent();

      expect(currentSpy).toHaveBeenCalledTimes(2);
    });
  });

  describe('sourceCodeUrl', () => {
    it('should return the correct GitHub URL', () => {
      const playlist = createPlaylist();
      const vl = createVirusLoader(playlist);

      const url = vl.sourceCodeUrl('random-shapes');
      expect(url).toBe(
        'https://github.com/pulsedemon/thisisnotavirus/tree/master/viruses/random-shapes'
      );
    });
  });

  describe('virusHasKeyboardControl', () => {
    it('should default to false', () => {
      const playlist = createPlaylist();
      const vl = createVirusLoader(playlist);
      expect(vl.virusHasKeyboardControl).toBe(false);
    });

    it('should be reset to false on loadVirus', () => {
      const playlist = createPlaylist();
      const vl = createVirusLoader(playlist);

      vl.virusHasKeyboardControl = true;
      vl.loadVirus('some-virus');

      expect(vl.virusHasKeyboardControl).toBe(false);
    });
  });
});
