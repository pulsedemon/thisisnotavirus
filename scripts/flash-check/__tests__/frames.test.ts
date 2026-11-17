import { describe, expect, it } from 'vitest';
import { PNG } from 'pngjs';
import { decodePng, downsample, encodePng } from '../frames.ts';

describe('frames', () => {
  it('downsamples a 1 px black/white checkerboard to the encoding of linear 0.5', () => {
    const width = 4;
    const height = 4;
    const data = new Uint8Array(width * height * 3);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        data.fill(
          (x + y) % 2 ? 255 : 0,
          (y * width + x) * 3,
          (y * width + x) * 3 + 3
        );
      }
    }
    const small = downsample({ width, height, data }, 2);
    expect(small.width).toBe(2);
    expect(small.height).toBe(2);
    expect([...small.data]).toEqual(new Array(12).fill(188));
  });

  it('decodes a 2x2 PNG to RGB', () => {
    const png = new PNG({ width: 2, height: 2 });
    png.data.set([
      255, 0, 0, 255, 0, 255, 0, 255, 0, 0, 255, 255, 10, 20, 30, 255,
    ]);
    const frame = decodePng(PNG.sync.write(png));
    expect(frame.width).toBe(2);
    expect(frame.height).toBe(2);
    expect([...frame.data]).toEqual([
      255, 0, 0, 0, 255, 0, 0, 0, 255, 10, 20, 30,
    ]);
  });

  it('round-trips a frame through encodePng and decodePng', () => {
    const frame = {
      width: 3,
      height: 2,
      data: Uint8Array.from({ length: 18 }, (_, i) => i * 14),
    };
    expect(decodePng(encodePng(frame))).toEqual(frame);
  });
});
