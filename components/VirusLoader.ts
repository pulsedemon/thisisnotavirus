import * as Sentry from '@sentry/browser';

import Flash from './flash/flash';
import Playlist from './Playlist';
import TVStaticLoading from './TVStaticLoading';
import VirusLab from './VirusLab';
import { VirusLoaderInterface } from '../types/VirusLoaderInterface';
import { createStyledIframe } from '../utils/iframe';
import { randomIntBetween } from '../utils/random';
import { safeGtag } from '../utils/gtag';
import { createLabButton, createThumbnailButton } from '../ui/floating-buttons';

export default class VirusLoader implements VirusLoaderInterface {
  private iframe: HTMLIFrameElement;
  private loadRandomInterval: ReturnType<typeof setInterval> | undefined;
  private loadingAnimEl: HTMLDivElement;
  private loadingAnimStartTime = 0;
  private loadingAnim!: { start: () => void; stop: () => void };
  private loadingRing: HTMLDivElement;
  private sourceCodeLink: HTMLAnchorElement | null;
  private virusLab: VirusLab | null = null;
  private isNavigating = false;
  virusHasKeyboardControl = false;

  private playlist: Playlist;
  /**
   * Generation counter for cancelling stale iframe loads.
   * Each loadVirus() call increments this and captures the value locally.
   * All async callbacks (load, error, safety timeout, reveal delay) compare
   * their captured generation against the current value and bail out if a
   * newer load has superseded them.
   */
  private _loadGeneration = 0;
  private _pendingRevealTimeout: ReturnType<typeof setTimeout> | null = null;
  private _safetyTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor(playlist: Playlist) {
    this.playlist = playlist;

    const iframe = document.getElementById('container');
    if (!(iframe instanceof HTMLIFrameElement)) {
      throw new Error('Required element #container not found');
    }
    this.iframe = iframe;
    this.iframe.classList.add('virus-iframe');

    const loadingAnimEl = document.getElementById('loading-anim');
    if (!(loadingAnimEl instanceof HTMLDivElement)) {
      throw new Error('Required element #loading-anim not found');
    }
    this.loadingAnimEl = loadingAnimEl;

    const loadingRing = document.getElementById('loading-ring');
    if (!(loadingRing instanceof HTMLDivElement)) {
      throw new Error('Required element #loading-ring not found');
    }
    this.loadingRing = loadingRing;

    this.sourceCodeLink = document.querySelector('#source-code a');

    // Check for deep-link via ?virus= query parameter
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

  private setSourceCodeLinkVisible(visible: boolean) {
    if (visible) {
      this.sourceCodeLink?.classList.remove('hide');
    } else {
      this.sourceCodeLink?.classList.add('hide');
    }
    const sourceCodeEl = document.getElementById('source-code');
    if (sourceCodeEl) sourceCodeEl.style.display = visible ? '' : 'none';
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

    this.virusHasKeyboardControl = false;

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
    this.setSourceCodeLinkVisible(false);
    this.loadingRing.classList.add('loading');
    this.iframe.style.visibility = 'hidden';

    const reloadBtn = document.getElementById('reload');
    if (reloadBtn) reloadBtn.classList.add('spinning');

    // Clean up any existing mixed virus
    this.removeMixContainer();

    this._safetyTimeout = setTimeout(() => {
      if (generation !== this._loadGeneration) return;
      this._safetyTimeout = null;
      const msg = `Safety timeout: forcing loading animation to stop for virus: ${name}`;
      console.warn(msg);
      Sentry.captureMessage(msg, 'warning');
      this._delayedIframeLoaded(generation);
    }, 5000);

    try {
      if (this.playlist.isMixedVirus(name)) {
        let mix: ReturnType<typeof this.playlist.getMixById>;
        if (name.startsWith('premix:')) {
          mix = this.playlist.getPremixByName(name);
        } else {
          this.playlist.loadSavedMixes();
          mix = this.playlist.getMixById(name);
        }
        if (mix) {
          this.iframe.style.display = 'none';
          this.setSourceCodeLinkVisible(false);

          const mixContainer = document.createElement('div');
          mixContainer.className = 'mixed-virus-container';

          const mixFrame = createStyledIframe();
          mixFrame.style.visibility = 'hidden';
          mixFrame.src = `/viruses/lab/?primary=${encodeURIComponent(mix.primary)}&secondary=${encodeURIComponent(mix.secondary)}&ratio=${encodeURIComponent(String(mix.mixRatio))}`;

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
          const fallbackVirus = this.playlist.viruses[0] ?? 'random-shapes';
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
      const fallbackVirus = this.playlist.viruses[0] ?? 'random-shapes';
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

      if (!this.playlist.isMixedVirus(this.playlist.current())) {
        this.setSourceCodeLinkVisible(true);
      }
      if (this.sourceCodeLink)
        this.sourceCodeLink.href = this.sourceCodeUrl(this.playlist.current());
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

    const virus =
      direction === 'next' ? this.playlist.next() : this.playlist.prev();
    console.log(`Skipping to ${direction} virus:`, virus);
    this.loadVirus(virus);
    this.startRandomization();

    setTimeout(() => {
      this.isNavigating = false;
    }, 300);
  }

  get isLabOpen(): boolean {
    return this.virusLab !== null;
  }

  pauseRandomization(): void {
    clearInterval(this.loadRandomInterval);
  }

  /**
   * (Re)starts the random virus rotation. Picks a single random interval
   * (2-11s) that stays fixed until the next call.
   */
  startRandomization() {
    clearInterval(this.loadRandomInterval);
    const randomTime = randomIntBetween(2, 12) * 1000;

    this.loadRandomInterval = setInterval(() => {
      this.removeMixContainer();

      const nextVirus = this.playlist.next();
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
        this.playlist.setCurrentVirus(mixId);
      } else {
        this.iframe.style.display = 'block';
        this.loadVirus(this.playlist.current());
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

      document.body.appendChild(labContainer);
      this.virusLab = new VirusLab(labContainer, this.playlist);

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

    const currentVirus = this.playlist.current();
    console.log('Reloading current virus:', currentVirus);
    this.loadVirus(currentVirus);
    this.startRandomization();

    setTimeout(() => {
      this.isNavigating = false;
    }, 300);
  }
}
