import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import {
  chromium,
  type BrowserContext,
  type Frame as PageFrame,
  type Page,
  type Request,
  type Route,
} from 'playwright-core';
import { FlashDetector } from './detector.ts';
import { decodePng, downsample, encodePng } from './frames.ts';

const BASE = 'http://localhost:5190';
const WIDTH = 1024;
const HEIGHT = 768;
const ANALYTICS = ['googletagmanager.com', 'google-analytics.com'];
/** fake Date.now() at the first step */
const EPOCH = Date.UTC(2026, 0, 1);
/** Chrome clamps timers nested this deep, and interval repeats past it, to 4 ms */
const CLAMP_NESTING = 5;

interface Patch {
  url: string;
  find?: string;
  replace?: string;
  hang?: boolean;
  body?: string;
  path?: string;
  contentType?: string;
  optional?: boolean;
}

interface InputEvent {
  atMs: number;
  type: 'click' | 'key' | 'select' | 'range' | 'scroll' | 'mouse' | 'viewport';
  selector?: string;
  x?: number;
  y?: number;
  key?: string;
  value?: string | number;
  to?: { x: number; y: number };
  durationMs?: number;
  event?: string;
  deltaY?: number;
}

interface LogEntry {
  step?: number;
  frame?: string;
  [key: string]: unknown;
}

interface InitArg {
  seed: number;
  seedBy: Record<string, number>;
  logRafs: boolean;
  realClock: boolean;
  epoch: number;
  clampNesting: number;
}

/** the page side of a capture; runs in every document before its scripts */
function initDocument(arg: InitArg): void {
  type Report = (entry: Record<string, unknown>) => Promise<void>;
  interface FlashWindow {
    __flashReport?: Report;
    __flashLog: (value: unknown) => void;
    __fakeNow: number;
    __flashAdvance: (t: number) => Promise<void>;
    __flashSeek: (dt: number) => void;
    __flashRecord: () => void;
  }
  const w = window as unknown as FlashWindow & typeof window;
  const pending: Record<string, unknown>[] = [];
  const report = (entry: Record<string, unknown>) => {
    if (w.__flashReport) void w.__flashReport(entry);
    else pending.push(entry);
  };
  document.addEventListener('DOMContentLoaded', () => {
    for (const entry of pending.splice(0)) report(entry);
  });
  w.__flashLog = (value: unknown) => report({ type: 'log', value });

  const ids: string[] = [];
  for (let win: Window = window; win !== win.parent; win = win.parent) {
    const el = win.frameElement;
    ids.unshift(el ? el.id || el.getAttribute('name') || '?' : '?');
  }
  const path = location.pathname.replace(
    /^\/viruses\/([^/]+)(\/(index\.html)?)?$/,
    '/viruses/$1/'
  );
  const own = ids[ids.length - 1];
  let seed: number;
  if (own !== undefined && own in arg.seedBy) {
    seed = arg.seedBy[own];
  } else {
    // FNV-1a
    seed = 0x811c9dc5;
    for (const ch of `${arg.seed}|${path}|${ids.join('>')}`) {
      seed = Math.imul(seed ^ ch.charCodeAt(0), 0x01000193) >>> 0;
    }
  }
  report({ type: 'seed', path, ids, seed });
  let state = seed;
  // mulberry32
  Math.random = () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  if (!arg.realClock) {
    let now = 1000;
    try {
      if (window !== window.top) {
        now = (window.top as unknown as FlashWindow).__fakeNow ?? now;
      }
    } catch {
      // cross-origin parent: keep the default
    }
    const setNow = (t: number) => {
      now = t;
      w.__fakeNow = t;
    };
    setNow(now);

    const realSetTimeout = window.setTimeout.bind(window);
    const macrotask = () =>
      new Promise<void>(resolve => {
        const channel = new MessageChannel();
        channel.port1.onmessage = () => resolve();
        channel.port2.postMessage(0);
      });
    const rethrow = (e: unknown) =>
      realSetTimeout(() => {
        throw e;
      });

    interface Timer {
      due: number;
      fn: () => void;
      interval: number | null;
      nesting: number;
    }
    const timers = new Map<number, Timer>();
    const rafs = new Map<number, FrameRequestCallback>();
    let nextId = 1;
    let nesting = 0;
    const delayFor = (delay: number, level: number) =>
      level >= arg.clampNesting && delay < 4 ? 4 : delay;
    const addTimer = (
      handler: TimerHandler,
      delay: number | undefined,
      args: unknown[],
      repeat: boolean
    ) => {
      // no page passes a string handler; one would throw and fail the run
      const fn = () => (handler as (...a: unknown[]) => void)(...args);
      const d = Math.max(0, Number(delay) || 0);
      const level = nesting + 1;
      const id = nextId++;
      timers.set(id, {
        due: now + delayFor(d, level),
        fn,
        interval: repeat ? d : null,
        nesting: level,
      });
      return id;
    };
    const clear = ((id?: number) => {
      if (id !== undefined) timers.delete(Number(id));
    }) as typeof clearTimeout;
    w.setTimeout = ((
      handler: TimerHandler,
      delay?: number,
      ...args: unknown[]
    ) => addTimer(handler, delay, args, false)) as typeof setTimeout;
    w.setInterval = ((
      handler: TimerHandler,
      delay?: number,
      ...args: unknown[]
    ) => addTimer(handler, delay, args, true)) as typeof setInterval;
    w.clearTimeout = clear;
    w.clearInterval = clear;
    w.requestAnimationFrame = (cb: FrameRequestCallback) => {
      const id = nextId++;
      rafs.set(id, cb);
      return id;
    };
    w.cancelAnimationFrame = (id: number) => {
      rafs.delete(id);
    };
    performance.now = () => now;
    const RealDate = Date;
    class FakeDate extends RealDate {
      constructor(...args: unknown[]) {
        if (args.length === 0) super(arg.epoch + now);
        else super(...(args as [string]));
      }
      static now() {
        return arg.epoch + now;
      }
    }
    w.Date = FakeDate as DateConstructor;

    w.__flashAdvance = async (t: number) => {
      for (;;) {
        let id = -1;
        let next: Timer | undefined;
        for (const [timerId, timer] of timers) {
          if (timer.due <= t && (!next || timer.due < next.due)) {
            id = timerId;
            next = timer;
          }
        }
        if (!next) break;
        setNow(Math.max(now, next.due));
        if (next.interval === null) {
          timers.delete(id);
        } else {
          next.nesting++;
          next.due += delayFor(next.interval, next.nesting);
        }
        nesting = next.nesting;
        try {
          next.fn();
        } catch (e) {
          rethrow(e);
        } finally {
          nesting = 0;
        }
        await macrotask();
      }
      setNow(t);
      const callbacks = [...rafs.values()];
      rafs.clear();
      for (const cb of callbacks) {
        try {
          cb(t);
        } catch (e) {
          rethrow(e);
        }
        await macrotask();
      }
    };

    // the document timeline is frozen over CDP, so CSS and WAAPI animations advance only here
    const seen = new WeakSet<Animation>();
    w.__flashSeek = (dt: number) => {
      for (const a of document.getAnimations()) {
        if (!seen.has(a)) {
          seen.add(a);
          continue;
        }
        if (a.playState !== 'running') continue;
        const end = a.effect?.getComputedTiming().endTime;
        const t = Number(a.currentTime ?? 0) + dt * a.playbackRate;
        if (typeof end === 'number' && Number.isFinite(end) && t >= end) {
          a.finish();
        } else {
          a.currentTime = t;
        }
      }
    };
    w.__flashRecord = () => {
      for (const a of document.getAnimations()) seen.add(a);
    };
  }

  if (arg.logRafs) {
    const probe = (t: number) => {
      report({ type: 'raf', t, now: performance.now() });
      requestAnimationFrame(probe);
    };
    document.addEventListener('DOMContentLoaded', () =>
      requestAnimationFrame(probe)
    );
  }
}

function parse() {
  const { values } = parseArgs({
    options: {
      path: { type: 'string' },
      seconds: { type: 'string' },
      seed: { type: 'string', default: '1' },
      out: { type: 'string' },
      'measure-from': { type: 'string', default: '0' },
      'keep-frames': { type: 'string' },
      'keep-from': { type: 'string' },
      'keep-seconds': { type: 'string' },
      patch: { type: 'string' },
      input: { type: 'string' },
      'hold-secondary': { type: 'string' },
      'seed-by': { type: 'string' },
      'log-eval': { type: 'string' },
      'log-rafs': { type: 'boolean', default: false },
      'allow-uniform': { type: 'boolean', default: false },
      'real-clock': { type: 'boolean', default: false },
    },
  });
  if (!values.path || !values.seconds || !values.out) {
    throw new Error(
      'usage: yarn flash-check --path <url> --seconds <n> --seed <n> --out <dir> [options]'
    );
  }
  const seedBy: Record<string, number> = {};
  for (const pair of values['seed-by']?.split(',') ?? []) {
    const [id, seed] = pair.split('=');
    seedBy[id] = Number(seed);
  }
  // `paint` starts measuring at the step after the first frame that differs from step 0
  const measureFrom =
    values['measure-from'] === 'paint' ? null : Number(values['measure-from']);
  return {
    url: new URL(values.path, BASE).href,
    steps: Math.round(Number(values.seconds) * 60),
    seed: Number(values.seed),
    out: values.out,
    measureFrom,
    keepFactor: values['keep-frames'] ? Number(values['keep-frames']) : 0,
    /** null keeps from the measure start */
    keepFrom: values['keep-from'] ? Number(values['keep-from']) : null,
    keepMs: values['keep-seconds']
      ? Number(values['keep-seconds']) * 1000
      : Infinity,
    patches: values.patch
      ? (JSON.parse(readFileSync(values.patch, 'utf8')) as Patch[])
      : [],
    inputs: values.input
      ? (JSON.parse(readFileSync(values.input, 'utf8')) as InputEvent[])
      : [],
    holdSecondary: Number(values['hold-secondary'] ?? 0),
    seedBy,
    logEval: values['log-eval'],
    logRafs: values['log-rafs'],
    allowUniform: values['allow-uniform'],
    realClock: values['real-clock'],
    args: values,
  };
}

type Options = ReturnType<typeof parse>;

const stepMs = (k: number) => Math.round((k * 1000) / 60);

/** tracks requests so steps can wait for the network to settle */
class Network {
  readonly inflight = new Set<Request>();
  /** hung, held and aborted requests, which never count as pending */
  readonly exempt = new Set<Request>();
  readonly exemptUrls = new Set<string>();

  constructor(context: BrowserContext) {
    context.on('request', r => this.inflight.add(r));
    context.on('requestfinished', r => this.inflight.delete(r));
    context.on('requestfailed', r => this.inflight.delete(r));
  }

  exemptRequest(r: Request) {
    this.exempt.add(r);
    this.exemptUrls.add(r.url());
  }

  /** frames waiting on a hung or held navigation, which have no document to evaluate in */
  blockedFrames(): Set<PageFrame> {
    const frames = new Set<PageFrame>();
    for (const r of this.inflight) {
      if (this.exempt.has(r) && r.isNavigationRequest()) frames.add(r.frame());
    }
    return frames;
  }

  pendingIn(frame?: PageFrame): Request[] {
    return [...this.inflight].filter(r => {
      if (this.exempt.has(r)) return false;
      if (!frame) return true;
      try {
        return r.frame() === frame;
      } catch {
        return false;
      }
    });
  }
}

class StallError extends Error {}

async function evaluateEach<T>(
  page: Page,
  network: Network,
  fn: (frame: PageFrame) => Promise<T>
): Promise<{ frame: PageFrame; value: T }[]> {
  const results: { frame: PageFrame; value: T }[] = [];
  const blocked = network.blockedFrames();
  for (const frame of page.frames()) {
    if (blocked.has(frame)) continue;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const stalled = new Promise<never>((_, reject) => {
      timer = setTimeout(
        () => reject(new StallError(`evaluate stalled in ${frame.url()}`)),
        10_000
      );
    });
    try {
      results.push({ frame, value: await Promise.race([fn(frame), stalled]) });
    } catch (e) {
      if (e instanceof StallError) throw e;
      // the frame navigated or detached mid-step
    } finally {
      clearTimeout(timer);
    }
  }
  return results;
}

async function settle(page: Page, network: Network): Promise<void> {
  const deadline = Date.now() + 30_000;
  for (let quiet = 0; quiet < 2; ) {
    if (Date.now() > deadline) {
      throw new Error(
        `network never settled: ${network
          .pendingIn()
          .map(r => r.url())
          .join(', ')}`
      );
    }
    let busy = network.pendingIn().length > 0;
    if (!busy) {
      const states = await evaluateEach(page, network, f =>
        f.evaluate(() => document.readyState)
      );
      busy = states.some(
        s => s.value !== 'complete' && network.pendingIn(s.frame).length > 0
      );
    }
    quiet = busy ? 0 : quiet + 1;
    await new Promise(r => setTimeout(r, 5));
  }
}

async function decodeImages(page: Page, network: Network): Promise<void> {
  await evaluateEach(page, network, f =>
    f.evaluate(() =>
      Promise.all(
        [...document.images]
          .filter(img => img.complete && img.src)
          .map(img => img.decode().catch(() => undefined))
      )
    )
  );
}

async function installRoutes(
  context: BrowserContext,
  opts: Options,
  network: Network,
  log: LogEntry[],
  failures: string[],
  held: Route[]
): Promise<Set<Patch>> {
  const requested = new Set<Patch>();
  let secondaryHeld = false;
  await context.route('**/*', async route => {
    const request = route.request();
    const url = request.url();
    const { hostname, pathname } = new URL(url);
    if (ANALYTICS.some(h => hostname === h || hostname.endsWith(`.${h}`))) {
      network.exemptRequest(request);
      log.push({ type: 'aborted', url });
      await route.abort();
      return;
    }
    if (
      opts.holdSecondary > 0 &&
      !secondaryHeld &&
      request.isNavigationRequest() &&
      request.frame().name() === 'secondary-virus'
    ) {
      secondaryHeld = true;
      network.exemptRequest(request);
      held.push(route);
      return;
    }
    const patches = opts.patches.filter(
      p => url.startsWith(BASE) && p.url === pathname
    );
    if (patches.length === 0) {
      await route.continue();
      return;
    }
    for (const patch of patches) requested.add(patch);
    if (patches.some(p => p.hang)) {
      network.exemptRequest(request);
      return;
    }
    const replacement = patches.find(
      p => p.body !== undefined || p.path !== undefined
    );
    if (replacement) {
      await route.fulfill({
        body: replacement.body ?? readFileSync(replacement.path!),
        contentType: replacement.contentType,
      });
      return;
    }
    const response = await route.fetch();
    let text = await response.text();
    // edits apply in file order, each to the text the previous one left
    for (const patch of patches) {
      if (patch.find === undefined) {
        failures.push(`patch for ${patch.url} has no find`);
        continue;
      }
      const count = text.split(patch.find).length - 1;
      if (count !== 1) {
        failures.push(`patch for ${patch.url} matched ${count} times`);
        continue;
      }
      text = text.replace(patch.find, () => patch.replace ?? '');
    }
    await route.fulfill({ response, body: text });
  });
  return requested;
}

/** expands drags, held keys and range sweeps into per-step actions */
function schedule(
  inputs: InputEvent[]
): { atMs: number; run: (page: Page) => Promise<void> }[] {
  const actions: { atMs: number; run: (page: Page) => Promise<void> }[] = [];
  const at = (atMs: number, run: (page: Page) => Promise<void>) =>
    actions.push({ atMs, run });
  const frameMs = 1000 / 60;
  for (const e of inputs) {
    const sel = e.selector ?? '';
    switch (e.type) {
      case 'click':
        at(e.atMs, page =>
          page
            .locator(sel)
            .first()
            .dispatchEvent(e.event ?? 'click', undefined, { timeout: 2000 })
        );
        break;
      case 'key':
        if (e.durationMs) {
          at(e.atMs, page => page.keyboard.down(e.key!));
          at(e.atMs + e.durationMs, page => page.keyboard.up(e.key!));
        } else {
          at(e.atMs, page => page.keyboard.press(e.key!));
        }
        break;
      case 'select':
        at(e.atMs, page =>
          page.locator(sel).evaluate((el, value) => {
            (el as HTMLSelectElement).value = value;
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
          }, String(e.value))
        );
        break;
      case 'range': {
        // one `step` per move toward the target, moves spread evenly over durationMs
        const target = Number(e.value);
        at(e.atMs, async page => {
          const { value, step } = await page.locator(sel).evaluate(el => ({
            value: Number((el as HTMLInputElement).value),
            step: Number((el as HTMLInputElement).step) || 1,
          }));
          const moves = Math.round(Math.abs(target - value) / step);
          for (let i = 1; i <= moves; i++) {
            const v = value + Math.sign(target - value) * step * i;
            actions.push({
              atMs: e.atMs + ((e.durationMs ?? 0) * i) / moves,
              run: p =>
                p.locator(sel).evaluate(
                  (el, next) => {
                    (el as HTMLInputElement).value = next;
                    el.dispatchEvent(new Event('input', { bubbles: true }));
                  },
                  String(Number(v.toFixed(6)))
                ),
            });
          }
        });
        break;
      }
      case 'viewport':
        // stands in for fullscreen, which a dispatched click can't enter; screenshots stay clipped
        at(e.atMs, page =>
          page.setViewportSize({ width: e.to!.x, height: e.to!.y })
        );
        break;
      case 'scroll':
        at(e.atMs, page =>
          page.locator(sel).evaluate((el, top) => {
            el.scrollTop = top;
          }, Number(e.value))
        );
        break;
      case 'mouse': {
        const x = e.x ?? 0;
        const y = e.y ?? 0;
        switch (e.event ?? 'click') {
          case 'move':
            if (e.to && e.durationMs) {
              const n = Math.max(1, Math.round(e.durationMs / frameMs));
              for (let i = 0; i <= n; i++) {
                const mx = x + ((e.to.x - x) * i) / n;
                const my = y + ((e.to.y - y) * i) / n;
                at(e.atMs + (e.durationMs * i) / n, page =>
                  page.mouse.move(mx, my)
                );
              }
            } else {
              at(e.atMs, page => page.mouse.move(x, y));
            }
            break;
          case 'down':
            at(e.atMs, async page => {
              await page.mouse.move(x, y);
              await page.mouse.down();
            });
            break;
          case 'up':
            at(e.atMs, async page => {
              await page.mouse.move(x, y);
              await page.mouse.up();
            });
            break;
          case 'dblclick':
            at(e.atMs, page => page.mouse.dblclick(x, y));
            break;
          case 'wheel':
            at(e.atMs, async page => {
              await page.mouse.move(x, y);
              await page.mouse.wheel(0, e.deltaY ?? 0);
            });
            break;
          default:
            at(e.atMs, page => page.mouse.click(x, y));
        }
        break;
      }
    }
  }
  return actions;
}

async function capture(opts: Options): Promise<number> {
  mkdirSync(join(opts.out, 'frames'), { recursive: true });
  const log: LogEntry[] = [];
  const failures: string[] = [];
  const hashes: string[] = [];
  const held: Route[] = [];
  let step = 0;

  const browser = await chromium.launch({
    channel: 'chrome',
    args: ['--enable-unsafe-swiftshader'],
  });
  try {
    const context = await browser.newContext({
      viewport: { width: WIDTH, height: HEIGHT },
      deviceScaleFactor: 1,
      reducedMotion: 'no-preference',
    });
    const network = new Network(context);
    await context.exposeBinding(
      '__flashReport',
      ({ frame }, entry: Record<string, unknown>) => {
        log.push({ step, frame: frame.url(), ...entry });
      }
    );
    const initArg: InitArg = {
      seed: opts.seed,
      seedBy: opts.seedBy,
      logRafs: opts.logRafs,
      realClock: opts.realClock,
      epoch: EPOCH,
      clampNesting: CLAMP_NESTING,
    };
    await context.addInitScript(initDocument, initArg);
    const requested = await installRoutes(
      context,
      opts,
      network,
      log,
      failures,
      held
    );

    const page = await context.newPage();
    page.on('pageerror', e => failures.push(`pageerror: ${e.message}`));
    page.on('console', msg => {
      if (msg.type() !== 'error') return;
      if (network.exemptUrls.has(msg.location().url)) return;
      failures.push(`console error: ${msg.text()}`);
    });
    page.on('response', r => {
      const url = new URL(r.url());
      if (
        r.status() >= 400 &&
        url.origin === BASE &&
        url.pathname !== '/favicon.ico'
      ) {
        failures.push(`${r.status()} ${r.url()}`);
      }
    });
    page.on('framenavigated', f => {
      if (f === page.mainFrame() && step > 0 && !opts.realClock) {
        failures.push('the top document navigated mid-run');
      }
    });

    const cdp = await context.newCDPSession(page);
    await cdp.send('Emulation.setDefaultBackgroundColorOverride', {
      color: { r: 0, g: 0, b: 0, a: 1 },
    });
    if (!opts.realClock) {
      await cdp.send('Animation.enable');
      await cdp.send('Animation.setPlaybackRate', { playbackRate: 0 });
    }

    await page.goto(opts.url, { waitUntil: 'commit' });

    const actions = schedule(opts.inputs);
    const detector = new FlashDetector(WIDTH, HEIGHT);
    let measureStart = opts.measureFrom ?? Infinity;
    let measuredFromStep = -1;
    let uniform: number[] | null = null;
    let measuredUniform = true;
    const realStart = performance.now();

    for (step = 0; step < opts.steps; step++) {
      const t = stepMs(step);
      if (opts.realClock) {
        if (step === 0) await settle(page, network);
        const wait = realStart + t - performance.now();
        if (wait > 0) await new Promise(r => setTimeout(r, wait));
      } else {
        await settle(page, network);
        const dt = step === 0 ? 0 : t - stepMs(step - 1);
        await evaluateEach(page, network, f =>
          f.evaluate(d => {
            (
              window as unknown as { __flashSeek?: (dt: number) => void }
            ).__flashSeek?.(d);
          }, dt)
        );
        await evaluateEach(page, network, f =>
          f.evaluate(
            now =>
              (
                window as unknown as {
                  __flashAdvance?: (t: number) => Promise<void>;
                }
              ).__flashAdvance?.(now),
            1000 + t
          )
        );
      }
      if (step === opts.holdSecondary) {
        for (const route of held.splice(0)) await route.continue();
      }
      for (let i = 0; i < actions.length; i++) {
        if (actions[i].atMs <= t) {
          const [action] = actions.splice(i--, 1);
          try {
            await action.run(page);
          } catch (e) {
            failures.push(`input at ${action.atMs} ms: ${String(e)}`);
          }
        }
      }
      if (!opts.realClock) {
        await settle(page, network);
        await decodeImages(page, network);
        await evaluateEach(page, network, f =>
          f.evaluate(() => {
            (
              window as unknown as { __flashRecord?: () => void }
            ).__flashRecord?.();
          })
        );
      }
      if (opts.logEval) {
        const expr = opts.logEval;
        for (const { frame, value } of await evaluateEach(page, network, f =>
          f.evaluate(
            `(() => { try { return (${expr}); } catch { return undefined; } })()`
          )
        )) {
          if (value !== undefined && value !== null) {
            log.push({ step, frame: frame.url(), type: 'eval', value });
          }
        }
      }

      const shot = (await cdp.send('Page.captureScreenshot', {
        format: 'png',
        clip: { x: 0, y: 0, width: WIDTH, height: HEIGHT, scale: 1 },
        optimizeForSpeed: true,
      })) as { data: string };
      if (opts.realClock) {
        log.push({ step, type: 'shot', realMs: performance.now() - realStart });
      }
      const frame = decodePng(Buffer.from(shot.data, 'base64'));
      const hash = createHash('sha1')
        .update(frame.data)
        .digest('hex')
        .slice(0, 12);
      hashes.push(hash);
      if (measureStart === Infinity && step > 0 && hash !== hashes[0]) {
        measureStart = stepMs(step + 1);
      }
      if (t >= measureStart) {
        if (measuredFromStep < 0) measuredFromStep = step;
        detector.push(frame);
        if (measuredUniform) {
          uniform ??= [...frame.data.subarray(0, 3)];
          for (let i = 0; i < frame.data.length; i++) {
            if (frame.data[i] !== uniform[i % 3]) {
              measuredUniform = false;
              break;
            }
          }
        }
      }
      const keepFrom = opts.keepFrom ?? measureStart;
      if (opts.keepFactor > 0 && t >= keepFrom && t < keepFrom + opts.keepMs) {
        const kept =
          opts.keepFactor > 1 ? downsample(frame, opts.keepFactor) : frame;
        writeFileSync(
          join(opts.out, 'frames', `${String(step).padStart(5, '0')}.png`),
          encodePng(kept)
        );
      }
    }

    for (const patch of opts.patches) {
      if (!patch.optional && !requested.has(patch)) {
        failures.push(`patch for ${patch.url} was never requested`);
      }
    }
    if (measuredUniform && !opts.allowUniform) {
      failures.push('every measured frame is one color');
    }
    writeFileSync(
      join(opts.out, 'result.json'),
      JSON.stringify(
        {
          args: opts.args,
          measuredFromStep,
          result: detector.result(),
          failures,
          log,
          hashes,
        },
        null,
        1
      )
    );
  } finally {
    await browser.close();
  }
  for (const f of failures) console.error(f);
  return failures.length > 0 ? 1 : 0;
}

process.exitCode = await capture(parse());
