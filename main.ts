import * as Sentry from '@sentry/browser';

import { virus } from './ascii';
import Flash from './components/flash/flash';
import Playlist from './components/Playlist';
import TVStaticLoading from './components/TVStaticLoading';
import VirusLab from './components/VirusLab';
import './sass/main.scss';
import { createStyledIframe } from './utils/iframe';
import { randomIntBetween } from './utils/random';
import { safeGtag } from './utils/gtag';
import { createLabButton, createThumbnailButton } from './ui/floating-buttons';
import { initFullscreen } from './ui/fullscreen';
import { toggleInfo, hideInfo, teleportMenu, shuffleTitle } from './ui/menu';

declare global {
  interface Window {
    TVStaticLoading?: typeof TVStaticLoading;
    __iconFontFailed?: boolean;
  }
}

// Check if we're in production mode using Vite's import.meta.env
if (import.meta.env.PROD) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN as string,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.browserProfilingIntegration(),
    ],
    tracesSampleRate: 1.0,
    profilesSampleRate: 1.0,
  });

  // Defer the check: the icon font preload script in index.html may set
  // __iconFontFailed after this module initializes (e.g. on timeout or
  // fonts.load() rejection). Checking on 'load' guarantees the font script
  // has resolved.
  window.addEventListener('load', () => {
    if (window.__iconFontFailed) {
      Sentry.captureMessage(
        'Material Symbols icon font failed to load',
        'warning'
      );
    }
  });
}

console.log(
  `%c
  ${virus}
`,
  'color: #00ffff'
);

const playlist = new Playlist();

let virusHasKeyboardControl = false;

interface KeyboardControlMessage {
  type: string;
  enabled: boolean;
}

function isKeyboardControlMessage(
  data: unknown
): data is KeyboardControlMessage {
  return (
    typeof data === 'object' &&
    data !== null &&
    'type' in data &&
    'enabled' in data &&
    data.type === 'requestKeyboardControl' &&
    typeof data.enabled === 'boolean'
  );
}

window.addEventListener('message', event => {
  if (isKeyboardControlMessage(event.data)) {
    virusHasKeyboardControl = event.data.enabled;
  }
});

class VirusLoader {
  iframe: HTMLIFrameElement;
  loadRandomInterval: ReturnType<typeof setInterval>;
  loadingAnimEl: HTMLDivElement = document.getElementById(
    'loading-anim'
  ) as HTMLDivElement;
  loadingAnimStartTime = 0;
  loadingAnim: { start: () => void; stop: () => void };
  loadingRing: HTMLDivElement = document.getElementById(
    'loading-ring'
  ) as HTMLDivElement;
  sourceCodeLink: HTMLAnchorElement | null =
    document.querySelector('#source-code a');
  virusLab: VirusLab | null = null;
  isNavigating = false;
  /**
   * Generation counter for cancelling stale iframe loads.
   * Each loadVirus() call increments this and captures the value locally.
   * All async callbacks (load, error, safety timeout, reveal delay) compare
   * their captured generation against the current value and bail out if a
   * newer load has superseded them.
   */
  private _loadGeneration = 0;
  /** Pending setTimeout ID for the minimum-animation-duration delay before revealing the iframe. */
  private _pendingRevealTimeout: ReturnType<typeof setTimeout> | null = null;
  private _safetyTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.iframe = document.getElementById('container') as HTMLIFrameElement;
    this.iframe.style.width = '100%';
    this.iframe.style.height = '100%';
    this.iframe.style.border = 'none';
    this.iframe.style.position = 'absolute';
    this.iframe.style.top = '0';
    this.iframe.style.left = '0';
    this.iframe.style.background = '#000';

    // Check for virus redirect parameter
    const virusParam = new URLSearchParams(window.location.search).get('virus');

    if (virusParam && playlist.viruses.includes(virusParam)) {
      playlist.setCurrentVirus(virusParam);
      this.loadVirus(virusParam);
      const playPauseEl = document.getElementById('play-pause');
      if (playPauseEl) playPauseEl.innerText = 'play_arrow';
      clearInterval(this.loadRandomInterval);
      window.history.replaceState({}, '', window.location.pathname);
    } else {
      this.loadVirus(playlist.current());
      this.startRandomization();
    }

    this.sourceCodeLink?.addEventListener('click', () => {
      safeGtag('event', 'source-click', {
        animation_name: playlist.current(),
      });
    });

    // Create floating buttons
    createLabButton(this);
    createThumbnailButton(this, playlist);
  }

  private showSourceCodeLink() {
    this.sourceCodeLink?.classList.remove('hide');
    const sourceCodeEl = document.getElementById('source-code');
    if (sourceCodeEl) sourceCodeEl.style.display = '';
  }

  private hideSourceCodeLink() {
    this.sourceCodeLink?.classList.add('hide');
    const sourceCodeEl = document.getElementById('source-code');
    if (sourceCodeEl) sourceCodeEl.style.display = 'none';
  }

  private removeMixContainer() {
    document.querySelector('.mixed-virus-container')?.remove();
  }

  loadVirus(name: string) {
    const generation = ++this._loadGeneration;

    if (this._pendingRevealTimeout !== null) {
      clearTimeout(this._pendingRevealTimeout);
      this._pendingRevealTimeout = null;
    }

    if (this._safetyTimeout !== null) {
      clearTimeout(this._safetyTimeout);
      this._safetyTimeout = null;
    }

    virusHasKeyboardControl = false;

    // Randomly choose the loading animation for each load
    if (Math.random() < 0.5) {
      const tvStatic = new TVStaticLoading();
      this.loadingAnim = {
        start: () => tvStatic.show(),
        stop: () => tvStatic.hide(),
      };
    } else {
      this.loadingAnim = new Flash(this.loadingAnimEl);
    }

    console.log('Loading virus:', name);
    this.loadingAnim.start();
    this.loadingAnimStartTime = Date.now();
    this.hideSourceCodeLink();
    this.loadingRing.classList.add('loading');
    this.iframe.style.visibility = 'hidden';

    const reloadBtn = document.getElementById('reload');
    if (reloadBtn) reloadBtn.classList.add('spinning');

    // Clean up any existing mixed virus
    this.removeMixContainer();

    this._safetyTimeout = setTimeout(() => {
      if (generation !== this._loadGeneration) return;
      const msg = `Safety timeout: forcing loading animation to stop for virus: ${name}`;
      console.warn(msg);
      Sentry.captureMessage(msg, 'warning');
      this._delayedIframeLoaded(generation);
    }, 5000);

    try {
      if (playlist.isMixedVirus(name)) {
        let mix: ReturnType<typeof playlist.getMixById>;
        if (name.startsWith('premix:')) {
          mix = playlist.getPremixByName(name);
        } else {
          playlist.loadSavedMixes();
          mix = playlist.getMixById(name);
        }
        if (mix) {
          this.iframe.style.display = 'none';
          this.hideSourceCodeLink();

          const mixContainer = document.createElement('div');
          mixContainer.className = 'mixed-virus-container';
          mixContainer.style.position = 'absolute';
          mixContainer.style.top = '0';
          mixContainer.style.left = '0';
          mixContainer.style.width = '100%';
          mixContainer.style.height = '100%';
          mixContainer.style.zIndex = '1';

          const mixFrame = createStyledIframe();
          mixFrame.style.visibility = 'hidden';
          mixFrame.src = `/viruses/lab/?primary=${mix.primary}&secondary=${mix.secondary}&ratio=${mix.mixRatio}`;

          this._attachIframeListeners(
            mixFrame,
            generation,
            `mixed virus iframe: ${name}`
          );

          mixContainer.appendChild(mixFrame);
          document.body.appendChild(mixContainer);

          if (this.sourceCodeLink)
            this.sourceCodeLink.href = this.sourceCodeUrl(name);
        } else {
          console.error('Mix not found for ID:', name);
          Sentry.captureMessage(`Mix not found for ID: ${name}`, 'error');
          const fallbackVirus = playlist.viruses[0] ?? 'random-shapes';
          this.iframe.src = `/viruses/${fallbackVirus}/`;
          this.iframe.style.display = 'block';
          this._attachIframeListeners(
            this.iframe,
            generation,
            `fallback virus iframe (${fallbackVirus}) after mix not found: ${name}`
          );
        }
      } else {
        this.iframe.src = `/viruses/${name}/`;
        this.iframe.style.display = 'block';
        this._attachIframeListeners(
          this.iframe,
          generation,
          `virus iframe: ${name}`
        );
      }
    } catch (error) {
      console.error('Error loading virus:', error);
      Sentry.captureException(error);
      const fallbackVirus = playlist.viruses[0] ?? 'random-shapes';
      this.iframe.src = `/viruses/${fallbackVirus}/`;
      this.iframe.style.display = 'block';
      this._attachIframeListeners(
        this.iframe,
        generation,
        `fallback virus iframe: ${fallbackVirus}`
      );
    }
  }

  private _attachIframeListeners(
    frame: HTMLIFrameElement,
    generation: number,
    errorLabel: string
  ): void {
    frame.addEventListener(
      'load',
      () => {
        if (generation !== this._loadGeneration) return;
        if (this._safetyTimeout !== null) {
          clearTimeout(this._safetyTimeout);
          this._safetyTimeout = null;
        }
        this._delayedIframeLoaded(generation);
      },
      { once: true }
    );
    frame.addEventListener(
      'error',
      (event: Event) => {
        if (generation !== this._loadGeneration) return;
        const errorMsg = `Failed to load ${errorLabel}`;
        console.error(errorMsg, event);
        Sentry.captureMessage(errorMsg, 'error');
        if (this._safetyTimeout !== null) {
          clearTimeout(this._safetyTimeout);
          this._safetyTimeout = null;
        }
        this._delayedIframeLoaded(generation);
      },
      { once: true }
    );
  }

  private _delayedIframeLoaded(generation: number) {
    if (generation !== this._loadGeneration) return;

    const minDuration = 500;
    const elapsed = Date.now() - this.loadingAnimStartTime;
    if (elapsed >= minDuration) {
      this._iframeLoaded();
    } else {
      this._pendingRevealTimeout = setTimeout(() => {
        this._pendingRevealTimeout = null;
        if (generation !== this._loadGeneration) return;
        this._iframeLoaded();
      }, minDuration - elapsed);
    }
  }

  private _stopLoadingAnim(): void {
    try {
      this.loadingAnim.stop();
    } catch (error) {
      console.error('Failed to stop loading animation:', error);
      Sentry.captureException(error);
      if (this.loadingAnimEl) this.loadingAnimEl.style.display = 'none';
    }
    document.querySelectorAll('.tv-static-canvas').forEach(el => {
      (el as HTMLElement).style.pointerEvents = 'none';
      el.parentNode?.removeChild(el);
    });
  }

  private _iframeLoaded() {
    try {
      this._stopLoadingAnim();

      if (!playlist.isMixedVirus(playlist.current())) {
        this.showSourceCodeLink();
      }
      if (this.sourceCodeLink)
        this.sourceCodeLink.href = this.sourceCodeUrl(playlist.current());
    } catch (error) {
      console.error('Error in iframeLoaded:', error);
      Sentry.captureException(error);
    } finally {
      if (this.iframe.style.display !== 'none') {
        this.iframe.style.visibility = 'visible';
      }
      document.querySelectorAll('.mixed-virus-container iframe').forEach(el => {
        (el as HTMLElement).style.visibility = 'visible';
      });
      this.loadingRing.classList.remove('loading');
      const reloadBtn = document.getElementById('reload');
      if (reloadBtn) reloadBtn.classList.remove('spinning');
    }
  }

  sourceCodeUrl(virus: string) {
    return `https://github.com/pulsedemon/thisisnotavirus/tree/master/viruses/${virus}`;
  }

  skipNext() {
    this.skip('next');
  }

  skipPrev() {
    this.skip('prev');
  }

  private skip(direction: 'next' | 'prev') {
    if (this.isNavigating) return;
    this.isNavigating = true;

    this.removeMixContainer();

    const virus = direction === 'next' ? playlist.next() : playlist.prev();
    console.log(`Skipping to ${direction} virus:`, virus);
    this.loadVirus(virus);
    this.startRandomization();

    setTimeout(() => {
      this.isNavigating = false;
    }, 300);
  }

  startRandomization() {
    clearInterval(this.loadRandomInterval);
    const randomTime = randomIntBetween(2, 12) * 1000;

    this.loadRandomInterval = setInterval(() => {
      this.removeMixContainer();

      const nextVirus = playlist.next();
      this.loadVirus(nextVirus);
    }, randomTime);
  }

  private hideModals() {
    document.querySelectorAll('.modal.show').forEach(modal => {
      modal.classList.remove('show');
    });
  }

  toggleLab() {
    if (this.virusLab) {
      // Close lab
      const currentMix = this.virusLab.getCurrentMix();
      const labContainer = document.getElementById('virus-lab');
      if (labContainer) {
        labContainer.remove();
      }
      this.virusLab = null;

      const menuEl = document.getElementById('menu');
      if (menuEl) menuEl.style.display = 'flex';

      const labButton = document.getElementById('lab-btn');
      if (labButton) {
        labButton.textContent = '🧪';
        labButton.title = 'Virus Lab';
      }
      safeGtag('event', 'close_lab');

      clearInterval(this.loadRandomInterval);

      if (currentMix && currentMix.id) {
        this.loadVirus(`mixed:${currentMix.id}`);
        const mixId = `mixed:${currentMix.id}`;
        playlist.setCurrentVirus(mixId);
      } else {
        this.iframe.style.display = 'block';
        this.loadVirus(playlist.current());
      }

      const playPauseBtn = document.getElementById('play-pause');
      if (playPauseBtn && playPauseBtn.innerText === 'play_arrow') {
        playPauseBtn.innerText = 'pause';
      }

      this.startRandomization();
    } else {
      // Open lab
      this.iframe.style.display = 'none';
      const menuEl = document.getElementById('menu');
      if (menuEl) menuEl.style.display = 'none';
      this.hideModals();

      this.removeMixContainer();

      const playPauseBtn = document.getElementById('play-pause');
      if (playPauseBtn?.innerText === 'pause') {
        playPauseBtn.innerText = 'play_arrow';
        clearInterval(this.loadRandomInterval);
      }

      const labContainer = document.createElement('div');
      labContainer.id = 'virus-lab';
      labContainer.style.position = 'absolute';
      labContainer.style.top = '0';
      labContainer.style.left = '0';
      labContainer.style.right = '0';
      labContainer.style.bottom = '0';
      labContainer.style.width = '100%';
      labContainer.style.height = '100%';
      labContainer.style.zIndex = '1000';
      labContainer.style.overflow = 'visible';
      labContainer.style.pointerEvents = 'auto';

      document.body.appendChild(labContainer);
      this.virusLab = new VirusLab(labContainer, playlist);

      const labButton = document.getElementById('lab-btn');
      if (labButton) {
        labButton.textContent = '✕';
        labButton.title = 'Close Virus Lab';
      }
      safeGtag('event', 'open_lab');
    }
  }

  reloadCurrent() {
    if (this.isNavigating) return;
    this.isNavigating = true;

    this.removeMixContainer();

    const currentVirus = playlist.current();
    console.log('Reloading current virus:', currentVirus);
    this.loadVirus(currentVirus);
    this.startRandomization();

    setTimeout(() => {
      this.isNavigating = false;
    }, 300);
  }
}

const vl = new VirusLoader();

window.addEventListener('orientationchange', function () {
  vl.skipNext();
});

// Menu button handlers
const skipPrevBtn = document.getElementById('skip-previous');
if (skipPrevBtn) {
  skipPrevBtn.onclick = () => {
    safeGtag('event', 'skip_previous');
    vl.skipPrev();
  };
}

function togglePlayPause() {
  const playPauseBtn = document.getElementById('play-pause');
  if (!playPauseBtn) return;
  if (playPauseBtn.innerText === 'pause') {
    playPauseBtn.innerText = 'play_arrow';
    clearInterval(vl.loadRandomInterval);
    safeGtag('event', 'pause', {
      animation_name: playlist.current(),
    });
  } else {
    playPauseBtn.innerText = 'pause';
    safeGtag('event', 'play');
    vl.skipNext();
  }
}

const playPauseEl = document.getElementById('play-pause');
if (playPauseEl) playPauseEl.onclick = togglePlayPause;

function resumePlayback() {
  const playButton = document.getElementById('play-pause');
  if (playButton && playButton.innerText === 'play_arrow') {
    playButton.innerText = 'pause';
  }
}

const skipNextBtn = document.getElementById('skip-next');
if (skipNextBtn)
  skipNextBtn.onclick = () => {
    safeGtag('event', 'skip-next', {
      animation_name: playlist.current(),
    });
    vl.skipNext();
    resumePlayback();
  };

const reloadBtn = document.getElementById('reload');
if (reloadBtn)
  reloadBtn.onclick = () => {
    safeGtag('event', 'reload', {
      animation_name: playlist.current(),
    });
    vl.reloadCurrent();
  };

// Enable keyboard activation for interactive spans (Enter/Space triggers click)
document.querySelectorAll('#menu [role="button"]').forEach(el => {
  el.addEventListener('keydown', e => {
    const key = (e as KeyboardEvent).key;
    if (key === 'Enter' || key === ' ') {
      e.preventDefault();
      (el as HTMLElement).click();
    }
  });
});

// Initialize fullscreen (desktop only)
initFullscreen();

// Info modal
const infoBtnEl = document.getElementById('info-btn');
if (infoBtnEl) infoBtnEl.onclick = () => toggleInfo();

// Keyboard event forwarding to iframe
function forwardKeyboardEventToIframe(event: KeyboardEvent, eventType: string) {
  if (!virusHasKeyboardControl) return;

  const mainIframe = document.getElementById('container') as HTMLIFrameElement;
  const mixedContainer = document.querySelector('.mixed-virus-container');
  const activeIframe = mixedContainer
    ? (mixedContainer.querySelector('iframe') as HTMLIFrameElement)
    : mainIframe;

  if (activeIframe?.contentWindow) {
    activeIframe.contentWindow.postMessage(
      {
        type: 'keyboardEvent',
        eventType,
        key: event.key,
        code: event.code,
        shiftKey: event.shiftKey,
        ctrlKey: event.ctrlKey,
        altKey: event.altKey,
        metaKey: event.metaKey,
      },
      '*'
    );
  }
}

document.onkeydown = e => {
  if (virusHasKeyboardControl) {
    forwardKeyboardEventToIframe(e, 'keydown');
  }
};

document.onkeyup = e => {
  if (e.key === 'Escape') {
    hideInfo();
    return;
  } else if (e.key === '?') {
    toggleInfo();
    return;
  }

  if (virusHasKeyboardControl) {
    forwardKeyboardEventToIframe(e, 'keyup');
    return;
  }

  if (e.key === 'ArrowRight') {
    safeGtag('event', 'skip_next_keyboard');
    vl.skipNext();
    resumePlayback();
  } else if (e.key === 'ArrowLeft') {
    safeGtag('event', 'skip_prev_keyboard');
    vl.skipPrev();
  } else if (e.key === ' ' || e.key === 'Spacebar') {
    togglePlayPause();
  } else if (e.key === 'r' || e.key === 'R') {
    safeGtag('event', 'reload_keyboard', {
      animation_name: playlist.current(),
    });
    vl.reloadCurrent();
  }
};

// Menu teleport
const iconEl = document.getElementById('icon');
if (iconEl) iconEl.onclick = () => teleportMenu();

// Title shuffle effect
setTimeout(function () {
  shuffleTitle();
}, 5000);

window.TVStaticLoading = TVStaticLoading;
