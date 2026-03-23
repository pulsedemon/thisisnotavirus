import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Playlist from '../Playlist';
import VirusLoader from '../VirusLoader';

vi.mock('@sentry/browser', () => ({
  captureException: vi.fn(),
  captureMessage: vi.fn(),
}));

vi.mock('../flash/flash', () => ({
  default: class MockFlash {
    start = vi.fn();
    stop = vi.fn();
  },
}));

vi.mock('../TVStaticLoading', () => ({
  default: class MockTVStaticLoading {
    show = vi.fn();
    hide = vi.fn();
  },
}));

vi.mock('../VirusLab', () => ({
  default: class MockVirusLab {
    getCurrentMix = vi.fn(() => null);
    cleanup = vi.fn();
  },
}));

vi.mock('../../utils/iframe', () => ({
  createStyledIframe: vi.fn(() => {
    const iframe = document.createElement('iframe');
    return iframe;
  }),
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

/**
 * Helper to access private members on VirusLoader via a Record cast.
 */
function priv(vl: VirusLoader): Record<string, unknown> {
  return vl as unknown as Record<string, unknown>;
}

describe('VirusLoader', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockReturnValue(0.6);

    vi.spyOn(console, 'log').mockImplementation(vi.fn());
    vi.spyOn(console, 'warn').mockImplementation(vi.fn());
    vi.spyOn(console, 'error').mockImplementation(vi.fn());

    const iframe = document.createElement('iframe');
    iframe.id = 'container';
    document.body.appendChild(iframe);

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
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    document.body.textContent = '';
    window.history.replaceState({}, '', '/');
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 1. constructor
  // ─────────────────────────────────────────────────────────────────────────
  describe('constructor', () => {
    it('should throw when #container is missing', () => {
      document.getElementById('container')!.remove();
      const playlist = createPlaylist();
      expect(() => createVirusLoader(playlist)).toThrow(
        'Required element #container not found'
      );
    });

    it('should throw when #container is not an iframe', () => {
      const existing = document.getElementById('container')!;
      existing.remove();
      const div = document.createElement('div');
      div.id = 'container';
      document.body.appendChild(div);

      const playlist = createPlaylist();
      expect(() => createVirusLoader(playlist)).toThrow(
        'Required element #container not found'
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

  // ─────────────────────────────────────────────────────────────────────────
  // 2. constructor deep-link
  // ─────────────────────────────────────────────────────────────────────────
  describe('constructor deep-link', () => {
    it('should load deep-linked virus when ?virus= matches a known virus', () => {
      window.history.replaceState({}, '', '/?virus=random-shapes');

      const playlist = createPlaylist();
      const setCurrentVirusSpy = vi.spyOn(playlist, 'setCurrentVirus');

      createVirusLoader(playlist);

      expect(setCurrentVirusSpy).toHaveBeenCalledWith('random-shapes');
      const iframe = document.getElementById('container') as HTMLIFrameElement;
      expect(iframe.src).toContain('/viruses/random-shapes/');
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

      // startRandomization sets loadRandomInterval
      expect(priv(vl).loadRandomInterval).toBeDefined();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 3. loadVirus
  // ─────────────────────────────────────────────────────────────────────────
  describe('loadVirus', () => {
    it('should set iframe src for a regular virus', () => {
      const playlist = createPlaylist();
      const vl = createVirusLoader(playlist);

      vl.loadVirus('test-virus');

      const iframe = document.getElementById('container') as HTMLIFrameElement;
      expect(iframe.src).toContain('/viruses/test-virus/');
      expect(iframe.style.display).toBe('block');
    });

    it('should create mix container for premix virus', () => {
      const playlist = createPlaylist();
      vi.spyOn(playlist, 'isMixedVirus').mockReturnValue(true);
      vi.spyOn(playlist, 'getPremixByName').mockReturnValue({
        primary: 'sphere',
        secondary: 'uzumaki',
        mixRatio: 0.5,
        name: 'sphere-uzumaki',
      });

      const vl = createVirusLoader(playlist);

      // Reset isMixedVirus to only match premix calls going forward
      const isMixedSpy = vi.spyOn(playlist, 'isMixedVirus');
      isMixedSpy.mockImplementation((name: string) =>
        name.startsWith('premix:')
      );
      const getPremixSpy = vi.spyOn(playlist, 'getPremixByName');
      getPremixSpy.mockReturnValue({
        primary: 'sphere',
        secondary: 'uzumaki',
        mixRatio: 0.5,
        name: 'sphere-uzumaki',
      });

      vl.loadVirus('premix:sphere-uzumaki');

      const mixContainer = document.querySelector('.mixed-virus-container');
      expect(mixContainer).not.toBeNull();
      const mixIframe = mixContainer!.querySelector('iframe');
      expect(mixIframe).not.toBeNull();
      expect(mixIframe!.src).toContain('/viruses/lab/');
      expect(mixIframe!.src).toContain('primary=sphere');
      expect(mixIframe!.src).toContain('secondary=uzumaki');
      expect(mixIframe!.src).toContain('ratio=0.5');
    });

    it('should fall back when mix is not found', async () => {
      const Sentry = await import('@sentry/browser');

      const playlist = createPlaylist();
      vi.spyOn(playlist, 'isMixedVirus').mockReturnValue(true);
      vi.spyOn(playlist, 'getPremixByName').mockReturnValue(undefined);
      vi.spyOn(playlist, 'getMixById').mockReturnValue(undefined);

      const vl = createVirusLoader(playlist);

      // Now load a mixed virus that doesn't exist
      const isMixedSpy = vi.spyOn(playlist, 'isMixedVirus');
      isMixedSpy.mockReturnValue(true);
      const getPremixSpy = vi.spyOn(playlist, 'getPremixByName');
      getPremixSpy.mockReturnValue(undefined);

      vl.loadVirus('premix:nonexistent');

      const captureMessageFn = vi.mocked(Sentry.captureMessage);
      expect(captureMessageFn).toHaveBeenCalledWith(
        'Mix not found for ID: premix:nonexistent',
        'error'
      );

      const iframe = document.getElementById('container') as HTMLIFrameElement;
      expect(iframe.src).toContain(`/viruses/${playlist.viruses[0]}/`);
      expect(iframe.style.display).toBe('block');
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

      const mixContainer = document.querySelector('.mixed-virus-container');
      expect(mixContainer).not.toBeNull();
      const mixIframe = mixContainer!.querySelector('iframe');
      expect(mixIframe).not.toBeNull();
      expect(mixIframe!.src).toContain(
        'primary=' + encodeURIComponent('test virus')
      );
      expect(mixIframe!.src).toContain(
        'secondary=' + encodeURIComponent('other&virus')
      );
      expect(mixIframe!.src).toContain('ratio=0.75');
    });

    it('should catch errors and fall back when regular virus loading throws', async () => {
      const Sentry = await import('@sentry/browser');

      const playlist = createPlaylist();
      const vl = createVirusLoader(playlist);

      const iframe = document.getElementById('container') as HTMLIFrameElement;
      const origAddEventListener = iframe.addEventListener.bind(iframe);
      iframe.addEventListener = vi.fn().mockImplementationOnce(() => {
        throw new Error('Simulated iframe error');
      });

      vl.loadVirus('test-virus');

      expect(console.error).toHaveBeenCalledWith(
        'Error loading virus:',
        expect.any(Error)
      );
      expect(vi.mocked(Sentry.captureException)).toHaveBeenCalledWith(
        expect.any(Error)
      );
      expect(iframe.src).toContain(`/viruses/${playlist.viruses[0]}/`);
      expect(iframe.style.display).toBe('block');

      iframe.addEventListener = origAddEventListener;
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

      const iframe = document.getElementById('container') as HTMLIFrameElement;
      expect(iframe.src).toContain(`/viruses/${playlist.viruses[0]}/`);
      expect(iframe.style.display).toBe('block');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 4. generation counter
  // ─────────────────────────────────────────────────────────────────────────
  describe('generation counter', () => {
    it('should cancel stale safety timeout when new load starts', async () => {
      const Sentry = await import('@sentry/browser');

      const playlist = createPlaylist();
      const vl = createVirusLoader(playlist);

      // Pause randomization to prevent interval from interfering
      vl.pauseRandomization();

      vl.loadVirus('virus1');
      const gen1 = priv(vl)._loadGeneration as number;
      expect(gen1).toBeGreaterThan(0);

      vl.loadVirus('virus2');
      const gen2 = priv(vl)._loadGeneration as number;
      expect(gen2).toBe(gen1 + 1);

      vi.advanceTimersByTime(5000);

      const captureMessageFn = vi.mocked(Sentry.captureMessage);
      const safetyCalls = captureMessageFn.mock.calls.filter(call =>
        String(call[0]).includes('Safety timeout')
      );
      expect(safetyCalls.length).toBe(1);
      expect(String(safetyCalls[0][0])).toContain('virus2');
    });

    it('should ignore stale iframe load events', () => {
      const playlist = createPlaylist();
      const vl = createVirusLoader(playlist);

      vl.loadVirus('virus1');
      vl.loadVirus('virus2');

      const gen = priv(vl)._loadGeneration as number;
      expect(gen).toBeGreaterThanOrEqual(3);

      const iframe = document.getElementById('container') as HTMLIFrameElement;
      iframe.dispatchEvent(new Event('load'));

      expect(priv(vl)._safetyTimeout).toBeNull();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 5. safety timeout
  // ─────────────────────────────────────────────────────────────────────────
  describe('safety timeout', () => {
    it('should force loading animation stop after 5 seconds', async () => {
      const Sentry = await import('@sentry/browser');

      const playlist = createPlaylist();
      const vl = createVirusLoader(playlist);

      // Pause randomization to prevent interval from firing at 5s
      vl.pauseRandomization();

      vi.advanceTimersByTime(5000);

      const captureMessageFn = vi.mocked(Sentry.captureMessage);
      expect(captureMessageFn).toHaveBeenCalledWith(
        expect.stringContaining('Safety timeout'),
        'warning'
      );

      const loadingRing = document.getElementById(
        'loading-ring'
      ) as HTMLDivElement;
      expect(loadingRing.classList.contains('loading')).toBe(false);
    });

    it('should not fire safety timeout if iframe loads first', async () => {
      const Sentry = await import('@sentry/browser');
      const captureMessageFn = vi.mocked(Sentry.captureMessage);

      const playlist = createPlaylist();
      const vl = createVirusLoader(playlist);
      vl.pauseRandomization();

      // Clear any calls from constructor
      captureMessageFn.mockClear();

      const iframe = document.getElementById('container') as HTMLIFrameElement;
      iframe.dispatchEvent(new Event('load'));

      vi.advanceTimersByTime(5000);

      const safetyCalls = captureMessageFn.mock.calls.filter(call =>
        String(call[0]).includes('Safety timeout')
      );
      expect(safetyCalls.length).toBe(0);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 6. skipNext / skipPrev
  // ─────────────────────────────────────────────────────────────────────────
  describe('skipNext / skipPrev', () => {
    it('should skip to next virus', () => {
      const playlist = createPlaylist();
      const nextSpy = vi.spyOn(playlist, 'next').mockReturnValue('next-virus');

      const vl = createVirusLoader(playlist);
      nextSpy.mockClear();

      vl.skipNext();

      expect(nextSpy).toHaveBeenCalledTimes(1);
      const iframe = document.getElementById('container') as HTMLIFrameElement;
      expect(iframe.src).toContain('/viruses/next-virus/');
    });

    it('should skip to previous virus', () => {
      const playlist = createPlaylist();
      const prevSpy = vi.spyOn(playlist, 'prev').mockReturnValue('prev-virus');

      const vl = createVirusLoader(playlist);

      vl.skipPrev();

      expect(prevSpy).toHaveBeenCalledTimes(1);
      const iframe = document.getElementById('container') as HTMLIFrameElement;
      expect(iframe.src).toContain('/viruses/prev-virus/');
    });

    it('should debounce rapid skip calls', () => {
      const playlist = createPlaylist();
      const nextSpy = vi.spyOn(playlist, 'next').mockReturnValue('next-virus');

      const vl = createVirusLoader(playlist);
      nextSpy.mockClear();

      vl.skipNext();
      vl.skipNext(); // Should be ignored due to isNavigating

      expect(nextSpy).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(300);

      vl.skipNext();
      expect(nextSpy).toHaveBeenCalledTimes(2);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 7. toggleLab
  // ─────────────────────────────────────────────────────────────────────────
  describe('toggleLab', () => {
    it('should open lab', () => {
      const playlist = createPlaylist();
      const vl = createVirusLoader(playlist);

      expect(vl.isLabOpen).toBe(false);

      vl.toggleLab();

      expect(vl.isLabOpen).toBe(true);

      const labContainer = document.getElementById('virus-lab');
      expect(labContainer).not.toBeNull();

      const iframe = document.getElementById('container') as HTMLIFrameElement;
      expect(iframe.style.display).toBe('none');
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
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 8. pauseRandomization / startRandomization
  // ─────────────────────────────────────────────────────────────────────────
  describe('pauseRandomization / startRandomization', () => {
    it('should clear interval on pause', () => {
      const playlist = createPlaylist();
      const vl = createVirusLoader(playlist);

      expect(priv(vl).loadRandomInterval).toBeDefined();

      vl.pauseRandomization();

      const currentSrc = (
        document.getElementById('container') as HTMLIFrameElement
      ).src;

      const nextSpy = vi
        .spyOn(playlist, 'next')
        .mockReturnValue('should-not-load');
      vi.advanceTimersByTime(15000);

      const afterSrc = (
        document.getElementById('container') as HTMLIFrameElement
      ).src;
      expect(afterSrc).toBe(currentSrc);
      nextSpy.mockRestore();
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

      // randomIntBetween is mocked to return 5, so interval = 5000ms
      vl.startRandomization();

      vi.advanceTimersByTime(4999);
      expect(nextSpy).not.toHaveBeenCalled();

      vi.advanceTimersByTime(1);
      expect(nextSpy).toHaveBeenCalledTimes(1);

      const iframe = document.getElementById('container') as HTMLIFrameElement;
      expect(iframe.src).toContain('/viruses/interval-virus/');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 9. reloadCurrent
  // ─────────────────────────────────────────────────────────────────────────
  describe('reloadCurrent', () => {
    it('should reload the current virus', () => {
      const playlist = createPlaylist();
      vi.spyOn(playlist, 'current').mockReturnValue('current-virus');

      const vl = createVirusLoader(playlist);

      vl.reloadCurrent();

      const iframe = document.getElementById('container') as HTMLIFrameElement;
      expect(iframe.src).toContain('/viruses/current-virus/');
    });

    it('should debounce rapid reload calls', () => {
      const playlist = createPlaylist();
      const currentSpy = vi
        .spyOn(playlist, 'current')
        .mockReturnValue('current-virus');

      const vl = createVirusLoader(playlist);
      currentSpy.mockClear();

      vl.reloadCurrent();
      vl.reloadCurrent(); // Should be ignored

      vi.advanceTimersByTime(300);
      vl.reloadCurrent();

      // Two successful reloads (first + after debounce)
      expect(currentSpy).toHaveBeenCalledTimes(2);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 10. sourceCodeUrl
  // ─────────────────────────────────────────────────────────────────────────
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

  // ─────────────────────────────────────────────────────────────────────────
  // 11. virusHasKeyboardControl
  // ─────────────────────────────────────────────────────────────────────────
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
