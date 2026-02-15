import * as Sentry from '@sentry/browser';
import { isMobile } from '../utils/misc';
import { safeGtag } from '../utils/gtag';

export const FULLSCREEN = {
  isActive: (): boolean => {
    const doc = document as Document & {
      fullscreenElement?: Element;
      webkitFullscreenElement?: Element;
      mozFullScreenElement?: Element;
      msFullscreenElement?: Element;
    };
    return !!(
      doc.fullscreenElement ||
      doc.webkitFullscreenElement ||
      doc.mozFullScreenElement ||
      doc.msFullscreenElement
    );
  },

  toggleUI: (show: boolean): void => {
    const elements = ['menu', 'lab-btn', 'thumbnail-btn', 'source-code'];
    elements.forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.style.opacity = show ? '1' : '0';
        el.style.pointerEvents = show ? 'auto' : 'none';
      }
    });
  },

  async callMethod(
    obj: Record<string, unknown>,
    methods: string[]
  ): Promise<boolean> {
    const methodName = methods.find(m => typeof obj[m] === 'function');
    if (methodName) {
      await (obj[methodName] as () => Promise<void>)();
      return true;
    }
    console.warn('Fullscreen: no supported method found among', methods);
    return false;
  },

  async enter(el: HTMLElement): Promise<boolean> {
    return FULLSCREEN.callMethod(el as unknown as Record<string, unknown>, [
      'requestFullscreen',
      'webkitRequestFullscreen',
      'mozRequestFullScreen',
      'msRequestFullscreen',
    ]);
  },

  async exit(): Promise<boolean> {
    return FULLSCREEN.callMethod(
      document as unknown as Record<string, unknown>,
      [
        'exitFullscreen',
        'webkitExitFullscreen',
        'mozCancelFullScreen',
        'msExitFullscreen',
      ]
    );
  },
};

export function initFullscreen(): void {
  if (isMobile()) return;

  const fullscreenBtn = document.createElement('span');
  fullscreenBtn.id = 'fullscreen';
  fullscreenBtn.className = 'material-symbols-outlined';
  fullscreenBtn.textContent = 'fullscreen';
  fullscreenBtn.title = 'Toggle Fullscreen';
  const controls = document.querySelector('#menu .controls');
  if (!controls) {
    console.warn('initFullscreen: #menu .controls not found, skipping');
    return;
  }
  controls.appendChild(fullscreenBtn);

  fullscreenBtn.onclick = async () => {
    const doc = document.documentElement;
    let succeeded = false;
    const entering = !FULLSCREEN.isActive();

    try {
      succeeded = entering
        ? await FULLSCREEN.enter(doc)
        : await FULLSCREEN.exit();
    } catch (error) {
      console.error('Fullscreen error:', error);
      Sentry.captureException(error);
    }

    if (succeeded) {
      fullscreenBtn.textContent = entering ? 'fullscreen_exit' : 'fullscreen';
      safeGtag('event', entering ? 'enter_fullscreen' : 'exit_fullscreen');
    }
  };

  document.addEventListener('fullscreenchange', () => {
    const isFullscreen = FULLSCREEN.isActive();
    fullscreenBtn.textContent = isFullscreen ? 'fullscreen_exit' : 'fullscreen';
    FULLSCREEN.toggleUI(!isFullscreen);
  });
}
