import { describe, expect, it, vi } from 'vitest';
import { FlashDetector, type FlashResult, type Frame } from '../detector.ts';

type RGB = [number, number, number];
interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
  c: RGB;
}

const BLACK: RGB = [0, 0, 0];
const WHITE: RGB = [255, 255, 255];
const RED: RGB = [255, 0, 0];
const CYAN: RGB = [0, 140, 140];
/** two default 341x256 windows each way, so window search is still exercised */
const W = 682;
const H = 512;

// each case pushes 120 frames through the detector, which takes minutes on ci runners
vi.setConfig({ testTimeout: 120_000 });

/** fills `data` from `start` to `end` with one color */
function fill(data: Uint8Array, c: RGB, start: number, end: number) {
  data.set(c, start);
  for (let len = 3; start + len < end; len *= 2) {
    data.copyWithin(start + len, start, Math.min(start + len, end - len));
  }
}

function scene(
  width: number,
  height: number,
  bg: RGB,
  rects: Rect[] = []
): Frame {
  const data = new Uint8Array(width * height * 3);
  fill(data, bg, 0, data.length);
  for (const r of rects) {
    for (let y = r.y; y < r.y + r.h; y++) {
      fill(data, r.c, (y * width + r.x) * 3, (y * width + r.x + r.w) * 3);
    }
  }
  return { width, height, data };
}

function measure(
  width: number,
  height: number,
  frameAt: (k: number) => Frame,
  opts: { windowW?: number; windowH?: number } = {}
): FlashResult {
  const detector = new FlashDetector(width, height, opts);
  for (let k = 0; k < 120; k++) detector.push(frameAt(k));
  return detector.result();
}

/** a small frame with a 64x48 window */
function small(frameAt: (k: number) => Frame): FlashResult {
  return measure(256, 192, frameAt, { windowW: 64, windowH: 48 });
}

function full(frameAt: (k: number) => Frame): FlashResult {
  return measure(W, H, frameAt);
}

const toggles = (every: number) => (k: number) =>
  Math.floor(k / every) % 2 === 1;
/** toggles at round(j * 7.5), 8 times a second */
const fourHz = (k: number) => Math.floor((k + 0.5) / 7.5) % 2 === 1;

function solidAt(on: (k: number) => boolean, a: RGB, b: RGB) {
  return (k: number) => scene(256, 192, on(k) ? b : a);
}

describe('FlashDetector general flashes', () => {
  it('3Hz passes', () => {
    const { general } = small(solidAt(toggles(10), BLACK, WHITE));
    expect(general.net.rate).toBe(3);
    expect(general.pixel.rate).toBe(3);
  });

  it('9-frame toggles fail', () => {
    const { general } = small(solidAt(toggles(9), BLACK, WHITE));
    expect(general.net.rate).toBe(3.5);
    expect(general.pixel.rate).toBe(3.5);
  });

  it('4Hz fails', () => {
    const { general } = small(solidAt(fourHz, BLACK, WHITE));
    expect(general.net.rate).toBe(4);
    expect(general.pixel.rate).toBe(4);
  });

  it('30Hz flicker fails', () => {
    const { general } = small(solidAt(toggles(1), BLACK, WHITE));
    expect(general.net.rate).toBe(30);
    expect(general.pixel.rate).toBe(30);
  });

  it('eased transitions', () => {
    const { general } = small(k => {
      const p = k % 12;
      const v = Math.round((128 * (p <= 6 ? p : 12 - p)) / 6);
      return scene(256, 192, [v, v, v]);
    });
    expect(general.net.rate).toBe(5);
    expect(general.pixel.rate).toBe(5);
  });

  it('bright-only swings ignored', () => {
    const { general } = small(solidAt(toggles(6), WHITE, [240, 240, 240]));
    expect(general.net.rate).toBe(0);
    expect(general.pixel.rate).toBe(0);
  });

  it('sub-threshold ignored', () => {
    const { general } = small(
      solidAt(toggles(6), [118, 118, 118], [128, 128, 128])
    );
    expect(general.net.rate).toBe(0);
    expect(general.pixel.rate).toBe(0);
  });

  it('area 23% vs 27%', () => {
    const patch = (h: number) => (k: number) =>
      scene(
        W,
        H,
        BLACK,
        toggles(6)(k) ? [{ x: 0, y: 200, w: W, h, c: WHITE }] : []
      );

    const under = full(patch(60)).general;
    expect(under.net.rate).toBe(0);
    expect(under.pixel.rate).toBe(0);
    expect(under.net.area).toBeCloseTo(0.234, 3);
    expect(under.pixel.area).toBeCloseTo(0.234, 3);
    expect(under.volume.value).toBeCloseTo(2.34, 2);

    const over = full(patch(68)).general;
    expect(over.net.rate).toBe(5);
    expect(over.pixel.rate).toBe(5);
  });

  it('window placement', () => {
    const { general } = full(k =>
      scene(
        W,
        H,
        BLACK,
        toggles(6)(k) ? [{ x: 241, y: 196, w: 200, h: 120, c: WHITE }] : []
      )
    );
    expect(general.net.rate).toBe(5);
    expect(general.pixel.rate).toBe(5);
  });

  it('counter-phase stripes', () => {
    const { general } = full(k => {
      const phase = toggles(6)(k) ? 1 : 0;
      const stripes: Rect[] = [];
      for (let i = phase; i * 64 < W; i += 2) {
        stripes.push({
          x: i * 64,
          y: 0,
          w: Math.min(64, W - i * 64),
          h: H,
          c: WHITE,
        });
      }
      return scene(W, H, BLACK, stripes);
    });
    expect(general.pixel.rate).toBe(5);
    expect(general.net.rate).toBe(0);
  });

  /** two 341x80 patches in one window, on at frames 0-5 and 15-20 of every 30 */
  function patches(k: number, split: boolean): Rect[] {
    const p = k % 30;
    const rects: Rect[] = [];
    for (const [y, on] of [
      [100, p <= 5],
      [200, p >= 15 && p <= 20],
    ] as const) {
      if (!split) {
        if (on) rects.push({ x: 0, y, w: 341, h: 80, c: WHITE });
      } else {
        rects.push({ x: on ? 0 : 170, y, w: on ? 170 : 171, h: 80, c: WHITE });
      }
    }
    return rects;
  }

  it('alternating patches', () => {
    const { general } = full(k => scene(W, H, BLACK, patches(k, false)));
    expect(general.net.rate).toBe(4);
    expect(general.pixel.rate).toBe(2);
  });

  it('split counter-phase patches', () => {
    const { general } = full(k => scene(W, H, BLACK, patches(k, true)));
    expect(general.net.rate).toBe(0);
    expect(general.pixel.rate).toBe(2);
    expect(general.volume.value).toBeCloseTo(2.5, 2);
  });

  it('volume bound', () => {
    const fifteen = measure(
      256,
      192,
      k =>
        scene(
          256,
          192,
          BLACK,
          toggles(6)(k) ? [{ x: 100, y: 100, w: 20, h: 12, c: WHITE }] : []
        ),
      { windowW: 40, windowH: 40 }
    );
    expect(fifteen.general.volume.value).toBeCloseTo(1.5, 5);

    const fullFrame = small(solidAt(toggles(10), BLACK, WHITE));
    expect(fullFrame.general.volume.value).toBeCloseTo(6, 5);
  });
});

describe('FlashDetector red flashes', () => {
  it('red flash', () => {
    const { general, red } = small(solidAt(fourHz, BLACK, [80, 0, 0]));
    expect(general.pixel.rate).toBe(0);
    expect(general.net.rate).toBe(0);
    expect(red.net.rate).toBe(4);
    expect(red.pixel.rate).toBe(4);
  });

  it('eased red', () => {
    const { red } = small(k => {
      const p = k % 15;
      const t = p < 6 ? p / 6 : p < 7.5 ? 1 : p < 13.5 ? 1 - (p - 7.5) / 6 : 0;
      const gb = Math.round(255 * (1 - t));
      return scene(256, 192, [255, gb, gb]);
    });
    expect(red.net.rate).toBe(4);
    expect(red.pixel.rate).toBe(4);
  });

  it('red after orange start', () => {
    const { red } = small(k =>
      scene(256, 192, k < 15 ? [255, 140, 0] : fourHz(k) ? RED : WHITE)
    );
    expect(red.volume.value).toBeGreaterThan(1.75);
  });

  it('red hue shift ignored', () => {
    const { red } = small(solidAt(toggles(6), RED, [240, 0, 0]));
    expect(red.net.rate).toBe(0);
    expect(red.pixel.rate).toBe(0);
    expect(red.volume.value).toBe(0);
  });

  it('unsaturated anchor', () => {
    const { red } = full(k => {
      const c: RGB =
        k < 15
          ? [0, 140, 255]
          : k < 30
            ? [202, 110, 110]
            : fourHz(k)
              ? CYAN
              : RED;
      return scene(W, H, BLACK, [{ x: 0, y: 200, w: 341, h: 80, c }]);
    });
    expect(red.volume.value).toBeGreaterThan(1.75);
  });

  it('red return leg', () => {
    const A: RGB = RED;
    const B: RGB = CYAN;
    const C: RGB = [211, 81, 81];
    const top = [A, B, C, B];
    const bottom = [C, B, A, B];
    const { general, red } = full(k => {
      const leg = Math.floor((k + 0.5) / 7.5) % 4;
      return scene(W, H, BLACK, [
        { x: 0, y: 200, w: 341, h: 34, c: top[leg] },
        { x: 0, y: 234, w: 341, h: 34, c: bottom[leg] },
      ]);
    });
    expect(general.pixel.rate).toBe(0);
    expect(general.net.rate).toBe(0);
    expect(red.volume.value).toBeCloseTo(2.8, 1);
  });
});
