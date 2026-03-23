import * as Sentry from '@sentry/browser';

import { virus } from './ascii';
import Playlist from './components/Playlist';
import TVStaticLoading from './components/TVStaticLoading';
import VirusLoader from './components/VirusLoader';
import './sass/main.scss';
import { safeGtag } from './utils/gtag';
import { isKeyboardControlMessage } from './utils/keyboard-control';
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

  // Report icon font failures to Sentry. The inline script in index.html
  // sets __iconFontFailed and dispatches 'icon-font-failed' on failure.
  // Hybrid check: the flag handles failures before this listener registers;
  // the event handles failures that occur later (e.g. 3s timeout).
  if (window.__iconFontFailed) {
    Sentry.captureMessage(
      'Material Symbols icon font failed to load',
      'warning'
    );
  } else {
    window.addEventListener(
      'icon-font-failed',
      () => {
        Sentry.captureMessage(
          'Material Symbols icon font failed to load',
          'warning'
        );
      },
      { once: true }
    );
  }
}

console.log(
  `%c
  ${virus}
`,
  'color: #00ffff'
);

const playlist = new Playlist();
const vl = new VirusLoader(playlist);

// Keyboard control messages from iframe viruses
window.addEventListener('message', event => {
  if (event.origin !== window.location.origin) return;
  if (isKeyboardControlMessage(event.data)) {
    vl.virusHasKeyboardControl = event.data.enabled;
  }
});

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
  if (!vl.virusHasKeyboardControl) return;

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
      window.location.origin
    );
  }
}

document.onkeydown = e => {
  if (vl.virusHasKeyboardControl) {
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

  if (vl.virusHasKeyboardControl) {
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
let shuffleTitleInterval: ReturnType<typeof setInterval>;
setTimeout(function () {
  shuffleTitleInterval = shuffleTitle();
}, 5000);

window.addEventListener('beforeunload', () => {
  clearInterval(shuffleTitleInterval);
});

window.TVStaticLoading = TVStaticLoading;
