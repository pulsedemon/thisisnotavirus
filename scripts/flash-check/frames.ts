import { PNG } from 'pngjs';
import { LINEAR, type Frame } from './detector.ts';

export function decodePng(buf: Buffer): Frame {
  const png = PNG.sync.read(buf);
  const data = new Uint8Array(png.width * png.height * 3);
  for (let p = 0, i = 0; i < data.length; p += 4, i += 3) {
    data[i] = png.data[p];
    data[i + 1] = png.data[p + 1];
    data[i + 2] = png.data[p + 2];
  }
  return { width: png.width, height: png.height, data };
}

export function encodePng(f: Frame): Buffer {
  const png = new PNG({ width: f.width, height: f.height });
  for (let p = 0, i = 0; i < f.data.length; p += 4, i += 3) {
    png.data[p] = f.data[i];
    png.data[p + 1] = f.data[i + 1];
    png.data[p + 2] = f.data[i + 2];
    png.data[p + 3] = 255;
  }
  return PNG.sync.write(png);
}

function encode(linear: number): number {
  const c =
    linear <= 0.0031308 ? linear * 12.92 : 1.055 * linear ** (1 / 2.4) - 0.055;
  return Math.round(c * 255);
}

/** box average over `factor`x`factor` blocks in linear light, so fine patterns keep their brightness */
export function downsample(f: Frame, factor: number): Frame {
  const width = Math.floor(f.width / factor);
  const height = Math.floor(f.height / factor);
  const data = new Uint8Array(width * height * 3);
  const count = factor * factor;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      for (let c = 0; c < 3; c++) {
        let sum = 0;
        for (let dy = 0; dy < factor; dy++) {
          for (let dx = 0; dx < factor; dx++) {
            const sx = x * factor + dx;
            const sy = y * factor + dy;
            sum += LINEAR[f.data[(sy * f.width + sx) * 3 + c]];
          }
        }
        data[(y * width + x) * 3 + c] = encode(sum / count);
      }
    }
  }
  return { width, height, data };
}
