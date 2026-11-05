import { describe, it, expect, vi, afterEach } from 'vitest';
import { pickTransition, transitions } from '../transitions';

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
    expect(pickTransition(null, 'cubes')).toBeNull();
  });

  it('reaches every generic transition', () => {
    const n = transitions.length + 1;
    const picked = transitions.map((_, i) => {
      vi.spyOn(Math, 'random').mockReturnValue((i + 1) / n);
      return pickTransition(null, 'cubes')?.name;
    });
    expect(picked).toEqual(['blink']);
  });

  it('never runs the previous transition again', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99);
    expect(pickTransition('blink', 'cubes')).toBeNull();
  });

  it('offers bury only when random-shapes is next', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99);
    expect(pickTransition(null, 'random-shapes')?.name).toBe('bury');
    expect(pickTransition(null, 'cubes')?.name).toBe('blink');
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
      return { finished: new Promise(() => undefined) } as Animation;
    } as HTMLElement['animate'];
  }

  it.each(transitions.map(t => [t.name, t] as const))(
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
