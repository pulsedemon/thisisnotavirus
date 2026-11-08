import * as Sentry from '@sentry/browser';

import Flash from '../flash/flash';
import TVStaticLoading from '../TVStaticLoading';
import { pickTransition, Transition } from '../transitions/transitions';
import { createStyledIframe } from '../../utils/iframe';

export interface StageLoad {
  /** playlist id */
  virus: string;
  src: string;
  /** regular viruses take pointer input, lab mixes don't */
  interactive: boolean;
}

interface Cover {
  start(): void;
  stop(): void;
}

interface PendingLoad {
  slot: HTMLDivElement;
  /** null means the loading cover */
  transition: Transition | null;
  startedAt: number;
  safetyTimer: ReturnType<typeof setTimeout>;
}

interface RunningTransition {
  animations: Animation[];
  outgoing: HTMLDivElement;
  slot: HTMLDivElement;
}

const MIN_COVER_MS = 500;
const SAFETY_TIMEOUT_MS = 5000;

/**
 * owns what is on screen: one `.virus-slot` per load, the loading cover,
 * and the load, error and safety-timeout handling that reveals each slot.
 */
export default class Stage {
  private el: HTMLElement;
  private loadingAnimEl: HTMLDivElement;
  private onShown: () => void;
  private flash: Flash;
  private cover: Cover | null = null;
  private pending: PendingLoad | null = null;
  private visible: HTMLDivElement | null = null;
  private running: RunningTransition | null = null;
  private lastTransition: string | null = null;

  /** `onShown` fires once per load that reaches the screen */
  constructor(
    el: HTMLElement,
    loadingAnimEl: HTMLDivElement,
    onShown: () => void
  ) {
    this.el = el;
    this.loadingAnimEl = loadingAnimEl;
    this.onShown = onShown;
    // one Flash, because every Flash shares #loading-anim
    this.flash = new Flash(loadingAnimEl);
  }

  /** contentWindow of the newest iframe in the stage */
  get activeWindow(): WindowProxy | null {
    const frames = this.el.querySelectorAll('iframe');
    return frames[frames.length - 1]?.contentWindow ?? null;
  }

  show(load: StageLoad): void {
    this.settle();
    this.dropPending();

    const outgoing = this.visible;
    const transition = outgoing
      ? pickTransition(this.lastTransition, load.virus)
      : null;
    this.lastTransition = transition?.name ?? null;
    if (!transition) {
      outgoing?.remove();
      this.visible = null;
      this.startCover();
    }

    const frame = createStyledIframe();
    frame.title = 'virus';
    if (load.interactive) frame.classList.add('virus-iframe--interactive');
    let src = load.src;

    const slot = document.createElement('div');
    slot.className = 'virus-slot';
    if (transition?.overlayQuery) {
      frame.classList.add('virus-iframe--overlay');
      src += `?${transition.overlayQuery}`;
    } else {
      slot.style.visibility = 'hidden';
    }

    const pending: PendingLoad = {
      slot,
      transition,
      startedAt: Date.now(),
      safetyTimer: setTimeout(() => {
        const msg = `Safety timeout: forcing loading animation to stop for virus: ${load.virus}`;
        console.warn(msg);
        Sentry.captureMessage(msg, 'warning');
        this.onLoaded(pending);
      }, SAFETY_TIMEOUT_MS),
    };
    this.pending = pending;

    frame.addEventListener('load', () => this.onLoaded(pending), {
      once: true,
    });
    frame.addEventListener(
      'error',
      (event: Event) => {
        if (this.pending !== pending) return;
        const msg = `Failed to load virus iframe: ${load.src}`;
        console.error(msg, event);
        Sentry.captureMessage(msg, 'error');
        this.onLoaded(pending);
      },
      { once: true }
    );
    frame.src = src;
    slot.appendChild(frame);
    this.el.appendChild(slot);
  }

  /** removes every slot, stops the cover and timers; later callbacks from earlier loads do nothing */
  clear(): void {
    // a late commit from a cleared transition must not restore its slot
    this.running = null;
    this.dropPending();
    this.stopCover();
    this.el.querySelectorAll('.virus-slot').forEach(slot => slot.remove());
    this.visible = null;
  }

  private onLoaded(p: PendingLoad): void {
    // a load that was superseded, cleared or already revealed has left `pending`
    if (this.pending !== p) return;
    clearTimeout(p.safetyTimer);
    const remaining = MIN_COVER_MS - (Date.now() - p.startedAt);
    if (remaining <= 0) this.reveal(p);
    else setTimeout(() => this.reveal(p), remaining);
  }

  private reveal(p: PendingLoad): void {
    if (this.pending !== p) return;
    this.pending = null;
    this.stopCover();
    p.slot.style.visibility = '';
    this.onShown();

    const outgoing = this.visible;
    if (p.transition && outgoing) {
      // `visible` stays the outgoing slot until commit
      const r: RunningTransition = {
        animations: p.transition.run(outgoing, p.slot),
        outgoing,
        slot: p.slot,
      };
      this.running = r;
      void Promise.all(r.animations.map(a => a.finished)).then(() =>
        this.commit(r)
      );
    } else {
      this.visible = p.slot;
    }
  }

  /** jumps a running transition to its end so the next load starts from one slot */
  private settle(): void {
    const r = this.running;
    if (!r) return;
    r.animations.forEach(a => a.finish());
    // `finished` callbacks wait for a microtask, after show has read `visible`
    this.commit(r);
  }

  private commit(r: RunningTransition): void {
    if (this.running !== r) return;
    this.running = null;
    r.outgoing.remove();
    this.visible = r.slot;
  }

  private dropPending(): void {
    const p = this.pending;
    if (!p) return;
    this.pending = null;
    clearTimeout(p.safetyTimer);
    p.slot.remove();
    this.stopCover();
  }

  private startCover(): void {
    if (Math.random() < 0.5) {
      const tvStatic = new TVStaticLoading();
      this.cover = {
        start: () => tvStatic.show(),
        stop: () => tvStatic.hide(),
      };
    } else {
      this.cover = this.flash;
    }
    this.cover.start();
  }

  private stopCover(): void {
    const cover = this.cover;
    if (!cover) return;
    this.cover = null;
    try {
      cover.stop();
    } catch (error) {
      console.error('Failed to stop loading animation:', error);
      Sentry.captureException(error);
      this.loadingAnimEl.style.display = 'none';
    }
  }
}
