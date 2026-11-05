import { describe, it, expect, vi, afterEach } from 'vitest';
import { pickTransition, Transition, transitions } from '../transitions';

interface AnimateCall {
  target: Element;
  keyframes: Keyframe[];
  options: KeyframeAnimationOptions;
}

describe('pickTransition', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('picks the cover for the first bucket', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    expect(pickTransition('cubes', true)).toBeNull();
  });

  it('reaches every generic transition', () => {
    const n = transitions.length + 1;
    const picked = transitions.map((_, i) => {
      vi.spyOn(Math, 'random').mockReturnValue((i + 1) / n);
      return pickTransition('cubes', true)?.name;
    });
    expect(picked).toEqual(['blink']);
  });

  it('offers bury only when random-shapes is next and no overlay is showing', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99);
    expect(pickTransition('random-shapes', true)?.name).toBe('bury');
    expect(pickTransition('cubes', true)?.name).toBe('blink');
    expect(pickTransition('random-shapes', false)?.name).toBe('blink');
  });
});

describe('transitions', () => {
  const calls: AnimateCall[] = [];

  afterEach(() => {
    calls.length = 0;
    delete (HTMLElement.prototype as Partial<HTMLElement>).animate;
  });

  function record() {
    HTMLElement.prototype.animate = function (
      this: Element,
      keyframes: Keyframe[],
      options: KeyframeAnimationOptions
    ) {
      calls.push({ target: this, keyframes, options });
      return {} as Animation;
    } as HTMLElement['animate'];
  }

  const animated = transitions.filter(
    (t): t is Extract<Transition, { run: unknown }> => 'run' in t
  );

  it.each(animated.map(t => [t.name, t] as const))(
    '%s releases the incoming slot and holds the outgoing one at its end',
    (_name, transition) => {
      record();
      const outgoing = document.createElement('div');
      const incoming = document.createElement('div');

      const animations = transition.run(outgoing, incoming);

      expect(animations).toHaveLength(calls.length);
      const incomingCalls = calls.filter(c => c.target === incoming);
      expect(incomingCalls.length).toBeGreaterThan(0);
      for (const call of incomingCalls) {
        // a forwards fill would leave the new virus clipped or squashed for good
        expect(['forwards', 'both']).not.toContain(call.options.fill);
        if (call.options.delay) expect(call.options.fill).toBe('backwards');
        expect(
          (call.options.delay ?? 0) + Number(call.options.duration)
        ).toBeLessThanOrEqual(800);
      }
      for (const call of calls.filter(c => c.target === outgoing)) {
        expect(call.options.fill).toBe('forwards');
      }
    }
  );
});
