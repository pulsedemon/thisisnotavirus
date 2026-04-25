import * as Sentry from '@sentry/browser';
import type Playlist from '../components/Playlist';
import type { VirusLoaderInterface } from '../types/VirusLoaderInterface';
import { randomIntBetween } from '../utils/random';
import { safeGtag } from '../utils/gtag';
import { createLabButton, createThumbnailButton } from '../ui/floating-buttons';
import Flash from '../components/flash/flash';
import TVStaticLoading from '../components/TVStaticLoading';
import Layer2D from './layers/Layer2D';
import Layer3D from './layers/Layer3D';
import Compositor from './layers/Compositor';
import Loop from './runtime/Loop';
import KeyboardRouter from './runtime/KeyboardRouter';
import {
  createMixedModule,
  createModule,
  isRegistered,
} from './modules/registry';
import type { LayerBlend, VirusKeyboardEvent } from './modules/VirusModule';
import type { Mode, ModeContext } from './modes/Mode';
import ClassicMode from './modes/ClassicMode';
import DualWorldMode from './modes/DualWorldMode';
import LabMode from './modes/LabMode';

interface ExperienceOptions {
  /** Skip mounting floating buttons (used in tests). */
  skipFloatingButtons?: boolean;
  /** Skip starting the rAF loop (used in tests). */
  skipLoop?: boolean;
  /** Skip exposing `window.experience` (used in tests). */
  skipGlobal?: boolean;
}

interface RandomModeSettings {
  enabled: boolean;
  minMs: number;
  maxMs: number;
}

interface TransitionTask {
  effectName: string;
  durationMs: number;
  fromBlend: LayerBlend;
  toBlend: LayerBlend;
  startedAt: number;
  resolve: () => void;
}

const DEFAULT_TRANSITION_MS = 1500;

declare global {
  interface Window {
    experience?: ExperienceController;
  }
}

/**
 * ExperienceController is the unified orchestrator that replaces VirusLoader.
 * It owns:
 *   - the two render layers + compositor + rAF loop
 *   - the active mode (classic / dual-world / lab) and mode switching
 *   - the playlist randomization timer (the original 2–12s rotation)
 *   - the keyboard router
 *   - the loading overlay (TVStaticLoading / Flash) for native modules too
 *   - a public, devtools-friendly API exposed at `window.experience`
 *
 * Existing UI (floating-buttons, fullscreen, menu) interacts via the
 * `VirusLoaderInterface` shape — same method names as the legacy loader so
 * those modules need zero changes.
 */
export default class ExperienceController implements VirusLoaderInterface {
  private playlist: Playlist;

  private container: HTMLElement;
  private experienceCanvas: HTMLCanvasElement;
  private domOverlay: HTMLElement;
  private loadingAnimEl: HTMLDivElement | null;
  private loadingRing: HTMLDivElement | null;
  private sourceCodeLink: HTMLAnchorElement | null;

  private layer2D: Layer2D;
  private layer3D: Layer3D;
  private compositor: Compositor;
  private loop: Loop;
  private keyboard: KeyboardRouter;

  private modes = new Map<string, Mode>();
  private mode: Mode;

  private currentVirusId: string | null = null;
  private isNavigating = false;
  private randomInterval: ReturnType<typeof setInterval> | undefined;
  private randomModeSettings: RandomModeSettings = {
    enabled: false,
    minMs: 4000,
    maxMs: 12000,
  };
  private randomModeTimer: ReturnType<typeof setTimeout> | undefined;

  private transition: TransitionTask | null = null;

  private loadingAnim: { start: () => void; stop: () => void } | null = null;
  private loadingAnimStartTime = 0;
  private loadGeneration = 0;
  private safetyTimeoutHandle: ReturnType<typeof setTimeout> | null = null;
  private revealTimeoutHandle: ReturnType<typeof setTimeout> | null = null;

  virusHasKeyboardControl = false;

  constructor(playlist: Playlist, opts: ExperienceOptions = {}) {
    this.playlist = playlist;

    // Locate or create the DOM scaffolding. We build #experience-canvas and
    // #virus-dom-overlay if not present so the engine can boot in any host.
    this.container = this.requireContainer();
    this.experienceCanvas = this.ensureExperienceCanvas();
    this.domOverlay = this.ensureDomOverlay();
    this.loadingAnimEl = document.getElementById(
      'loading-anim'
    ) as HTMLDivElement | null;
    this.loadingRing = document.getElementById(
      'loading-ring'
    ) as HTMLDivElement | null;
    this.sourceCodeLink = document.querySelector('#source-code a');

    this.layer2D = new Layer2D(this.domOverlay);
    this.layer3D = new Layer3D();
    this.compositor = new Compositor(
      this.experienceCanvas,
      this.layer2D,
      this.layer3D
    );

    const initial = this.viewportSize();
    this.layer2D.resize(initial.width, initial.height);
    this.layer3D.resize(initial.width, initial.height);
    this.compositor.resize(initial.width, initial.height);

    window.addEventListener('resize', this.onResize);
    window.addEventListener('orientationchange', this.onOrientation);

    this.modes.set('classic', new ClassicMode());
    this.modes.set('dual-world', new DualWorldMode());
    this.modes.set('lab', new LabMode(playlist));
    this.mode = this.modes.get('classic')!;

    this.keyboard = new KeyboardRouter(
      () => this.mode.activeModule(),
      enabled => {
        this.virusHasKeyboardControl = enabled;
      }
    );

    this.loop = new Loop((dt, elapsed) => this.tick(dt, elapsed));

    if (!opts.skipFloatingButtons) {
      createLabButton(this);
      createThumbnailButton(this, playlist);
    }

    if (!opts.skipGlobal) {
      window.experience = this;
    }

    // Kick the engine: enter classic mode, load deep-link or first virus,
    // start the rAF loop and the random rotation.
    void this.boot(opts);
  }

  // ────────────────────────────────────────────────────────────────────
  // Boot / lifecycle
  // ────────────────────────────────────────────────────────────────────

  private async boot(opts: ExperienceOptions): Promise<void> {
    await this.mode.enter(this.modeContext());

    const deepLink = new URLSearchParams(window.location.search).get('virus');
    if (deepLink && this.playlist.viruses.includes(deepLink)) {
      this.playlist.setCurrentVirus(deepLink);
      window.history.replaceState({}, '', window.location.pathname);
      const playPause = document.getElementById('play-pause');
      if (playPause) playPause.innerText = 'play_arrow';
      await this.loadVirus(deepLink);
    } else {
      await this.loadVirus(this.playlist.current());
      this.startRandomization();
    }

    if (!opts.skipLoop) this.loop.start();
  }

  // ────────────────────────────────────────────────────────────────────
  // VirusLoaderInterface — preserved API used by floating-buttons & UI
  // ────────────────────────────────────────────────────────────────────

  get isLabOpen(): boolean {
    return this.mode.name === 'lab';
  }

  async loadVirus(name: string): Promise<void> {
    const generation = ++this.loadGeneration;
    this.clearLoadTimers();
    this.virusHasKeyboardControl = false;
    this.startLoadingAnim();

    this.safetyTimeoutHandle = setTimeout(() => {
      if (generation !== this.loadGeneration) return;
      this.safetyTimeoutHandle = null;
      const msg = `Safety timeout: forcing loading animation to stop for virus: ${name}`;
      console.warn(msg);
      Sentry.captureMessage(msg, 'warning');
      this.finishLoading(generation);
    }, 5000);

    try {
      let id = name;
      if (this.playlist.isMixedVirus(name)) {
        const mix = name.startsWith('premix:')
          ? this.playlist.getPremixByName(name)
          : (this.playlist.loadSavedMixes(), this.playlist.getMixById(name));
        if (mix) {
          await this.mountMixed(name, mix.primary, mix.secondary, mix.mixRatio);
        } else {
          const fallback = this.playlist.viruses[0] ?? 'random-shapes';
          console.error('Mix not found for ID:', name);
          Sentry.captureMessage(`Mix not found for ID: ${name}`, 'error');
          await this.mode.advance(fallback);
          id = fallback;
        }
      } else {
        await this.mode.advance(name);
      }
      this.currentVirusId = id;
      if (this.sourceCodeLink)
        this.sourceCodeLink.href = this.sourceCodeUrl(id);
    } catch (err) {
      console.error('Error loading virus:', err);
      Sentry.captureException(err);
      const fallback = this.playlist.viruses[0] ?? 'random-shapes';
      try {
        await this.mode.advance(fallback);
        this.currentVirusId = fallback;
      } catch (innerErr) {
        console.error('Fallback advance failed:', innerErr);
        Sentry.captureException(innerErr);
      }
    }

    this.finishLoading(generation);
  }

  private async mountMixed(
    id: string,
    primary: string,
    secondary: string,
    ratio: number
  ): Promise<void> {
    const mod = createMixedModule(id, primary, secondary, ratio);
    if (this.mode.advanceWith) {
      await this.mode.advanceWith(id, mod);
    } else {
      // No mode handler available — log and skip rather than crash.
      console.warn(
        `Mode ${this.mode.name} does not support mixed viruses; skipping`
      );
    }
  }

  skipNext(): void {
    this.skip('next');
  }

  skipPrev(): void {
    this.skip('prev');
  }

  private skip(direction: 'next' | 'prev'): void {
    if (this.isNavigating) return;
    this.isNavigating = true;
    const id =
      direction === 'next' ? this.playlist.next() : this.playlist.prev();
    void this.loadVirus(id).finally(() => {
      this.startRandomization();
      setTimeout(() => {
        this.isNavigating = false;
      }, 300);
    });
  }

  reloadCurrent(): void {
    if (this.isNavigating) return;
    this.isNavigating = true;
    const id = this.playlist.current();
    void this.loadVirus(id).finally(() => {
      this.startRandomization();
      setTimeout(() => {
        this.isNavigating = false;
      }, 300);
    });
  }

  pauseRandomization(): void {
    if (this.randomInterval !== undefined) clearInterval(this.randomInterval);
    this.randomInterval = undefined;
  }

  startRandomization(): void {
    if (this.randomInterval !== undefined) clearInterval(this.randomInterval);
    const ms = randomIntBetween(2, 12) * 1000;
    this.randomInterval = setInterval(() => {
      const next = this.playlist.next();
      void this.loadVirus(next);
    }, ms);
  }

  toggleLab(): void {
    if (this.mode.name === 'lab') {
      const labMode = this.mode as LabMode;
      const mix = labMode.getCurrentMix();
      void this.setMode('classic').then(() => {
        if (mix?.id !== undefined) {
          const mixId = `mixed:${mix.id}`;
          this.playlist.setCurrentVirus(mixId);
          void this.loadVirus(mixId);
        } else {
          void this.loadVirus(this.playlist.current());
        }
        this.startRandomization();
      });
      const labButton = document.getElementById('lab-btn');
      if (labButton) {
        labButton.textContent = '🧪';
        labButton.title = 'Virus Lab';
      }
      safeGtag('event', 'close_lab');
    } else {
      this.pauseRandomization();
      const playPause = document.getElementById('play-pause');
      if (playPause?.innerText === 'pause') {
        playPause.innerText = 'play_arrow';
      }
      void this.setMode('lab');
      const labButton = document.getElementById('lab-btn');
      if (labButton) {
        labButton.textContent = '✕';
        labButton.title = 'Close Virus Lab';
      }
      safeGtag('event', 'open_lab');
    }
  }

  sourceCodeUrl(virus: string): string {
    return `https://github.com/pulsedemon/thisisnotavirus/tree/master/viruses/${virus}`;
  }

  // ────────────────────────────────────────────────────────────────────
  // New API — modes, transitions, devtools console access
  // ────────────────────────────────────────────────────────────────────

  get currentMode(): string {
    return this.mode.name;
  }

  listModes(): string[] {
    return Array.from(this.modes.keys());
  }

  listTransitions(): string[] {
    return this.compositor.listEffects();
  }

  isModuleRegistered(id: string): boolean {
    return isRegistered(id);
  }

  async setMode(
    name: string,
    opts: { transition?: string; duration?: number } = {}
  ): Promise<void> {
    const next = this.modes.get(name);
    if (!next) {
      console.warn(`Unknown mode: ${name}`);
      return;
    }
    if (next === this.mode) return;

    if (opts.transition) this.compositor.setEffect(opts.transition);

    let previousId = this.currentVirusId ?? this.playlist.current();
    // Mixed virus ids can't round-trip through the module registry, so when
    // switching modes we resolve to a plain virus name from the playlist.
    if (this.playlist.isMixedVirus(previousId)) {
      previousId = this.playlist.viruses[0] ?? 'random-shapes';
    }
    await this.mode.exit();
    this.mode = next;
    await this.mode.enter(this.modeContext(), {
      initialId: next.name === 'lab' ? undefined : previousId,
    });
  }

  /**
   * Smoothly slide the layer blend from its current state to `target`.
   * The compositor's transition shader uses `progress` (0 → 1 → 0) as the
   * tear/dissolve envelope; the underlying blend lerps over the full duration.
   */
  async transitionTo(
    target: LayerBlend,
    opts: { effect?: string; duration?: number } = {}
  ): Promise<void> {
    if (opts.effect) this.compositor.setEffect(opts.effect);
    const duration = opts.duration ?? DEFAULT_TRANSITION_MS;
    const fromBlend = this.readCurrentBlend();
    return new Promise<void>(resolve => {
      this.transition = {
        effectName: this.compositor.getEffectName(),
        durationMs: duration,
        fromBlend,
        toBlend: { ...target },
        startedAt: performance.now(),
        resolve,
      };
    });
  }

  /** Enable or disable the random-mode-switch scheduler. */
  setRandomModeSwitching(
    enabled: boolean,
    range: { minMs?: number; maxMs?: number } = {}
  ): void {
    this.randomModeSettings = {
      enabled,
      minMs: range.minMs ?? this.randomModeSettings.minMs,
      maxMs: range.maxMs ?? this.randomModeSettings.maxMs,
    };
    if (this.randomModeTimer !== undefined) {
      clearTimeout(this.randomModeTimer);
      this.randomModeTimer = undefined;
    }
    if (enabled) this.scheduleRandomModeSwitch();
  }

  private scheduleRandomModeSwitch(): void {
    const { minMs, maxMs } = this.randomModeSettings;
    const delay = Math.floor(
      minMs + Math.random() * Math.max(0, maxMs - minMs)
    );
    this.randomModeTimer = setTimeout(() => {
      if (!this.randomModeSettings.enabled) return;
      const candidates = this.listModes().filter(
        m => m !== 'lab' && m !== this.mode.name
      );
      if (candidates.length > 0) {
        const next = candidates[Math.floor(Math.random() * candidates.length)];
        const transitions = this.listTransitions();
        const tx = transitions[Math.floor(Math.random() * transitions.length)];
        void this.setMode(next, { transition: tx });
        if (next === 'dual-world') {
          // After a brief settle, push the blend toward the other layer.
          const target: LayerBlend =
            Math.random() < 0.5
              ? { layer2D: 0.1, layer3D: 1 }
              : { layer2D: 1, layer3D: 0.1 };
          void this.transitionTo(target, { effect: tx, duration: 1800 });
        }
      }
      this.scheduleRandomModeSwitch();
    }, delay);
  }

  // ────────────────────────────────────────────────────────────────────
  // Frame loop
  // ────────────────────────────────────────────────────────────────────

  private tick(dt: number, elapsed: number): void {
    this.advanceTransition();
    this.layer2D.beginFrame();
    this.mode.tick(dt, elapsed);
    this.layer3D.render();
    this.compositor.render();
    this.layer2D.setOverlayOpacity(this.readCurrentBlend().layer2D);
  }

  private advanceTransition(): void {
    if (!this.transition) return;
    const t = this.transition;
    const now = performance.now();
    const raw = (now - t.startedAt) / Math.max(1, t.durationMs);
    const k = Math.min(1, Math.max(0, raw));
    const blend2D = lerp(t.fromBlend.layer2D, t.toBlend.layer2D, k);
    const blend3D = lerp(t.fromBlend.layer3D, t.toBlend.layer3D, k);
    this.compositor.setBlend(blend2D, blend3D);
    this.compositor.setProgress(k);
    if (k >= 1) {
      this.transition = null;
      t.resolve();
    }
  }

  private readCurrentBlend(): LayerBlend {
    const { blend2D, blend3D } = this.compositor.getBlend();
    return { layer2D: blend2D, layer3D: blend3D };
  }

  // ────────────────────────────────────────────────────────────────────
  // Mode context (passed to each Mode at enter/advance time)
  // ────────────────────────────────────────────────────────────────────

  private modeContext(): ModeContext {
    return {
      createModule: id => createModule(id),
      getLayer2DContext: () => this.layer2D.context(),
      getLayer3DContext: () => this.layer3D.context(),
      setBlend: ({ layer2D, layer3D }) =>
        this.compositor.setBlend(layer2D, layer3D),
      setTransitionProgress: p => this.compositor.setProgress(p),
      setTransitionEffect: n => {
        this.compositor.setEffect(n);
      },
    };
  }

  routeKeyboardEvent(event: KeyboardEvent, type: 'keydown' | 'keyup'): boolean {
    return this.keyboard.routeDom(event, type);
  }

  // ────────────────────────────────────────────────────────────────────
  // Loading overlay (TVStaticLoading / Flash) — preserved feel for native
  // modules too. Picks one at random on each load, identical to legacy.
  // ────────────────────────────────────────────────────────────────────

  private startLoadingAnim(): void {
    if (Math.random() < 0.5) {
      const tvStatic = new TVStaticLoading();
      this.loadingAnim = {
        start: () => tvStatic.show(),
        stop: () => tvStatic.hide(),
      };
    } else if (this.loadingAnimEl) {
      this.loadingAnim = new Flash(this.loadingAnimEl);
    } else {
      this.loadingAnim = null;
    }
    this.loadingAnim?.start();
    this.loadingAnimStartTime = Date.now();
    this.loadingRing?.classList.add('loading');
    if (this.sourceCodeLink) {
      this.sourceCodeLink.classList.add('hide');
      const sourceCodeEl = document.getElementById('source-code');
      if (sourceCodeEl) sourceCodeEl.style.display = 'none';
    }
    const reloadBtn = document.getElementById('reload');
    if (reloadBtn) reloadBtn.classList.add('spinning');
  }

  private finishLoading(generation: number): void {
    if (generation !== this.loadGeneration) return;
    if (this.safetyTimeoutHandle !== null) {
      clearTimeout(this.safetyTimeoutHandle);
      this.safetyTimeoutHandle = null;
    }
    const minDuration = 500;
    const elapsed = Date.now() - this.loadingAnimStartTime;
    const reveal = () => {
      if (generation !== this.loadGeneration) return;
      this.loadingAnim?.stop();
      this.loadingAnim = null;
      this.loadingRing?.classList.remove('loading');
      const reloadBtn = document.getElementById('reload');
      if (reloadBtn) reloadBtn.classList.remove('spinning');
      if (this.sourceCodeLink) {
        this.sourceCodeLink.classList.remove('hide');
        const sourceCodeEl = document.getElementById('source-code');
        if (sourceCodeEl) sourceCodeEl.style.display = '';
      }
    };
    if (elapsed >= minDuration) reveal();
    else {
      this.revealTimeoutHandle = setTimeout(reveal, minDuration - elapsed);
    }
  }

  private clearLoadTimers(): void {
    if (this.safetyTimeoutHandle !== null) {
      clearTimeout(this.safetyTimeoutHandle);
      this.safetyTimeoutHandle = null;
    }
    if (this.revealTimeoutHandle !== null) {
      clearTimeout(this.revealTimeoutHandle);
      this.revealTimeoutHandle = null;
    }
  }

  // ────────────────────────────────────────────────────────────────────
  // DOM scaffolding helpers
  // ────────────────────────────────────────────────────────────────────

  private requireContainer(): HTMLElement {
    let container = document.getElementById('container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'container';
      document.body.appendChild(container);
    }
    return container;
  }

  private ensureExperienceCanvas(): HTMLCanvasElement {
    let canvas = document.getElementById(
      'experience-canvas'
    ) as HTMLCanvasElement | null;
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.id = 'experience-canvas';
      document.body.insertBefore(canvas, document.body.firstChild);
    }
    return canvas;
  }

  private ensureDomOverlay(): HTMLElement {
    let overlay = document.getElementById('virus-dom-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'virus-dom-overlay';
      document.body.insertBefore(overlay, document.body.firstChild);
    }
    return overlay;
  }

  private viewportSize(): { width: number; height: number } {
    return {
      width: window.innerWidth,
      height: window.innerHeight,
    };
  }

  private onResize = (): void => {
    const { width, height } = this.viewportSize();
    this.layer2D.resize(width, height);
    this.layer3D.resize(width, height);
    this.compositor.resize(width, height);
    if ('resize' in this.mode && typeof this.mode.resize === 'function') {
      (this.mode as Mode & { resize: (w: number, h: number) => void }).resize(
        width,
        height
      );
    }
  };

  private onOrientation = (): void => {
    this.skipNext();
  };

  // ────────────────────────────────────────────────────────────────────
  // Tear-down (used in tests; not called in production normally)
  // ────────────────────────────────────────────────────────────────────

  destroy(): void {
    this.loop.stop();
    this.pauseRandomization();
    if (this.randomModeTimer !== undefined) {
      clearTimeout(this.randomModeTimer);
      this.randomModeTimer = undefined;
    }
    this.clearLoadTimers();
    this.keyboard.destroy();
    void this.mode.exit();
    this.compositor.dispose();
    this.layer3D.dispose();
    window.removeEventListener('resize', this.onResize);
    window.removeEventListener('orientationchange', this.onOrientation);
    if (window.experience === this) delete window.experience;
  }

  /** For tests: dispatch a keyboard event into the active module. */
  _dispatchKeyboardEvent(ev: VirusKeyboardEvent): void {
    this.mode.activeModule()?.onKeyboard?.(ev);
  }
}

function lerp(a: number, b: number, k: number): number {
  return a + (b - a) * k;
}
