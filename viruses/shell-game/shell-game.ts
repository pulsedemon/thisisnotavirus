import './shell-game.scss';
import { shuffle } from '../../utils/misc';
import { randomFloat, randomItem } from '../../utils/random';

type Grid = [cols: number, rows: number];
type Kind = 'open' | 'peek' | 'swap' | 'multiply' | 'lift' | 'hold' | 'close';
type Edge = 'near' | 'left' | 'right';

interface Spot {
  u: number;
  v: number;
}

interface Point {
  x: number;
  y: number;
}

interface Cap {
  from: Spot;
  to: Spot;
  bulge: number;
  growing: boolean;
  rebornAt: number;
}

interface Item {
  cap: Cap;
  u: number;
  v: number;
  x: number;
  y: number;
  radius: number;
  lift: number;
  struck: boolean;
}

interface Hole {
  edge: Edge;
  /** the ragged line across the board, rim to rim. */
  rip: Spot[];
  /** the rip closed along the rim it takes, pushed past the edge so the rim's outline goes too. */
  outline: Spot[];
  grab: Spot;
}

interface Hand {
  hole: Hole;
  born: number;
  drift: number;
  spin: number;
  mirror: number;
  /** caps carried off on the torn piece, set once the hand rips it loose. */
  riding?: Item[];
}

interface Sinking {
  item: Item;
  born: number;
}

interface Watcher {
  x: number;
  y: number;
  half: number;
  wake: number;
  blinkEvery: number;
  blinkAt: number;
  blinking: boolean;
}

interface Ticker {
  baseline: number;
  band: number;
  speed: number;
  scroll: number;
  color: string;
  values: number[];
}

interface Shard {
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  spin: number;
  length: number;
  color: string;
}

interface Blast {
  x: number;
  y: number;
  radius: number;
  born: number;
  shards: Shard[];
}

interface FallingCoin {
  x: number;
  y: number;
  radius: number;
  fall: number;
  drift: number;
  spin: number;
  spinRate: number;
  filled: boolean;
}

const AMBER = '#ffa028';
const DIM_AMBER = '#5c3a0e';
const RED = '#ff2a12';
const TICKER_AMBER = '#7a4c12';
const TICKER_RED = '#8a1f10';
const FLASH = '#3a0800';
const LASER_CORE = '#ffd8c8';
const LASER_MS = 200;
const BLAST_MS = 700;
/** a blast on a shuffled cap is big enough to be a WCAG 2.3.1 flash, so potshots land under three a second. */
const POTSHOT_GAP_MS = 350;
const EDGES: Edge[] = ['near', 'left', 'right'];
const REACH_MS = 450;
const GRIP_MS = 150;
const PULL_MS = 700;
const SINK_MS = 450;
const TICK = 10;
const LANDSCAPE_GRIDS: Grid[] = [
  [3, 1],
  [3, 2],
  [4, 3],
  [6, 4],
];
const PORTRAIT_GRIDS: Grid[] = [
  [3, 1],
  [3, 2],
  [3, 4],
  [4, 6],
];
const ROUNDS = [
  { swaps: 3, ms: 300 },
  { swaps: 3, ms: 220 },
  { swaps: 3, ms: 160 },
  { swaps: 4, ms: 120 },
];
const step = (kind: Kind, ms: number) => ({ kind, ms });
const SCRIPT = [
  step('open', 300),
  step('peek', 1000),
  ...ROUNDS.flatMap(({ swaps, ms }, round) => [
    ...(round > 0 ? [step('multiply', 350)] : []),
    ...Array.from({ length: swaps }, () => step('swap', ms)),
  ]),
  step('lift', 500),
  step('hold', 1300),
  step('close', 700),
];
const LIFT_AT = SCRIPT.slice(
  0,
  SCRIPT.findIndex(({ kind }) => kind === 'lift')
).reduce((total, { ms }) => total + ms, 0);
const OPENING_BLINKS = [false, true, false, false, true, true];
const CLOSING_BLINKS = [true, false, true, true, false, true, false, false];
/** bloodshot veins creeping in from the corners, in units of the eye's half-width. */
const VEINS = [-1, 1].flatMap(side =>
  Array.from({ length: 3 }, (_, vein) => {
    let y = (vein - 1) * 0.12;
    return Array.from({ length: 5 }, (_, step) => {
      const point = { x: side * (0.98 - step * 0.13), y };
      y += randomFloat(-0.08, 0.08);
      return point;
    });
  })
);

const canvas = document.querySelector('canvas')!;
const ctx = canvas.getContext('2d')!;
let width = 0;
let height = 0;
let pixelRatio = 1;
let animationId = 0;
let bed = { top: 0, bottom: 0, near: 0, far: 0, depth: 0 };
let eye = {
  x: 0,
  y: 0,
  half: 0,
  apexY: 0,
  capstone: 0,
  haloY: 0,
  haloRadius: 0,
};
let watchers: Watcher[] = [];
let tickers: Ticker[] = [];
let rain: FallingCoin[] = [];
let coinsOwed = 0;
let lastFrame = performance.now();
let grid = 0;
let shape: Grid;
let previousShape: Grid;
let caps: Cap[];
let coinCap: Cap;
let stepIndex = 0;
let stepStart = performance.now();
let cycleStart = stepStart;
const gaze = { x: 0, y: 0 };
let squint = 0;
let laser: { cap: Cap; firedAt: number } | undefined;
let blasts: Blast[] = [];
let lastBlast = Number.NEGATIVE_INFINITY;
let holes: Hole[] = [];
let hands: Hand[] = [];
let sinking: Sinking[] = [];

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp01 = (n: number) => Math.min(1, Math.max(0, n));
const ease = (p: number) => 0.5 - Math.cos(Math.PI * p) / 2;
// rounding leaves pop(0) a hair below 0, which ellipse() rejects.
const pop = (p: number) =>
  Math.max(0, 1 + 2.7 * (p - 1) ** 3 + 1.7 * (p - 1) ** 2);
const blink = (pattern: boolean[], p: number) =>
  pattern[Math.min(pattern.length - 1, Math.floor(p * pattern.length))];

function grids() {
  return height > width ? PORTRAIT_GRIDS : LANDSCAPE_GRIDS;
}

function spots([cols, rows]: Grid): Spot[] {
  return Array.from({ length: cols * rows }, (_, index) => ({
    u: ((index % cols) + 0.5) / cols,
    v: (Math.floor(index / cols) + 0.5) / rows,
  }));
}

/** foreshortened, so rows bunch up toward the far edge. */
function project(u: number, v: number) {
  const depth = v / (2 - v);
  const span = lerp(bed.far, bed.near, depth);
  return {
    x: width / 2 + (u - 0.5) * span,
    y: lerp(bed.top, bed.bottom, depth),
    scale: span / bed.near,
  };
}

/** a point on the pyramid's left (-1) or right (1) edge, `along` from the apex to the board. */
function edge(direction: number, along: number) {
  return {
    x: width / 2 + (direction * bed.far * along) / 2,
    y: lerp(eye.apexY, bed.top, along),
  };
}

function radiusFor([cols, rows]: Grid) {
  return Math.min(
    (bed.near / cols) * 0.34,
    ((bed.bottom - bed.top) / rows) * 0.62
  );
}

function begin(kind: Kind) {
  if (kind === 'open') {
    cycleStart = stepStart;
    placeWatchers();
    holes = [];
    grid = 0;
    shape = grids()[0];
    previousShape = shape;
    caps = spots(shape).map(spot => ({
      from: spot,
      to: spot,
      bulge: 0,
      growing: false,
      rebornAt: Number.NEGATIVE_INFINITY,
    }));
    coinCap = caps[1];
  } else if (kind === 'swap') {
    const order = shuffle([...caps]);
    const bulge = 0.5 / shape[1];
    for (let index = 0; index + 1 < order.length; index += 2) {
      const [a, b] = [order[index], order[index + 1]];
      a.to = b.from;
      b.to = a.from;
      // one passes in front and the other behind, so they never collide.
      a.bulge = bulge;
      b.bulge = -bulge;
    }
  } else if (kind === 'multiply') {
    grid++;
    shape = grids()[grid];
    const free = shuffle(spots(shape));
    const whole = free.filter(spot => !torn(spot));
    const parents = [...caps];
    // the doubling also regrows lost caps, as many as the board left whole can hold.
    const children = whole.slice(parents.length).map((spot, index) => {
      const from = parents.length ? parents[index % parents.length].from : spot;
      return {
        from,
        to: from,
        bulge: 0,
        growing: true,
        rebornAt: Number.NEGATIVE_INFINITY,
      };
    });
    caps = [...parents, ...children];
    const order = [...whole, ...free.filter(torn)];
    caps.forEach((cap, index) => {
      cap.to = order[index];
    });
  }
}

function settle(now: number) {
  previousShape = shape;
  caps.forEach(cap => {
    cap.from = cap.to;
    cap.bulge = 0;
    cap.growing = false;
  });
  const landed = caps.filter(cap => torn(cap.to));
  landed.forEach(cap => {
    const { x, y, scale } = project(cap.to.u, cap.to.v);
    const radius = radiusFor(shape) * scale;
    const item = { cap, ...cap.to, x, y, radius, lift: 0, struck: false };
    sinking.push({ item, born: now });
  });
  caps = caps.filter(cap => !landed.includes(cap));
}

function liftOf(cap: Cap, index: number, kind: Kind, p: number) {
  if (kind === 'peek') {
    return cap === coinCap ? clamp01(1.7 * Math.sin(Math.PI * p)) : 0;
  }
  if (kind === 'lift') {
    return ease(clamp01((p - (index / caps.length) * 0.4) / 0.6));
  }
  return kind === 'hold' || kind === 'close' ? 1 : 0;
}

/** keeps watchers off the pyramid, its halo and the board, including caps lifted above the far edge. */
function hidesScene(x: number, y: number, margin: number) {
  const offset = Math.abs(x - width / 2);
  if (Math.hypot(offset, y - eye.haloY) < eye.haloRadius * 1.6 + margin) {
    return true;
  }
  const lifted = radiusFor(grids()[0]) * 2.4;
  if (y > bed.top - lifted - margin && y < bed.bottom + bed.depth + margin) {
    const along = clamp01((y - bed.top) / (bed.bottom - bed.top));
    return offset < lerp(bed.far, bed.near, along) / 2 + lifted / 2 + margin;
  }
  if (y > eye.apexY - margin && y < bed.top) {
    const along = clamp01((y - eye.apexY) / (bed.top - eye.apexY));
    return offset < (bed.far / 2) * along + margin;
  }
  return false;
}

/** a free spot in the dark, clear of the scene and every other watcher. */
function findSpot(ignore?: Watcher) {
  const unit = Math.min(width, height);
  for (let attempt = 0; attempt < 40; attempt++) {
    const half =
      unit *
      (Math.random() < 0.12
        ? randomFloat(0.035, 0.05)
        : randomFloat(0.01, 0.024));
    const x = randomFloat(half * 1.5, width - half * 1.5);
    const y = randomFloat(half * 1.5, height - half * 1.5);
    if (hidesScene(x, y, half * 2.5)) continue;
    const crowded = watchers.some(
      other =>
        other !== ignore &&
        Math.hypot(other.x - x, other.y - y) < (other.half + half) * 1.8
    );
    if (!crowded) return { x, y, half };
  }
  return undefined;
}

function placeWatchers() {
  const count = Math.round((width * height) / 16000);
  watchers = [];
  for (let index = 0; index < count; index++) {
    const spot = findSpot();
    if (!spot) continue;
    watchers.push({
      ...spot,
      wake: randomFloat(0, 0.9),
      blinkEvery: randomFloat(1200, 4000),
      blinkAt: randomFloat(0, 4000),
      blinking: false,
    });
  }
}

/** a rate line that wanders, spikes and drifts back to its baseline, or down the screen while crashing. */
function nextValue(
  values: number[],
  band: number,
  volatility: number,
  crashing: boolean
) {
  const last = values.length ? values[values.length - 1] : 0;
  const drift = crashing ? band * 0.15 : -last * 0.05;
  const spike =
    Math.random() < 0.015 * volatility ? randomFloat(-0.9, 0.9) * band : 0;
  const next =
    last + drift + spike + randomFloat(-1, 1) * band * 0.1 * volatility;
  return Math.max(-band * 1.5, Math.min(band * 1.5, next));
}

function placeTickers() {
  const count = Math.max(6, Math.round(height / 60));
  const band = height / count;
  tickers = Array.from({ length: count }, (_, index) => {
    const values: number[] = [];
    for (let point = 0; point < Math.ceil(width / TICK) + 2; point++) {
      values.push(nextValue(values, band, 1, false));
    }
    return {
      baseline: (index + 0.5) * band,
      band,
      speed: randomFloat(40, 160),
      scroll: 0,
      color: index % 3 === 1 ? TICKER_RED : TICKER_AMBER,
      values,
    };
  });
}

function advanceTickers(
  elapsed: number,
  volatility: number,
  crashing: boolean
) {
  tickers.forEach(ticker => {
    ticker.scroll += (ticker.speed * elapsed) / 1000;
    while (ticker.scroll >= TICK) {
      ticker.scroll -= TICK;
      ticker.values.shift();
      ticker.values.push(
        nextValue(ticker.values, ticker.band, volatility, crashing)
      );
    }
  });
}

function drawTickers() {
  ctx.lineWidth = 1;
  tickers.forEach(({ baseline, scroll, color, values }) => {
    ctx.strokeStyle = color;
    ctx.beginPath();
    values.forEach((value, index) => {
      ctx.lineTo(index * TICK - scroll, baseline + value);
    });
    ctx.stroke();
  });
}

/** money printed faster as the caps multiply, poured out during the crash. */
function rainCoins(elapsed: number, progress: number, crashing: boolean) {
  const unit = Math.min(width, height);
  coinsOwed += (elapsed / 1000) * (crashing ? 90 : lerp(3, 60, progress ** 2));
  for (; coinsOwed >= 1; coinsOwed--) {
    const radius = unit * randomFloat(0.006, 0.02);
    rain.push({
      x: randomFloat(0, width),
      y: -radius,
      radius,
      fall: unit * randomFloat(0.08, 0.28),
      drift: randomFloat(-20, 20),
      spin: randomFloat(0, Math.PI),
      spinRate: randomFloat(4, 14),
      filled: Math.random() < 0.3,
    });
  }
  const speedUp = crashing ? 2.5 : 1;
  rain.forEach(coin => {
    coin.y += (coin.fall * speedUp * elapsed) / 1000;
    coin.x += (coin.drift * elapsed) / 1000;
    coin.spin += (coin.spinRate * elapsed) / 1000;
  });
  rain = rain.filter(coin => coin.y < height + coin.radius).slice(-400);
}

/** tumbling end over end, so each coin flattens to an edge and back. */
function drawRain() {
  ctx.lineWidth = 1;
  ctx.strokeStyle = TICKER_AMBER;
  ctx.fillStyle = DIM_AMBER;
  rain.forEach(({ x, y, radius, spin, filled }) => {
    const flat = Math.max(0.08, Math.abs(Math.cos(spin)));
    ctx.beginPath();
    ctx.ellipse(x, y, radius, radius * flat, 0, 0, Math.PI * 2);
    if (filled) ctx.fill();
    ctx.stroke();
  });
}

/** tears the finished frame into slices shifted sideways. */
function glitch() {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  for (let slice = 0; slice < 8; slice++) {
    const sliceHeight = randomFloat(3, 36) * pixelRatio;
    const y = randomFloat(0, canvas.height - sliceHeight);
    ctx.drawImage(
      canvas,
      0,
      y,
      canvas.width,
      sliceHeight,
      randomFloat(-50, 50) * pixelRatio,
      y,
      canvas.width,
      sliceHeight
    );
  }
}

function line(x0: number, y0: number, x1: number, y1: number) {
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
}

function trace(points: Point[]) {
  points.forEach(({ x, y }, index) => {
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
}

function traceAlmond(
  x: number,
  y: number,
  half: number,
  upper: number,
  lower: number
) {
  ctx.beginPath();
  ctx.moveTo(x - half, y);
  ctx.quadraticCurveTo(x, y - upper, x + half, y);
  ctx.quadraticCurveTo(x, y + lower, x - half, y);
}

function drawIris(x: number, y: number, half: number, slit: number) {
  ctx.fillStyle = RED;
  ctx.beginPath();
  ctx.arc(x, y, half * 0.34, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.ellipse(x, y, half * slit, half * 0.3, 0, 0, Math.PI * 2);
  ctx.fill();
}

/** where a beam lands on a cap, lifted or not. */
function domeY({ y, radius, lift }: Item) {
  return y - lift * radius * 1.5 - radius * 0.4;
}

function drawWatcher(
  { x, y, half }: Watcher,
  openness: number,
  target: Item | undefined
) {
  traceAlmond(
    x,
    y,
    half,
    half * lerp(0.6, 0.3, squint) * openness,
    half * lerp(0.7, 0.2, squint) * openness
  );
  ctx.fillStyle = '#000';
  ctx.fill();
  ctx.stroke();
  ctx.save();
  ctx.clip();
  const distance = target ? Math.hypot(target.x - x, target.y - y) : 0;
  drawIris(
    x + (target ? ((target.x - x) / distance) * half * 0.4 : 0),
    y + (target ? ((target.y - y) / distance) * half * 0.15 : 0),
    half,
    lerp(0.08, 0.04, squint)
  );
  ctx.restore();
}

/** they wake one by one as the caps multiply, and outlast the eye when the board goes dark. */
function drawWatchers(
  now: number,
  kind: Kind,
  remaining: number,
  target: Item | undefined
) {
  ctx.strokeStyle = DIM_AMBER;
  ctx.lineWidth = 1;
  watchers.forEach(watcher => {
    const blinking = (now + watcher.blinkAt) % watcher.blinkEvery < 140;
    // every blink reopens somewhere else, so they never settle into a frame.
    if (blinking && !watcher.blinking) {
      Object.assign(watcher, findSpot(watcher));
    }
    watcher.blinking = blinking;
    let openness = clamp01((now - cycleStart - watcher.wake * LIFT_AT) / 150);
    if (kind === 'close') openness = clamp01((remaining - 140) / 150);
    if (blinking) openness = 0;
    if (openness > 0) drawWatcher(watcher, openness, target);
  });
}

/** the dollar bill's floating capstone: the board is the pyramid, and the eye follows the money. */
function drawEye(open: boolean, target: Item | undefined, now: number) {
  const capLeft = edge(-1, eye.capstone);
  const capRight = edge(1, eye.capstone);
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.moveTo(eye.x, eye.apexY);
  ctx.lineTo(width / 2 + bed.far / 2, bed.top);
  ctx.lineTo(width / 2 - bed.far / 2, bed.top);
  ctx.fill();
  ctx.strokeStyle = AMBER;
  ctx.lineWidth = Math.max(1.5, eye.half * 0.035);
  ctx.beginPath();
  ctx.moveTo(eye.x, eye.apexY);
  ctx.lineTo(capRight.x, capRight.y);
  ctx.lineTo(capLeft.x, capLeft.y);
  ctx.closePath();
  if (open) {
    for (const direction of [-1, 1]) {
      const top = edge(direction, eye.capstone + 0.05);
      const bottom = edge(direction, 1);
      line(top.x, top.y, bottom.x, bottom.y);
    }
  }
  ctx.stroke();

  if (open) {
    ctx.strokeStyle = squint > 0.5 ? RED : AMBER;
    ctx.beginPath();
    for (let ray = 0; ray < 32; ray++) {
      const angle = (ray / 32) * Math.PI * 2;
      // rays pointing down would cut across the pyramid.
      if (Math.abs(angle - Math.PI / 2) < 1.3) continue;
      const flare = 0.1 * Math.sin(now / 140 + ray * 2.1) + 0.3 * squint;
      const outer = eye.haloRadius * (1.16 + flare);
      line(
        eye.x + Math.cos(angle) * eye.haloRadius,
        eye.haloY + Math.sin(angle) * eye.haloRadius,
        eye.x + Math.cos(angle) * outer,
        eye.haloY + Math.sin(angle) * outer
      );
    }
    ctx.stroke();
    ctx.strokeStyle = AMBER;
  }

  const { x, y, half } = eye;
  if (!open) {
    ctx.beginPath();
    ctx.moveTo(x - half, y);
    ctx.quadraticCurveTo(x, y + half * 0.4, x + half, y);
    ctx.stroke();
    return;
  }
  const aimX = target ? clamp01((target.x - x) / bed.far + 0.5) * 2 - 1 : 0;
  gaze.x += (aimX * half * 0.45 - gaze.x) * 0.3;
  gaze.y += ((target ? half * 0.1 : 0) - gaze.y) * 0.3;
  const upperLid = half * lerp(0.55, 0.3, squint);
  traceAlmond(x, y, half, upperLid, half * lerp(0.75, 0.2, squint));
  ctx.stroke();
  ctx.save();
  ctx.clip();
  ctx.strokeStyle = RED;
  ctx.lineWidth = Math.max(1, half * 0.02);
  ctx.beginPath();
  VEINS.forEach(vein => {
    vein.forEach((point, index) => {
      if (index === 0) ctx.moveTo(x + point.x * half, y + point.y * half);
      else ctx.lineTo(x + point.x * half, y + point.y * half);
    });
  });
  ctx.stroke();
  drawIris(x + gaze.x, y + gaze.y, half, lerp(0.06, 0.025, squint));
  ctx.restore();

  // a heavy lid crease reads as a scowl without drawing a brow.
  ctx.beginPath();
  ctx.moveTo(x - half * 1.05, y - half * 0.08);
  ctx.quadraticCurveTo(
    x,
    y - upperLid - half * 0.45,
    x + half * 1.05,
    y - half * 0.08
  );
  ctx.stroke();
}

/** twice the cap grid, so every cap sits on an intersection and the board splits when they do. */
function drawBed() {
  const left = width / 2 - bed.near / 2;
  const right = width / 2 + bed.near / 2;
  const cols = shape[0] * 2;
  const rows = shape[1] * 2;
  const traceOutline = () => {
    ctx.beginPath();
    ctx.moveTo(width / 2 - bed.far / 2, bed.top);
    ctx.lineTo(width / 2 + bed.far / 2, bed.top);
    ctx.lineTo(right, bed.bottom);
    ctx.lineTo(right, bed.bottom + bed.depth);
    ctx.lineTo(left, bed.bottom + bed.depth);
    ctx.lineTo(left, bed.bottom);
    ctx.closePath();
  };
  ctx.fillStyle = '#000';
  traceOutline();
  ctx.fill();
  ctx.strokeStyle = DIM_AMBER;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let col = 1; col < cols; col++) {
    const far = project(col / cols, 0);
    const near = project(col / cols, 1);
    line(far.x, far.y, near.x, near.y);
  }
  for (let row = 1; row < rows; row++) {
    const start = project(0, row / rows);
    const end = project(1, row / rows);
    line(start.x, start.y, end.x, end.y);
  }
  ctx.stroke();
  ctx.strokeStyle = AMBER;
  ctx.lineWidth = 1.5;
  traceOutline();
  line(left, bed.bottom, right, bed.bottom);
  ctx.stroke();
}

/** `along` runs down an edge and `into` points in from its rim, both in board units. */
function onEdge(edge: Edge, along: number, into: number): Spot {
  if (edge === 'near') return { u: along, v: 1 - into };
  return { u: edge === 'left' ? into : 1 - into, v: along };
}

function ripFrom(edge: Edge): Hole {
  const span = randomFloat(0.18, 0.34);
  const start = randomFloat(0.08, 0.92 - span);
  const bite = randomFloat(0.15, 0.38);
  const rip = Array.from({ length: 11 }, (_, index) => {
    const s = index / 10;
    if (index === 0 || index === 10) return onEdge(edge, start + span * s, 0);
    return onEdge(
      edge,
      start + span * s + randomFloat(-0.015, 0.015),
      bite * Math.sin(Math.PI * s) ** 0.6 + randomFloat(-0.03, 0.03)
    );
  });
  const outline = [
    onEdge(edge, start, -0.03),
    ...rip,
    onEdge(edge, start + span, -0.03),
  ];
  // clipping to every hole at once only unions them when they all wind clockwise.
  if (edge === 'right') outline.reverse();
  return { edge, rip, outline, grab: onEdge(edge, start + span / 2, 0.1) };
}

/** even-odd point-in-polygon, in board units. */
function inside(polygon: Spot[], { u, v }: Spot) {
  let hit = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [a, b] = [polygon[i], polygon[j]];
    if (
      a.v > v !== b.v > v &&
      u < ((b.u - a.u) * (v - a.v)) / (b.v - a.v) + a.u
    ) {
      hit = !hit;
    }
  }
  return hit;
}

const turn = (a: Spot, b: Spot, c: Spot) =>
  Math.sign((b.u - a.u) * (c.v - a.v) - (b.v - a.v) * (c.u - a.u));

/** outlines overlap when a side of one crosses a side of the other, or one holds the other whole. */
function overlaps(a: Spot[], b: Spot[]) {
  const sides = (polygon: Spot[]): [Spot, Spot][] =>
    polygon.map((spot, index) => [spot, polygon[(index + 1) % polygon.length]]);
  return (
    inside(a, b[0]) ||
    inside(b, a[0]) ||
    sides(a).some(([p, q]) =>
      sides(b).some(
        ([r, s]) =>
          turn(p, q, r) !== turn(p, q, s) && turn(r, s, p) !== turn(r, s, q)
      )
    )
  );
}

const torn = (spot: Spot) => holes.some(hole => inside(hole.outline, spot));
const onScreen = (spots: Spot[]) => spots.map(({ u, v }) => project(u, v));

/** a hole through the near rim takes the board's front face below it too. */
function holeShape({ edge, outline }: Hole) {
  const points: Point[] = onScreen(outline);
  if (edge === 'near') {
    const floor = bed.bottom + bed.depth + 3;
    points.push(
      { x: points[points.length - 1].x, y: floor },
      { x: points[0].x, y: floor }
    );
  }
  return points;
}

function traceRip({ edge, rip }: Hole) {
  const points = onScreen(rip);
  trace(points);
  if (edge === 'near') {
    for (const { x } of [points[0], points[points.length - 1]]) {
      line(x, bed.bottom, x, bed.bottom + bed.depth);
    }
  }
}

/** repaints what's behind the board inside every hole, which also erases torn edges a later hole took. */
function drawHoles(now: number, background: string) {
  if (!holes.length) return;
  ctx.strokeStyle = AMBER;
  // the inner half of this lands in the hole and gets painted over.
  ctx.lineWidth = 3;
  ctx.beginPath();
  holes.forEach(traceRip);
  ctx.stroke();
  ctx.save();
  ctx.beginPath();
  holes.forEach(hole => {
    trace(holeShape(hole));
    ctx.closePath();
  });
  ctx.clip();
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, width, height);
  drawTickers();
  drawRain();
  sinking.forEach(({ item, born }) => {
    const p = (now - born) / SINK_MS;
    drawCap({ ...item, y: item.y + item.radius * 2.5 * p * p });
  });
  ctx.restore();
}

/** reaching along `angle` with its fingertips at `tip`; `grip` hooks the fingers in. */
function drawHand(tip: Point, angle: number, grip: number, mirror: number) {
  const palm = Math.min(width, height) * 0.19;
  const finger = palm * 0.19;
  const reach = palm * 1.1;
  const outline = Math.max(1.5, palm * 0.03);
  ctx.save();
  ctx.translate(tip.x, tip.y);
  ctx.rotate(angle);
  ctx.scale(1, mirror);
  // gripping shortens the outer bones, as if they bend away over the rim.
  const bones = [
    { share: 0.45, bend: 0 },
    { share: 0.32, bend: 0.4 },
    { share: 0.23, bend: 0.7 },
  ];
  // the hand leans in by what the middle finger loses, so the fingertips stay on the board.
  const lean = bones.reduce((sum, { share, bend }) => sum + share * bend, 0);
  ctx.translate(reach * lean * grip, 0);
  ctx.lineCap = 'round';
  // each bone is a fat amber stroke with a thinner black one inside, and the next bone's outline draws
  // the joint.
  const digit = (
    base: Point,
    length: number,
    heading: number,
    curl: number,
    thickness: number
  ) => {
    let { x, y } = base;
    bones.forEach(({ share, bend }, bone) => {
      const bent = length * share * (1 - grip * bend);
      const end = {
        x: x + Math.cos(heading) * bent,
        y: y + Math.sin(heading) * bent,
      };
      const girth = thickness * (1 - bone * 0.18);
      ctx.beginPath();
      line(x, y, end.x, end.y);
      ctx.strokeStyle = AMBER;
      ctx.lineWidth = girth;
      ctx.stroke();
      ctx.strokeStyle = '#000';
      ctx.lineWidth = girth - outline * 2;
      ctx.stroke();
      ({ x, y } = end);
      heading += curl;
    });
  };
  [0.85, 1, 0.95, 0.75].forEach((length, index) => {
    const side = index - 1.5;
    digit(
      { x: -reach, y: side * finger * 1.1 },
      reach * length,
      side * lerp(0.18, 0.05, grip),
      -Math.sign(side) * lerp(0.1, 0.04, grip),
      finger
    );
  });
  digit(
    { x: -reach - palm * 0.5, y: palm * 0.4 },
    reach * 0.7,
    lerp(1.1, 0.7, grip),
    -lerp(0.25, 0.4, grip),
    finger * 1.15
  );

  // the palm and forearm run back off-screen, covering the roots of the fingers and thumb.
  const wrist = -reach - palm * 0.95;
  const arm = Math.max(width, height);
  ctx.beginPath();
  ctx.moveTo(-reach, -palm * 0.5);
  ctx.quadraticCurveTo(-reach + finger * 0.9, 0, -reach, palm * 0.5);
  ctx.quadraticCurveTo(wrist + palm * 0.4, palm * 0.56, wrist, palm * 0.34);
  ctx.lineTo(wrist - arm, palm * 0.4);
  ctx.lineTo(wrist - arm, -palm * 0.4);
  ctx.lineTo(wrist, -palm * 0.34);
  ctx.quadraticCurveTo(wrist + palm * 0.4, -palm * 0.56, -reach, -palm * 0.5);
  ctx.closePath();
  ctx.fillStyle = '#000';
  ctx.fill();
  ctx.strokeStyle = AMBER;
  ctx.lineWidth = outline;
  ctx.stroke();
  ctx.strokeStyle = DIM_AMBER;
  ctx.beginPath();
  for (let index = 0; index < 4; index++) {
    const side = index - 1.5;
    line(
      -reach - finger * 0.5,
      side * finger * 1.1,
      wrist + palm * 0.15,
      side * palm * 0.08
    );
  }
  ctx.stroke();
  ctx.restore();
}

/** a hand lunges in from off-screen, grips the rim, then drags the torn piece back out with it. */
function drawSnatch(hand: Hand, now: number) {
  const age = now - hand.born;
  const grab = project(hand.hole.grab.u, hand.hole.grab.v);
  const away = Math.max(width, height) * 0.45;
  const start =
    hand.hole.edge === 'near'
      ? { x: grab.x + hand.drift, y: height + away }
      : {
          x: hand.hole.edge === 'left' ? -away : width + away,
          y: grab.y + hand.drift,
        };
  const pull = clamp01((age - REACH_MS - GRIP_MS) / PULL_MS);
  const t = age < REACH_MS ? 1 - (1 - age / REACH_MS) ** 2 : 1 - pull ** 2;
  const tip = { x: lerp(start.x, grab.x, t), y: lerp(start.y, grab.y, t) };
  if (hand.riding) {
    ctx.save();
    ctx.translate(tip.x, tip.y);
    ctx.rotate(hand.spin * pull);
    ctx.translate(-grab.x, -grab.y);
    ctx.save();
    ctx.beginPath();
    trace(holeShape(hand.hole));
    ctx.clip();
    drawBed();
    ctx.restore();
    hand.riding.forEach(drawCap);
    ctx.strokeStyle = AMBER;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    traceRip(hand.hole);
    ctx.stroke();
    ctx.restore();
  }
  drawHand(
    tip,
    Math.atan2(grab.y - start.y, grab.x - start.x),
    clamp01((age - REACH_MS) / GRIP_MS),
    hand.mirror
  );
}

/** solid amber, unlike the line-art caps it hides under. */
function drawCoin({ x, y, radius }: Item, now: number) {
  const coinX = radius * 0.34;
  const coinY = coinX * 0.45;
  ctx.fillStyle = AMBER;
  ctx.strokeStyle = '#000';
  ctx.lineWidth = Math.max(1, radius * 0.03);
  ctx.beginPath();
  ctx.ellipse(x, y, coinX, coinY, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(x, y, coinX * 0.68, coinY * 0.68, 0, 0, Math.PI * 2);
  ctx.stroke();

  const glint = coinX * (0.45 + 0.25 * Math.sin(now / 90));
  const glintX = x + coinX * 0.9;
  const glintY = y - coinY * 1.8;
  ctx.beginPath();
  ctx.moveTo(glintX, glintY - glint);
  ctx.lineTo(glintX + glint * 0.18, glintY);
  ctx.lineTo(glintX, glintY + glint);
  ctx.lineTo(glintX - glint * 0.18, glintY);
  ctx.closePath();
  ctx.moveTo(glintX - glint, glintY);
  ctx.lineTo(glintX, glintY + glint * 0.18);
  ctx.lineTo(glintX + glint, glintY);
  ctx.lineTo(glintX, glintY - glint * 0.18);
  ctx.closePath();
  ctx.fill();
}

/** hollow and stemless, so a lifted cap shows bare gills and nothing else. */
function drawCap({ x, y, radius, lift, struck }: Item) {
  const dome = radius * 0.8;
  const rim = radius * 0.3;
  const base = y - lift * radius * 1.5;
  const under = base + rim * 1.15;
  const outline = Math.max(1.5, radius * 0.04);
  ctx.strokeStyle = AMBER;
  ctx.fillStyle = '#000';
  if (lift > 0) {
    const gillsY = rim * (1 + lift * 0.7);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(x, base, radius * 0.97, gillsY, 0, 0, Math.PI * 2);
    ctx.fill();
    for (let gill = 0; gill < 24; gill++) {
      const cos = Math.cos((gill / 24) * Math.PI * 2);
      const sin = Math.sin((gill / 24) * Math.PI * 2);
      line(
        x + cos * radius * 0.2,
        base + sin * gillsY * 0.2,
        x + cos * radius * 0.97,
        base + sin * gillsY
      );
    }
    ctx.strokeStyle = RED;
    ctx.stroke();
  }

  ctx.strokeStyle = struck ? RED : AMBER;
  ctx.lineWidth = outline;
  ctx.beginPath();
  ctx.ellipse(x, base, radius, dome, 0, Math.PI, Math.PI * 2);
  ctx.bezierCurveTo(x + radius, base + rim, x + radius * 0.6, under, x, under);
  ctx.bezierCurveTo(
    x - radius * 0.6,
    under,
    x - radius,
    base + rim,
    x - radius,
    base
  );
  ctx.fill();
  ctx.stroke();
  // a button mushroom's edge rolls under, which is what keeps it from reading as a bowl.
  ctx.lineWidth = Math.max(1, outline * 0.6);
  ctx.beginPath();
  ctx.moveTo(x + radius * 0.94, base + rim * 0.15);
  ctx.bezierCurveTo(
    x + radius * 0.8,
    base + rim * 0.75,
    x + radius * 0.45,
    under - rim * 0.3,
    x,
    under - rim * 0.3
  );
  ctx.bezierCurveTo(
    x - radius * 0.45,
    under - rim * 0.3,
    x - radius * 0.8,
    base + rim * 0.75,
    x - radius * 0.94,
    base + rim * 0.15
  );
  ctx.stroke();
}

/** fired from the pupil, so the eye visibly aims before it shoots. */
function drawLaser(item: Item, age: number) {
  const { x, radius } = item;
  const hitY = domeY(item);
  ctx.lineCap = 'round';
  ctx.beginPath();
  line(eye.x + gaze.x, eye.y + gaze.y, x, hitY);
  ctx.strokeStyle = RED;
  ctx.lineWidth = 1 + eye.half * 0.14 * (1 - age);
  ctx.stroke();
  ctx.strokeStyle = LASER_CORE;
  ctx.lineWidth = Math.max(1, eye.half * 0.04 * (1 - age));
  ctx.stroke();
  ctx.beginPath();
  for (let spark = 0; spark < 10; spark++) {
    const angle = randomFloat(0, Math.PI * 2);
    const length = radius * randomFloat(0.2, 0.8);
    line(
      x,
      hitY,
      x + Math.cos(angle) * length,
      hitY + Math.sin(angle) * length * 0.6
    );
  }
  ctx.strokeStyle = RED;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.lineCap = 'butt';
}

function explode(item: Item, now: number) {
  const { x, radius } = item;
  const centerY = domeY(item);
  blasts.push({
    x,
    y: centerY,
    radius,
    born: now,
    shards: Array.from({ length: 16 }, (_, index) => {
      const angle = randomFloat(0, Math.PI * 2);
      const speed = radius * randomFloat(3, 9);
      return {
        x,
        y: centerY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - radius * 4,
        angle: randomFloat(0, Math.PI),
        spin: randomFloat(-12, 12),
        length: radius * randomFloat(0.15, 0.45),
        color: index % 3 ? AMBER : RED,
      };
    }),
  });
  lastBlast = now;
}

function updateBlasts(elapsed: number, now: number) {
  blasts = blasts.filter(blast => now - blast.born < BLAST_MS);
  const seconds = elapsed / 1000;
  blasts.forEach(blast => {
    blast.shards.forEach(shard => {
      shard.x += shard.vx * seconds;
      shard.y += shard.vy * seconds;
      shard.vy += blast.radius * 18 * seconds;
      shard.angle += shard.spin * seconds;
    });
  });
}

/** a white flash, a shock ring and the shell's pieces falling away. */
function drawBlasts(now: number) {
  blasts.forEach(({ x, y, radius, born, shards }) => {
    const age = (now - born) / BLAST_MS;
    ctx.globalAlpha = 1 - age;
    if (age < 0.1) {
      ctx.fillStyle = LASER_CORE;
      ctx.beginPath();
      ctx.ellipse(x, y, radius * 1.2, radius * 0.9, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = RED;
    ctx.lineWidth = Math.max(1, radius * 0.1 * (1 - age));
    ctx.beginPath();
    ctx.ellipse(
      x,
      y,
      radius * (1 + age * 3),
      radius * (0.6 + age * 1.2),
      0,
      0,
      Math.PI * 2
    );
    ctx.stroke();
    ctx.lineWidth = Math.max(1.5, radius * 0.05);
    shards.forEach(shard => {
      const dx = (Math.cos(shard.angle) * shard.length) / 2;
      const dy = (Math.sin(shard.angle) * shard.length) / 2;
      ctx.strokeStyle = shard.color;
      ctx.beginPath();
      line(shard.x - dx, shard.y - dy, shard.x + dx, shard.y + dy);
      ctx.stroke();
    });
  });
  ctx.globalAlpha = 1;
}

function frame(now: number) {
  if (now - stepStart >= SCRIPT[stepIndex].ms) {
    settle(now);
    stepIndex = (stepIndex + 1) % SCRIPT.length;
    stepStart = now;
    begin(SCRIPT[stepIndex].kind);
  }
  const { kind, ms } = SCRIPT[stepIndex];
  const p = Math.min(1, (now - stepStart) / ms);
  const open =
    kind === 'open'
      ? blink(OPENING_BLINKS, p)
      : kind !== 'close' || blink(CLOSING_BLINKS, p);
  const gloating = kind === 'lift' || kind === 'hold' || kind === 'close';
  squint += ((gloating ? 1 : 0) - squint) * 0.12;
  const progress = clamp01((now - cycleStart) / LIFT_AT);
  const watching = kind === 'peek' || kind === 'swap' || kind === 'multiply';
  const elapsed = Math.min(100, now - lastFrame);
  lastFrame = now;
  // potshots during the shuffle, then a barrage into the empty caps while it gloats.
  // the barrage skips the gap because by then the caps are too small to flash.
  const shotsPerSecond = 0.8 + 3.2 * progress;
  const firing =
    kind === 'hold' ||
    ((kind === 'swap' || kind === 'multiply') &&
      now - lastBlast >= POTSHOT_GAP_MS - LASER_MS &&
      Math.random() < (shotsPerSecond * elapsed) / 1000);
  if (!laser && open && firing && caps.length) {
    laser = { cap: randomItem(caps), firedAt: now };
  }
  const shot = laser;
  const t = ease(p);
  const radius = lerp(radiusFor(previousShape), radiusFor(shape), t);
  const items = caps
    .map((cap, index): Item => {
      const u = lerp(cap.from.u, cap.to.u, t);
      const v =
        lerp(cap.from.v, cap.to.v, t) + cap.bulge * Math.sin(Math.PI * t);
      const { x, y, scale } = project(u, v);
      const struck = shot?.cap === cap;
      return {
        cap,
        u,
        v,
        x,
        y,
        radius:
          radius *
          scale *
          (cap.growing ? pop(p) : 1) *
          pop(clamp01((now - cap.rebornAt) / 350)),
        lift: liftOf(cap, index, kind, p) + (struck ? 0.15 : 0),
        struck,
      };
    })
    .sort((a, b) => a.y - b.y);
  // the shell bursts once the beam burns through. mid-shuffle another grows in its place,
  // so the game keeps going; while the eye gloats, it stays gone.
  if (shot && now - shot.firedAt > LASER_MS) {
    const hit = items.find(item => item.cap === shot.cap);
    if (hit) explode(hit, now);
    if (gloating) caps = caps.filter(cap => cap !== shot.cap);
    else shot.cap.rebornAt = now;
    laser = undefined;
  }
  // hands come faster as the game speeds up, one per edge, and rip whatever caps stand on the piece.
  const free = EDGES.filter(edge =>
    hands.every(hand => hand.hole.edge !== edge)
  );
  const handsPerSecond = 0.25 + 0.35 * progress;
  if (
    open &&
    kind !== 'open' &&
    kind !== 'close' &&
    hands.length < 2 &&
    Math.random() < (handsPerSecond * elapsed) / 1000
  ) {
    const hole = ripFrom(randomItem(free));
    // a piece drawn over another hole, even one a hand is still reaching for, would put board back
    // where it was gone.
    const taken = [...holes, ...hands.map(hand => hand.hole)];
    if (!taken.some(({ outline }) => overlaps(outline, hole.outline))) {
      hands.push({
        hole,
        born: now,
        drift: randomFloat(-0.15, 0.15) * Math.min(width, height),
        spin: randomFloat(-0.5, 0.5),
        mirror: randomItem([-1, 1]),
      });
    }
  }
  hands.forEach(hand => {
    if (hand.riding || now - hand.born < REACH_MS + GRIP_MS) return;
    const riding = items.filter(
      item => caps.includes(item.cap) && inside(hand.hole.outline, item)
    );
    holes.push(hand.hole);
    hand.riding = riding;
    caps = caps.filter(cap => riding.every(item => item.cap !== cap));
  });
  hands = hands.filter(hand => now - hand.born < REACH_MS + GRIP_MS + PULL_MS);
  sinking = sinking.filter(({ born }) => now - born < SINK_MS);
  const standing = items.filter(item => caps.includes(item.cap));
  const coinItem = standing.find(item => item.cap === coinCap);
  const aiming = laser;
  const shotItem = aiming && standing.find(item => item.cap === aiming.cap);
  const target = watching ? coinItem : undefined;
  const crashing = kind === 'lift' || kind === 'hold';
  updateBlasts(elapsed, now);
  // the market speeds up as the caps multiply and stampedes through the crash.
  advanceTickers(
    elapsed * (1 + 2 * progress + (crashing ? 3 : 0)),
    0.4 + 2.6 * progress ** 2,
    crashing
  );
  rainCoins(elapsed, progress, crashing);
  const tearing =
    open &&
    ((kind === 'multiply' && p < 0.3) ||
      (kind === 'lift' && p < 0.25) ||
      (kind === 'swap' && Math.random() < 0.05 * progress));

  ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  const background = tearing ? FLASH : '#000';
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, width, height);
  // the board jolts at every blast and shakes while the eye laughs at the empty caps.
  const shake = now - lastBlast < 150 ? 5 : kind === 'hold' ? 2.5 : 0;
  ctx.translate(randomFloat(-shake, shake), randomFloat(-shake, shake));
  if (open) {
    drawTickers();
    drawRain();
  }
  drawWatchers(now, kind, (1 - p) * ms, target);
  drawEye(open, shotItem ?? target, now);
  if (open) {
    drawBed();
    drawHoles(now, background);
    if (kind === 'peek' && coinItem) drawCoin(coinItem, now);
    standing.forEach(drawCap);
    hands.forEach(hand => drawSnatch(hand, now));
    if (aiming && shotItem) {
      drawLaser(shotItem, (now - aiming.firedAt) / LASER_MS);
    }
    drawBlasts(now);
  }
  if (tearing) glitch();

  animationId = requestAnimationFrame(frame);
}

function resize() {
  width = window.innerWidth;
  height = window.innerHeight;
  pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(width * pixelRatio);
  canvas.height = Math.round(height * pixelRatio);
  const near = Math.min(width * 0.94, height * 1.2);
  bed = {
    top: height * (height > width ? 0.36 : 0.44),
    bottom: height * 0.84,
    near,
    far: near * 0.68,
    depth: height * 0.03,
  };

  const half = Math.min(width, height) * 0.07;
  // the capstone grows to fit the eye, so narrow screens get a tall one.
  const capstone = Math.min(0.6, half / (0.75 * 0.62 * (bed.far / 2)));
  const apexY = bed.top * 0.25;
  const capBottom = lerp(apexY, bed.top, capstone);
  const haloY = lerp(apexY, capBottom, 0.6);
  eye = {
    x: width / 2,
    y: lerp(apexY, capBottom, 0.62),
    half,
    apexY,
    capstone,
    haloY,
    haloRadius: Math.hypot((bed.far * capstone) / 2, capBottom - haloY) * 1.05,
  };
  placeWatchers();
  placeTickers();
}

window.addEventListener('resize', resize);
window.addEventListener('pagehide', () => cancelAnimationFrame(animationId));
window.addEventListener('pageshow', event => {
  if (event.persisted) animationId = requestAnimationFrame(frame);
});
resize();
begin('open');
animationId = requestAnimationFrame(frame);
