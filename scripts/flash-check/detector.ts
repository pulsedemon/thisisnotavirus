/** sRGB RGB, 3 bytes per pixel */
export interface Frame {
  width: number;
  height: number;
  data: Uint8Array;
}

export interface Measure {
  /** flashes/s, in 0.5 steps */
  rate: number;
  /** window fraction at the worst point */
  area: number;
  atFrame: number;
  window: { x: number; y: number };
}

export interface Volume {
  value: number;
  atFrame: number;
  window: { x: number; y: number };
}

export interface Channel {
  net: Measure;
  pixel: Measure;
  /**
   * general: largest sum over any 60 frames of (up + down) / windowPixels, over all windows.
   * red: the same window sum of each pixel's u′v′ path length / 0.2, over pixels saturated at some frame in the span.
   */
  volume: Volume;
}

export interface FlashResult {
  general: Channel;
  red: Channel;
}

const SPAN = 60;
/** u′v′ path steps are stored as integers of this many units per 1.0, rounded up */
const PATH_SCALE = 50000;
const SATURATED_BIT = 0x8000;
/** black has no chromaticity, so it takes the D65 white point */
const D65_U = 0.1978;
const D65_V = 0.4683;

const LINEAR = new Float32Array(256);
for (let i = 0; i < 256; i++) {
  const c = i / 255;
  LINEAR[i] = c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

export function relativeLuminance(r: number, g: number, b: number): number {
  return 0.2126 * LINEAR[r] + 0.7152 * LINEAR[g] + 0.0722 * LINEAR[b];
}

export function chromaticity(
  r: number,
  g: number,
  b: number
): [number, number] {
  const R = LINEAR[r];
  const G = LINEAR[g];
  const B = LINEAR[b];
  const X = 0.4124 * R + 0.3576 * G + 0.1805 * B;
  const Y = 0.2126 * R + 0.7152 * G + 0.0722 * B;
  const Z = 0.0193 * R + 0.1192 * G + 0.9505 * B;
  const d = X + 15 * Y + 3 * Z;
  if (d === 0) return [D65_U, D65_V];
  return [(4 * X) / d, (9 * Y) / d];
}

export function isSaturatedRed(r: number, g: number, b: number): boolean {
  const sum = LINEAR[r] + LINEAR[g] + LINEAR[b];
  return sum > 0 && LINEAR[r] / sum >= 0.8;
}

const UP = 1;
const DOWN = 2;

/** largest window sum of `values` over every window position, and where */
function maxWindowSum(
  values: ArrayLike<number>,
  w: number,
  h: number,
  ww: number,
  wh: number,
  sat: Float64Array
): { sum: number; x: number; y: number } {
  const stride = w + 1;
  for (let y = 0; y < h; y++) {
    let row = 0;
    for (let x = 0; x < w; x++) {
      row += values[y * w + x];
      sat[(y + 1) * stride + x + 1] = sat[y * stride + x + 1] + row;
    }
  }
  let best = -1;
  let bx = 0;
  let by = 0;
  for (let y = 0; y + wh <= h; y++) {
    const top = y * stride;
    const bottom = (y + wh) * stride;
    for (let x = 0; x + ww <= w; x++) {
      const sum =
        sat[bottom + x + ww] -
        sat[top + x + ww] -
        sat[bottom + x] +
        sat[top + x];
      if (sum > best) {
        best = sum;
        bx = x;
        by = y;
      }
    }
  }
  return { sum: best, x: bx, y: by };
}

/** turns per-pixel up/down registrations into the `net` and `pixel` measures */
class TransitionStats {
  private readonly w: number;
  private readonly h: number;
  private readonly ww: number;
  private readonly wh: number;
  private readonly n: number;
  private readonly windowPixels: number;
  private readonly windows: number;
  /** each pixel's registrations in the trailing 60 frames */
  readonly counts: Uint8Array;
  private readonly history: Uint8Array;
  private readonly upSat: Float64Array;
  private readonly downSat: Float64Array;
  private readonly sat: Float64Array;
  private readonly level: Uint8Array;
  private readonly runSum: Float32Array;
  private readonly runSign: Int8Array;
  private readonly runDone: Uint8Array;
  private readonly zeros: Uint8Array;
  private readonly lastDir: Int8Array;
  private readonly windowCounts: Uint8Array;
  private readonly windowHistory: Uint8Array;
  net: Measure = { rate: 0, area: 0, atFrame: 0, window: { x: 0, y: 0 } };
  pixel: Measure = { rate: 0, area: 0, atFrame: 0, window: { x: 0, y: 0 } };

  constructor(w: number, h: number, ww: number, wh: number) {
    this.w = w;
    this.h = h;
    this.ww = ww;
    this.wh = wh;
    this.n = w * h;
    this.windowPixels = ww * wh;
    this.windows = (w - ww + 1) * (h - wh + 1);
    this.counts = new Uint8Array(this.n);
    this.history = new Uint8Array(SPAN * this.n);
    this.upSat = new Float64Array((w + 1) * (h + 1));
    this.downSat = new Float64Array((w + 1) * (h + 1));
    this.sat = new Float64Array((w + 1) * (h + 1));
    this.level = new Uint8Array(this.n);
    this.runSum = new Float32Array(this.windows);
    this.runSign = new Int8Array(this.windows);
    this.runDone = new Uint8Array(this.windows);
    this.zeros = new Uint8Array(this.windows);
    this.lastDir = new Int8Array(this.windows);
    this.windowCounts = new Uint8Array(this.windows);
    this.windowHistory = new Uint8Array(SPAN * this.windows);
  }

  push(events: Uint8Array, frame: number): void {
    const slot = (frame % SPAN) * this.n;
    for (let p = 0; p < this.n; p++) {
      if (this.history[slot + p]) this.counts[p]--;
      this.history[slot + p] = events[p];
      if (events[p]) this.counts[p]++;
    }
    this.updateNet(events, frame);
    this.updatePixel(frame);
  }

  private updateNet(events: Uint8Array, frame: number): void {
    const { w, h, ww, wh } = this;
    const stride = w + 1;
    for (let y = 0; y < h; y++) {
      let up = 0;
      let down = 0;
      for (let x = 0; x < w; x++) {
        const e = events[y * w + x];
        if (e === UP) up++;
        else if (e === DOWN) down++;
        const i = (y + 1) * stride + x + 1;
        this.upSat[i] = this.upSat[i - stride] + up;
        this.downSat[i] = this.downSat[i - stride] + down;
      }
    }
    const slot = (frame % SPAN) * this.windows;
    for (let y = 0, k = 0; y + wh <= h; y++) {
      const top = y * stride;
      const bottom = (y + wh) * stride;
      for (let x = 0; x + ww <= w; x++, k++) {
        const a = top + x;
        const b = top + x + ww;
        const c = bottom + x;
        const d = bottom + x + ww;
        const up =
          this.upSat[d] - this.upSat[b] - this.upSat[c] + this.upSat[a];
        const down =
          this.downSat[d] - this.downSat[b] - this.downSat[c] + this.downSat[a];
        const net = (up - down) / this.windowPixels;
        let registered = 0;
        if (net === 0) {
          if (this.runSign[k] !== 0 && ++this.zeros[k] >= 6) {
            this.runSign[k] = 0;
            this.runSum[k] = 0;
            this.runDone[k] = 0;
          }
        } else {
          const sign = net > 0 ? 1 : -1;
          if (sign !== this.runSign[k]) {
            this.runSign[k] = sign;
            this.runSum[k] = 0;
            this.runDone[k] = 0;
          }
          this.zeros[k] = 0;
          this.runSum[k] = Math.min(1, this.runSum[k] + Math.abs(net));
          if (this.runSum[k] > this.net.area) this.net.area = this.runSum[k];
          if (
            !this.runDone[k] &&
            this.runSum[k] > 0.25 &&
            this.lastDir[k] !== sign
          ) {
            this.runDone[k] = 1;
            this.lastDir[k] = sign;
            registered = 1;
          }
        }
        if (this.windowHistory[slot + k]) this.windowCounts[k]--;
        this.windowHistory[slot + k] = registered;
        if (registered) {
          this.windowCounts[k]++;
          const rate = this.windowCounts[k] / 2;
          if (rate > this.net.rate) {
            this.net.rate = rate;
            this.net.atFrame = frame;
            this.net.window = { x, y };
          }
        }
      }
    }
  }

  private updatePixel(frame: number): void {
    let maxCount = 0;
    for (let p = 0; p < this.n; p++) {
      if (this.counts[p] > maxCount) maxCount = this.counts[p];
    }
    if (maxCount === 0) return;
    const limit = 0.25 * this.windowPixels;
    const coverage = (m: number) => {
      for (let p = 0; p < this.n; p++)
        this.level[p] = this.counts[p] >= m ? 1 : 0;
      return maxWindowSum(
        this.level,
        this.w,
        this.h,
        this.ww,
        this.wh,
        this.sat
      );
    };
    if (maxCount >= 7) {
      const at7 = coverage(7);
      const area = at7.sum / this.windowPixels;
      if (area > this.pixel.area) this.pixel.area = area;
    }
    // the largest m whose pixels cover more than 25% of some window; only an m above the best so far matters
    const bestM = this.pixel.rate * 2;
    let lo = bestM;
    let hi = maxCount;
    let found: { sum: number; x: number; y: number } | null = null;
    while (lo < hi) {
      const mid = Math.ceil((lo + hi) / 2);
      const best = coverage(mid);
      if (best.sum > limit) {
        lo = mid;
        found = best;
      } else {
        hi = mid - 1;
      }
    }
    if (found) {
      this.pixel.rate = lo / 2;
      this.pixel.atFrame = frame;
      this.pixel.window = { x: found.x, y: found.y };
    }
  }
}

/** screens RGB frames for WCAG 2.3.1 general and red flashes; see the flash audit plan for the method */
export class FlashDetector {
  private readonly width: number;
  private readonly height: number;
  private readonly n: number;
  private readonly ww: number;
  private readonly wh: number;
  private frame = 0;
  private readonly general: TransitionStats;
  private readonly red: TransitionStats;
  private readonly sat: Float64Array;
  private readonly events: Uint8Array;
  private readonly redEvents: Uint8Array;
  private readonly lumMin: Float32Array;
  private readonly lumMax: Float32Array;
  private readonly anchor: Float32Array;
  private readonly lastDir: Int8Array;
  private readonly chromaU: Float64Array;
  private readonly chromaV: Float64Array;
  private readonly prevU: Float64Array;
  private readonly prevV: Float64Array;
  private readonly prevData: Uint8Array;
  private readonly prevSaturated: Uint8Array;
  private readonly anchorSat: Uint8Array;
  private readonly prevTouched: Uint8Array;
  /** u′v′ step per frame in PATH_SCALE units, SATURATED_BIT set when the pixel is saturated red */
  private readonly redHistory: Uint16Array;
  private readonly pathUnits: Uint32Array;
  private readonly satFrames: Uint8Array;
  private readonly redLevel: Float32Array;
  private generalVolume: Volume = {
    value: 0,
    atFrame: 0,
    window: { x: 0, y: 0 },
  };
  private redVolume: Volume = { value: 0, atFrame: 0, window: { x: 0, y: 0 } };

  constructor(
    width: number,
    height: number,
    opts: { windowW?: number; windowH?: number } = {}
  ) {
    this.width = width;
    this.height = height;
    this.n = width * height;
    this.ww = Math.min(opts.windowW ?? 341, width);
    this.wh = Math.min(opts.windowH ?? 256, height);
    this.general = new TransitionStats(width, height, this.ww, this.wh);
    this.red = new TransitionStats(width, height, this.ww, this.wh);
    this.sat = new Float64Array((width + 1) * (height + 1));
    this.events = new Uint8Array(this.n);
    this.redEvents = new Uint8Array(this.n);
    this.lumMin = new Float32Array(this.n).fill(Infinity);
    this.lumMax = new Float32Array(this.n).fill(-Infinity);
    this.anchor = new Float32Array(this.n);
    this.lastDir = new Int8Array(this.n);
    this.chromaU = new Float64Array(this.n);
    this.chromaV = new Float64Array(this.n);
    this.prevU = new Float64Array(this.n);
    this.prevV = new Float64Array(this.n);
    this.prevData = new Uint8Array(this.n * 3);
    this.prevSaturated = new Uint8Array(this.n);
    this.anchorSat = new Uint8Array(this.n);
    this.prevTouched = new Uint8Array(this.n);
    this.redHistory = new Uint16Array(SPAN * this.n);
    this.pathUnits = new Uint32Array(this.n);
    this.satFrames = new Uint8Array(this.n);
    this.redLevel = new Float32Array(this.n);
  }

  push(frame: Frame): void {
    if (frame.width !== this.width || frame.height !== this.height) {
      throw new Error(
        `frame is ${frame.width}x${frame.height}, detector is ${this.width}x${this.height}`
      );
    }
    const f = this.frame;
    const slot = (f % SPAN) * this.n;
    const { data } = frame;
    const prev = this.prevData;
    for (let p = 0, i = 0; p < this.n; p++, i += 3) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      let step = 0;
      if (f > 0 && r === prev[i] && g === prev[i + 1] && b === prev[i + 2]) {
        // an unchanged pixel can't register a transition or add path
        this.events[p] = 0;
        this.redEvents[p] = 0;
      } else {
        this.events[p] = this.trackLuminance(p, relativeLuminance(r, g, b));
        const [u, v] = chromaticity(r, g, b);
        this.prevSaturated[p] = isSaturatedRed(r, g, b) ? 1 : 0;
        this.redEvents[p] = this.trackRed(
          p,
          u,
          v,
          this.prevSaturated[p] === 1,
          f === 0
        );
        if (f > 0) {
          // rounded up so the bound stays conservative, less float noise so a constant hue stays at 0
          const du = u - this.prevU[p];
          const dv = v - this.prevV[p];
          step = Math.ceil(Math.sqrt(du * du + dv * dv) * PATH_SCALE - 1e-6);
        }
        this.prevU[p] = u;
        this.prevV[p] = v;
      }

      const old = this.redHistory[slot + p];
      if (f >= SPAN) {
        this.pathUnits[p] -= old & ~SATURATED_BIT;
        if (old & SATURATED_BIT) this.satFrames[p]--;
      }
      const saturated = this.prevSaturated[p] === 1;
      this.redHistory[slot + p] = step | (saturated ? SATURATED_BIT : 0);
      this.pathUnits[p] += step;
      if (saturated) this.satFrames[p]++;
    }
    prev.set(data);
    this.general.push(this.events, f);
    this.red.push(this.redEvents, f);
    this.updateVolumes(f);
    this.frame++;
  }

  private trackLuminance(p: number, value: number): number {
    const dir = this.lastDir[p];
    if (dir === 0) {
      if (value < this.lumMin[p]) this.lumMin[p] = value;
      if (value > this.lumMax[p]) this.lumMax[p] = value;
      if (this.lumMax[p] - this.lumMin[p] >= 0.1 && this.lumMin[p] < 0.8) {
        const up = value === this.lumMax[p];
        this.lastDir[p] = up ? 1 : -1;
        this.anchor[p] = value;
        return up ? UP : DOWN;
      }
      return 0;
    }
    const anchor = this.anchor[p];
    if (dir === 1) {
      if (value > anchor) this.anchor[p] = value;
      else if (anchor - value >= 0.1 && value < 0.8) {
        this.anchor[p] = value;
        this.lastDir[p] = -1;
        return DOWN;
      }
    } else {
      if (value < anchor) this.anchor[p] = value;
      else if (value - anchor >= 0.1 && anchor < 0.8) {
        this.anchor[p] = value;
        this.lastDir[p] = 1;
        return UP;
      }
    }
    return 0;
  }

  private trackRed(
    p: number,
    u: number,
    v: number,
    saturated: boolean,
    first: boolean
  ): number {
    if (first) {
      this.chromaU[p] = u;
      this.chromaV[p] = v;
      this.anchorSat[p] = saturated ? 1 : 0;
      return 0;
    }
    const du = u - this.chromaU[p];
    const dv = v - this.chromaV[p];
    if (du * du + dv * dv <= 0.04) return 0;
    const touched = this.anchorSat[p] === 1 || saturated;
    const counts = touched || this.prevTouched[p] === 1;
    this.prevTouched[p] = touched ? 1 : 0;
    this.chromaU[p] = u;
    this.chromaV[p] = v;
    this.anchorSat[p] = saturated ? 1 : 0;
    if (!counts) return 0;
    return saturated ? UP : DOWN;
  }

  private updateVolumes(f: number): void {
    const windowPixels = this.ww * this.wh;
    const general = maxWindowSum(
      this.general.counts,
      this.width,
      this.height,
      this.ww,
      this.wh,
      this.sat
    );
    const generalValue = general.sum / windowPixels;
    if (generalValue > this.generalVolume.value) {
      this.generalVolume = {
        value: generalValue,
        atFrame: f,
        window: { x: general.x, y: general.y },
      };
    }
    for (let p = 0; p < this.n; p++) {
      this.redLevel[p] =
        this.satFrames[p] > 0 ? this.pathUnits[p] / PATH_SCALE / 0.2 : 0;
    }
    const red = maxWindowSum(
      this.redLevel,
      this.width,
      this.height,
      this.ww,
      this.wh,
      this.sat
    );
    const redValue = red.sum / windowPixels;
    if (redValue > this.redVolume.value) {
      this.redVolume = {
        value: redValue,
        atFrame: f,
        window: { x: red.x, y: red.y },
      };
    }
  }

  result(): FlashResult {
    return {
      general: {
        net: { ...this.general.net },
        pixel: { ...this.general.pixel },
        volume: { ...this.generalVolume },
      },
      red: {
        net: { ...this.red.net },
        pixel: { ...this.red.pixel },
        volume: { ...this.redVolume },
      },
    };
  }
}
