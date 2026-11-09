import * as Sentry from '@sentry/browser';

import Playlist from './Playlist';
import Stage from './stage/Stage';
import VirusLab from './VirusLab';
import { VirusLoaderInterface } from '../types/VirusLoaderInterface';
import { randomIntBetween } from '../utils/random';
import {
  NAVIGATION_LOCK_MS,
  RANDOMIZATION_MAX_S,
  RANDOMIZATION_MIN_S,
} from './constants';
import { safeGtag } from '../utils/gtag';
import { createLabButton, createThumbnailButton } from '../ui/floating-buttons';
import { createShareControl } from '../ui/share';

export default class VirusLoader implements VirusLoaderInterface {
  private stage: Stage;
  private loadRandomInterval: ReturnType<typeof setInterval> | undefined;
  private loadingRing: HTMLDivElement;
  private sourceCodeLink: HTMLAnchorElement | null;
  private shareControl: ReturnType<typeof createShareControl>;
  private virusLab: VirusLab | null = null;
  private isNavigating = false;
  virusHasKeyboardControl = false;

  private playlist: Playlist;

  constructor(playlist: Playlist) {
    this.playlist = playlist;

    const stageEl = document.getElementById('stage');
    if (!stageEl) {
      throw new Error('Required element #stage not found');
    }

    const loadingAnimEl = document.getElementById('loading-anim');
    if (!(loadingAnimEl instanceof HTMLDivElement)) {
      throw new Error('Required element #loading-anim not found');
    }

    const loadingRing = document.getElementById('loading-ring');
    if (!(loadingRing instanceof HTMLDivElement)) {
      throw new Error('Required element #loading-ring not found');
    }
    this.loadingRing = loadingRing;

    this.sourceCodeLink = document.querySelector('#source-code a');
    this.shareControl = createShareControl();
    this.stage = new Stage(stageEl, loadingAnimEl, () => this.onShown());

    const virusParam = new URLSearchParams(window.location.search).get('virus');

    if (virusParam && playlist.viruses.includes(virusParam)) {
      playlist.setCurrentVirus(virusParam);
      this.loadVirus(virusParam);
      this.pauseRandomization();
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

    createLabButton(this);
    createThumbnailButton(this, playlist);
  }

  get activeWindow(): WindowProxy | null {
    return this.stage.activeWindow;
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

  loadVirus(name: string) {
    this.virusHasKeyboardControl = false;

    this.shareControl?.startLoading(
      this.playlist.viruses.includes(name) ? name : null
    );

    if (import.meta.env.DEV) console.log('Loading virus:', name);
    this.setSourceCodeLinkVisible(false);
    this.loadingRing.classList.add('loading');

    const reloadBtn = document.getElementById('reload');
    if (reloadBtn) reloadBtn.classList.add('spinning');

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
          // loadSavedMixes regenerates the playlist and resets its position
          if (!name.startsWith('premix:')) this.playlist.setCurrentVirus(name);
          this.stage.show({
            virus: name,
            src: `/viruses/lab/?primary=${encodeURIComponent(mix.primary)}&secondary=${encodeURIComponent(mix.secondary)}&ratio=${encodeURIComponent(String(mix.mixRatio))}`,
            interactive: false,
          });
        } else {
          console.error('Mix not found for ID:', name);
          Sentry.captureMessage(`Mix not found for ID: ${name}`, 'error');
          this.showFallback();
        }
      } else {
        this.stage.show({
          virus: name,
          src: `/viruses/${name}/`,
          interactive: true,
        });
      }
    } catch (error) {
      console.error('Error loading virus:', error);
      Sentry.captureException(error);
      this.showFallback();
    }
  }

  /** shows the first virus instead, and makes the playlist and Share point at it */
  private showFallback() {
    const fallbackVirus = this.playlist.viruses[0] ?? 'random-shapes';
    this.playlist.setCurrentVirus(fallbackVirus);
    this.shareControl?.startLoading(fallbackVirus);
    this.stage.show({
      virus: fallbackVirus,
      src: `/viruses/${fallbackVirus}/`,
      interactive: true,
    });
  }

  private onShown() {
    const current = this.playlist.current();
    if (!this.playlist.isMixedVirus(current)) {
      this.setSourceCodeLinkVisible(true);
    }
    if (this.sourceCodeLink)
      this.sourceCodeLink.href = this.sourceCodeUrl(current);
    this.loadingRing.classList.remove('loading');
    const reloadBtn = document.getElementById('reload');
    if (reloadBtn) reloadBtn.classList.remove('spinning');
    this.shareControl?.finishLoading();
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
    // arrow keys and orientationchange still reach this with the lab open
    if (this.isNavigating || this.isLabOpen) return;
    this.isNavigating = true;

    const virus =
      direction === 'next' ? this.playlist.next() : this.playlist.prev();
    if (import.meta.env.DEV)
      console.log(`Skipping to ${direction} virus:`, virus);
    this.loadVirus(virus);
    this.startRandomization();

    setTimeout(() => {
      this.isNavigating = false;
    }, NAVIGATION_LOCK_MS);
  }

  get isLabOpen(): boolean {
    return this.virusLab !== null;
  }

  /** owns the button's `play_arrow` state so it can't disagree with a stopped rotation. */
  pauseRandomization(): void {
    clearInterval(this.loadRandomInterval);
    this.showPlayPause('play_arrow');
  }

  /**
   * keep one random rotation interval until the next call. owns the button's
   * `pause` state so it can't disagree with a running rotation.
   */
  startRandomization() {
    clearInterval(this.loadRandomInterval);
    const randomTime =
      randomIntBetween(RANDOMIZATION_MIN_S, RANDOMIZATION_MAX_S) * 1000;

    this.loadRandomInterval = setInterval(() => {
      const nextVirus = this.playlist.next();
      this.loadVirus(nextVirus);
    }, randomTime);

    this.showPlayPause('pause');
  }

  /** the icon names the action, so the label has to follow it for screen readers. */
  private showPlayPause(icon: 'pause' | 'play_arrow') {
    const playPauseBtn = document.getElementById('play-pause');
    if (!playPauseBtn) return;
    playPauseBtn.innerText = icon;
    playPauseBtn.setAttribute(
      'aria-label',
      icon === 'pause' ? 'Pause' : 'Play'
    );
  }

  private hideModals() {
    document.querySelectorAll('.modal.show').forEach(modal => {
      modal.classList.remove('show');
    });
  }

  toggleLab() {
    if (this.virusLab) {
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

      if (currentMix && currentMix.id) {
        this.loadVirus(`mixed:${currentMix.id}`);
      } else {
        this.loadVirus(this.playlist.current());
      }

      this.startRandomization();
    } else {
      this.stage.clear();
      this.pauseRandomization();
      const menuEl = document.getElementById('menu');
      if (menuEl) menuEl.style.display = 'none';
      this.hideModals();

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
    if (this.isNavigating || this.isLabOpen) return;
    this.isNavigating = true;

    const currentVirus = this.playlist.current();
    if (import.meta.env.DEV)
      console.log('Reloading current virus:', currentVirus);
    this.loadVirus(currentVirus);
    this.startRandomization();

    setTimeout(() => {
      this.isNavigating = false;
    }, NAVIGATION_LOCK_MS);
  }
}
