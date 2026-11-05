import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Stage, { StageLoad } from '../Stage';
import type { Overlay, Transition } from '../../transitions/transitions';

const { flashStart, flashStop, tvShow, tvHide, pickTransition } = vi.hoisted(
  () => ({
    flashStart: vi.fn(),
    flashStop: vi.fn(),
    tvShow: vi.fn(),
    tvHide: vi.fn(),
    pickTransition: vi.fn(
      (
        _previous: string | null,
        _incoming: string,
        _allowOverlay: boolean
      ): Transition | Overlay | null => null
    ),
  })
);

vi.mock('../../transitions/transitions', () => ({ pickTransition }));

vi.mock('@sentry/browser', () => ({
  captureException: vi.fn(),
  captureMessage: vi.fn(),
}));

vi.mock('../../flash/flash', () => ({
  default: class MockFlash {
    start = flashStart;
    stop = flashStop;
  },
}));

vi.mock('../../TVStaticLoading', () => ({
  default: class MockTVStaticLoading {
    show = tvShow;
    hide = tvHide;
  },
}));

function load(virus: string): StageLoad {
  return { virus, src: `/viruses/${virus}/`, interactive: true };
}

describe('Stage', () => {
  let el: HTMLDivElement;
  let onShown: ReturnType<typeof vi.fn>;
  let stage: Stage;

  const slots = () => [...el.querySelectorAll<HTMLDivElement>('.virus-slot')];
  const frameOf = (slot: HTMLDivElement) => slot.querySelector('iframe')!;

  function reveal(slot: HTMLDivElement) {
    frameOf(slot).dispatchEvent(new Event('load'));
    vi.advanceTimersByTime(500);
  }

  beforeEach(() => {
    vi.clearAllMocks();
    pickTransition.mockReturnValue(null);
    vi.useFakeTimers();
    // >= 0.5 picks the Flash cover
    vi.spyOn(Math, 'random').mockReturnValue(0.6);
    vi.spyOn(console, 'warn').mockImplementation(vi.fn());
    vi.spyOn(console, 'error').mockImplementation(vi.fn());

    el = document.createElement('div');
    document.body.appendChild(el);
    const loadingAnim = document.createElement('div');
    onShown = vi.fn();
    stage = new Stage(el, loadingAnim, onShown);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    document.body.textContent = '';
  });

  it('puts each load in one hidden slot until it loads', () => {
    stage.show(load('a'));
    expect(slots()).toHaveLength(1);
    expect(slots()[0].style.visibility).toBe('hidden');
    const frame = frameOf(slots()[0]);
    expect(frame.getAttribute('src')).toBe('/viruses/a/');
    expect(frame.title).toBe('virus');
    expect(frame.classList.contains('virus-iframe--interactive')).toBe(true);
  });

  it('leaves mix frames without pointer input', () => {
    stage.show({ virus: 'premix:x', src: '/viruses/lab/', interactive: false });
    const frame = frameOf(slots()[0]);
    expect(frame.classList.contains('virus-iframe--interactive')).toBe(false);
  });

  it('reveals after 500ms and leaves one slot when a cover load replaces a visible virus', () => {
    stage.show(load('a'));
    const [aSlot] = slots();
    expect(flashStart).toHaveBeenCalledTimes(1);
    frameOf(aSlot).dispatchEvent(new Event('load'));
    vi.advanceTimersByTime(499);
    expect(aSlot.style.visibility).toBe('hidden');
    expect(onShown).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(aSlot.style.visibility).toBe('');
    expect(onShown).toHaveBeenCalledTimes(1);
    expect(flashStop).toHaveBeenCalledTimes(1);

    stage.show(load('b'));
    expect(aSlot.isConnected).toBe(false);
    expect(slots()).toHaveLength(1);
  });

  it('reveals at once when the load took longer than 500ms', () => {
    stage.show(load('a'));
    vi.advanceTimersByTime(800);
    frameOf(slots()[0]).dispatchEvent(new Event('load'));
    expect(onShown).toHaveBeenCalledTimes(1);
  });

  it('forces the reveal and reports it after 5 seconds without a load', async () => {
    const Sentry = await import('@sentry/browser');
    stage.show(load('a'));
    vi.advanceTimersByTime(4999);
    expect(onShown).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(onShown).toHaveBeenCalledTimes(1);
    expect(vi.mocked(Sentry.captureMessage)).toHaveBeenCalledWith(
      'Safety timeout: forcing loading animation to stop for virus: a',
      'warning'
    );
  });

  it('does not fire the safety timeout when the frame loads first', async () => {
    const Sentry = await import('@sentry/browser');
    stage.show(load('a'));
    frameOf(slots()[0]).dispatchEvent(new Event('load'));
    vi.advanceTimersByTime(5000);
    expect(vi.mocked(Sentry.captureMessage)).not.toHaveBeenCalled();
  });

  it('reports a frame error and still reveals it', async () => {
    const Sentry = await import('@sentry/browser');
    stage.show(load('a'));
    frameOf(slots()[0]).dispatchEvent(new Event('error'));
    vi.advanceTimersByTime(500);
    expect(vi.mocked(Sentry.captureMessage)).toHaveBeenCalledWith(
      'Failed to load virus iframe: /viruses/a/',
      'error'
    );
    expect(onShown).toHaveBeenCalledTimes(1);
  });

  it('reveals once when load arrives after the safety timeout', () => {
    stage.show(load('a'));
    const frame = frameOf(slots()[0]);
    vi.advanceTimersByTime(5000);
    frame.dispatchEvent(new Event('load'));
    frame.dispatchEvent(new Event('error'));
    vi.advanceTimersByTime(500);
    expect(onShown).toHaveBeenCalledTimes(1);
  });

  it('reveals once when error and load both arrive before 500ms', () => {
    stage.show(load('a'));
    const frame = frameOf(slots()[0]);
    frame.dispatchEvent(new Event('error'));
    frame.dispatchEvent(new Event('load'));
    vi.advanceTimersByTime(500);
    expect(onShown).toHaveBeenCalledTimes(1);
  });

  it('cancels a scheduled reveal when its load is superseded', () => {
    stage.show(load('a'));
    const [aSlot] = slots();
    frameOf(aSlot).dispatchEvent(new Event('load'));
    vi.advanceTimersByTime(200);
    stage.show(load('b'));
    vi.advanceTimersByTime(300);
    expect(onShown).not.toHaveBeenCalled();
    expect(aSlot.isConnected).toBe(false);
  });

  it('discards an unrevealed load and stops its cover when another starts', async () => {
    const Sentry = await import('@sentry/browser');
    stage.show(load('a'));
    const [aSlot] = slots();
    stage.show(load('b'));
    expect(slots()).toHaveLength(1);
    expect(flashStop).toHaveBeenCalledTimes(1);
    expect(flashStart).toHaveBeenCalledTimes(2);

    aSlot.querySelector('iframe')!.dispatchEvent(new Event('load'));
    vi.advanceTimersByTime(500);
    expect(onShown).not.toHaveBeenCalled();

    // only b's safety timeout is left
    vi.advanceTimersByTime(5000);
    const safety = vi
      .mocked(Sentry.captureMessage)
      .mock.calls.filter(call => String(call[0]).includes('Safety timeout'));
    expect(safety).toHaveLength(1);
    expect(String(safety[0][0])).toContain('virus: b');
  });

  it('stops the TV static cover it started', () => {
    vi.mocked(Math.random).mockReturnValue(0.1);
    stage.show(load('a'));
    expect(tvShow).toHaveBeenCalledTimes(1);
    reveal(slots()[0]);
    expect(tvHide).toHaveBeenCalledTimes(1);
    expect(flashStart).not.toHaveBeenCalled();
  });

  it('marks and unmarks the newest iframe as keyboard owner', () => {
    stage.show(load('a'));
    const [aSlot] = slots();
    reveal(aSlot);
    stage.setKeyboardOwner(true);
    expect(frameOf(aSlot).dataset.keyboard).toBe('true');
    stage.setKeyboardOwner(false);
    expect(frameOf(aSlot).dataset.keyboard).toBeUndefined();
  });

  it('points activeWindow at the newest iframe', () => {
    stage.show(load('a'));
    reveal(slots()[0]);
    stage.show(load('b'));
    const [bSlot] = slots();
    expect(stage.activeWindow).toBe(frameOf(bSlot).contentWindow);
  });

  it('ignores callbacks from loads that were cleared', () => {
    stage.show(load('a'));
    const frame = frameOf(slots()[0]);
    stage.clear();
    expect(flashStop).toHaveBeenCalledTimes(1);
    frame.dispatchEvent(new Event('load'));
    vi.advanceTimersByTime(5000);
    expect(onShown).not.toHaveBeenCalled();
    expect(slots()).toHaveLength(0);
  });

  it('starts from an empty stage after clear', () => {
    stage.show(load('a'));
    reveal(slots()[0]);
    stage.clear();
    expect(slots()).toHaveLength(0);
    stage.show(load('b'));
    expect(slots()).toHaveLength(1);
  });

  describe('animated hand-off', () => {
    interface FakeAnimation {
      animation: Animation;
      resolve: () => void;
      finish: ReturnType<typeof vi.fn>;
    }
    let made: FakeAnimation[];
    let perRun: number;
    let run: ReturnType<typeof vi.fn>;

    function fakeAnimation(): FakeAnimation {
      let resolve!: () => void;
      const finished = new Promise<void>(r => (resolve = r));
      const finish = vi.fn(() => resolve());
      const fake = {
        animation: { finished, finish } as unknown as Animation,
        resolve,
        finish,
      };
      made.push(fake);
      return fake;
    }

    beforeEach(() => {
      made = [];
      perRun = 1;
      run = vi.fn(() =>
        Array.from({ length: perRun }, () => fakeAnimation().animation)
      );
      pickTransition.mockReturnValue({ name: 'fake', run });
    });

    function showVisible(virus: string): HTMLDivElement {
      stage.show(load(virus));
      const slot = slots()[slots().length - 1];
      reveal(slot);
      return slot;
    }

    it('uses the cover on the first load without picking', () => {
      stage.show(load('a'));
      expect(pickTransition).not.toHaveBeenCalled();
      expect(flashStart).toHaveBeenCalledTimes(1);
    });

    it('keeps the outgoing virus visible and skips the cover while the next one loads', () => {
      const aSlot = showVisible('a');
      stage.show(load('b'));
      const bSlot = slots()[1];

      expect(pickTransition).toHaveBeenCalledWith(null, 'b', true);
      expect(aSlot.style.visibility).toBe('');
      expect(bSlot.style.visibility).toBe('hidden');
      expect(flashStart).toHaveBeenCalledTimes(1);
    });

    it('runs the transition and removes the old slot when it finishes', async () => {
      const aSlot = showVisible('a');
      stage.show(load('b'));
      const bSlot = slots()[1];
      reveal(bSlot);

      expect(run).toHaveBeenCalledWith(aSlot, bSlot);
      expect(bSlot.style.visibility).toBe('');
      expect(onShown).toHaveBeenCalledTimes(2);
      expect(aSlot.isConnected).toBe(true);

      made[0].resolve();
      await vi.advanceTimersByTimeAsync(0);
      expect(aSlot.isConnected).toBe(false);
      expect(slots()).toEqual([bSlot]);
      expect(onShown).toHaveBeenCalledTimes(2);
    });

    it('tells pickTransition which transition ran last', () => {
      showVisible('a');
      stage.show(load('b'));
      reveal(slots()[1]);
      stage.show(load('c'));
      expect(pickTransition).toHaveBeenLastCalledWith('fake', 'c', true);

      pickTransition.mockReturnValue(null);
      stage.show(load('d'));
      reveal(slots()[0]);
      stage.show(load('e'));
      expect(pickTransition).toHaveBeenLastCalledWith(null, 'e', true);
    });

    it('waits for every animation before removing the old slot', async () => {
      perRun = 2;
      const aSlot = showVisible('a');
      stage.show(load('b'));
      reveal(slots()[1]);

      made[0].resolve();
      await vi.advanceTimersByTimeAsync(0);
      expect(aSlot.isConnected).toBe(true);
      made[1].resolve();
      await vi.advanceTimersByTimeAsync(0);
      expect(aSlot.isConnected).toBe(false);
    });

    it('uses the cover when pickTransition returns null', () => {
      const aSlot = showVisible('a');
      pickTransition.mockReturnValue(null);
      stage.show(load('b'));
      expect(aSlot.isConnected).toBe(false);
      expect(flashStart).toHaveBeenCalledTimes(2);
    });

    it('finishes a running transition when another load starts, and the late finished changes nothing', async () => {
      const aSlot = showVisible('a');
      stage.show(load('b'));
      const bSlot = slots()[1];
      reveal(bSlot);
      const ab = made[0];

      stage.show(load('c'));
      expect(ab.finish).toHaveBeenCalled();
      expect(aSlot.isConnected).toBe(false);
      expect(bSlot.isConnected).toBe(true);
      expect(run).toHaveBeenCalledTimes(1);

      const cSlot = slots()[1];
      reveal(cSlot);
      expect(run).toHaveBeenLastCalledWith(bSlot, cSlot);
      await vi.advanceTimersByTimeAsync(0);
      expect(bSlot.isConnected).toBe(true);

      made[1].resolve();
      await vi.advanceTimersByTimeAsync(0);
      expect(slots()).toEqual([cSlot]);
    });

    it('keeps the visible virus when an unrevealed hand-off is superseded', () => {
      const aSlot = showVisible('a');
      stage.show(load('b'));
      const bSlot = slots()[1];
      stage.show(load('c'));
      expect(bSlot.isConnected).toBe(false);
      expect(aSlot.isConnected).toBe(true);
      expect(slots()).toHaveLength(2);
    });

    it('runs the transition once when load arrives after the safety timeout', () => {
      showVisible('a');
      stage.show(load('b'));
      const bFrame = frameOf(slots()[1]);
      vi.advanceTimersByTime(5000);
      bFrame.dispatchEvent(new Event('load'));
      vi.advanceTimersByTime(500);
      expect(run).toHaveBeenCalledTimes(1);
    });

    it('starts from an empty stage after clear mid-transition', async () => {
      showVisible('a');
      stage.show(load('b'));
      reveal(slots()[1]);

      stage.clear();
      made[0].resolve();
      await vi.advanceTimersByTimeAsync(0);
      expect(slots()).toHaveLength(0);

      pickTransition.mockClear();
      stage.show(load('d'));
      expect(pickTransition).not.toHaveBeenCalled();
      expect(slots()).toHaveLength(1);
    });

    it('marks only the newest iframe as keyboard owner', () => {
      const aSlot = showVisible('a');
      stage.show(load('b'));
      const bFrame = frameOf(slots()[1]);
      stage.setKeyboardOwner(true);
      expect(bFrame.dataset.keyboard).toBe('true');
      expect(frameOf(aSlot).dataset.keyboard).toBeUndefined();
    });

    it('does not offer an overlay over a virus that owns the keyboard', () => {
      showVisible('a');
      stage.setKeyboardOwner(true);
      stage.show(load('b'));
      expect(pickTransition).toHaveBeenLastCalledWith(null, 'b', false);
    });
  });

  describe('overlay', () => {
    beforeEach(() => {
      pickTransition.mockImplementation((_previous, _incoming, allowOverlay) =>
        allowOverlay ? { name: 'bury', overlay: true } : null
      );
    });

    function showVisible(virus: string): HTMLDivElement {
      stage.show(load(virus));
      const slot = slots()[slots().length - 1];
      reveal(slot);
      return slot;
    }

    function loadOverlay(slot: HTMLDivElement) {
      const frames = slot.querySelectorAll('iframe');
      frames[frames.length - 1].dispatchEvent(new Event('load'));
      vi.advanceTimersByTime(500);
    }

    it('adds the incoming frame to the current slot, visible, over the running virus', () => {
      const aSlot = showVisible('a');
      const buried = frameOf(aSlot).contentWindow;
      stage.show(load('random-shapes'));

      const frames = aSlot.querySelectorAll('iframe');
      // re-inserting the slot would reload the buried virus
      expect(frames[0].contentWindow).toBe(buried);
      expect(slots()).toEqual([aSlot]);
      expect(frames).toHaveLength(2);
      expect(frames[1].getAttribute('src')).toBe(
        '/viruses/random-shapes/?overlay'
      );
      expect(frames[1].classList.contains('virus-iframe--overlay')).toBe(true);
      expect(frames[1].classList.contains('virus-iframe--interactive')).toBe(
        false
      );
      expect(aSlot.style.visibility).toBe('');
      expect(flashStart).toHaveBeenCalledTimes(1);
      expect(stage.activeWindow).toBe(frames[1].contentWindow);

      loadOverlay(aSlot);
      expect(onShown).toHaveBeenCalledTimes(2);
      expect(aSlot.querySelectorAll('iframe')).toHaveLength(2);
    });

    it('removes the buried virus with its overlay on the next load', () => {
      const aSlot = showVisible('a');
      stage.show(load('random-shapes'));
      loadOverlay(aSlot);

      pickTransition.mockReturnValue(null);
      stage.show(load('c'));
      expect(aSlot.isConnected).toBe(false);
      expect(el.querySelectorAll('iframe')).toHaveLength(1);
    });

    it('discards an unloaded overlay frame but keeps the slot it sat in', () => {
      const run = vi.fn(() => []);
      const aSlot = showVisible('a');
      stage.show(load('random-shapes'));

      pickTransition.mockReturnValue({ name: 'fake', run });
      stage.show(load('c'));
      const cSlot = slots()[1];
      expect(aSlot.isConnected).toBe(true);
      expect(aSlot.querySelectorAll('iframe')).toHaveLength(1);
      expect(cSlot.style.visibility).toBe('hidden');
    });

    it('does not offer a second overlay', () => {
      const aSlot = showVisible('a');
      stage.show(load('random-shapes'));
      loadOverlay(aSlot);

      stage.show(load('random-shapes'));
      expect(pickTransition).toHaveBeenLastCalledWith(
        'bury',
        'random-shapes',
        false
      );
    });

    it('does not bury a virus that owns the keyboard, even after a skipped load', () => {
      const run = vi.fn(() => []);
      showVisible('a');
      stage.setKeyboardOwner(true);
      pickTransition.mockReturnValueOnce({ name: 'fake', run });
      stage.show(load('b'));

      stage.show(load('random-shapes'));
      expect(pickTransition).toHaveBeenLastCalledWith(
        'fake',
        'random-shapes',
        false
      );
    });
  });
});
