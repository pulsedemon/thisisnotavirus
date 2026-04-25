import * as Sentry from '@sentry/browser';

import { virus } from './ascii';
import Playlist from './components/Playlist';
import TVStaticLoading from './components/TVStaticLoading';
import ExperienceController from './engine/ExperienceController';
import './sass/main.scss';
import { safeGtag } from './utils/gtag';
import { initFullscreen } from './ui/fullscreen';
import { toggleInfo, hideInfo, teleportMenu, shuffleTitle } from './ui/menu';

declare global {
  interface Window {
    TVStaticLoading?: typeof TVStaticLoading;
    __iconFontFailed?: boolean;
  }
}

// Production-only Sentry boot.
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

  // Report icon font failures (set by inline script in index.html).
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
const experience = new ExperienceController(playlist);

// Menu button handlers
const skipPrevBtn = document.getElementById('skip-previous');
if (skipPrevBtn) {
  skipPrevBtn.onclick = () => {
    safeGtag('event', 'skip_previous');
    experience.skipPrev();
  };
}

function togglePlayPause() {
  const playPauseBtn = document.getElementById('play-pause');
  if (!playPauseBtn) return;
  if (playPauseBtn.innerText === 'pause') {
    playPauseBtn.innerText = 'play_arrow';
    experience.pauseRandomization();
    safeGtag('event', 'pause', {
      animation_name: playlist.current(),
    });
  } else {
    playPauseBtn.innerText = 'pause';
    safeGtag('event', 'play');
    experience.skipNext();
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
    experience.skipNext();
    resumePlayback();
  };

const reloadBtn = document.getElementById('reload');
if (reloadBtn)
  reloadBtn.onclick = () => {
    safeGtag('event', 'reload', {
      animation_name: playlist.current(),
    });
    experience.reloadCurrent();
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

document.onkeydown = e => {
  if (experience.virusHasKeyboardControl) {
    experience.routeKeyboardEvent(e, 'keydown');
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

  if (experience.virusHasKeyboardControl) {
    experience.routeKeyboardEvent(e, 'keyup');
    return;
  }

  if (e.key === 'ArrowRight') {
    safeGtag('event', 'skip_next_keyboard');
    experience.skipNext();
    resumePlayback();
  } else if (e.key === 'ArrowLeft') {
    safeGtag('event', 'skip_prev_keyboard');
    experience.skipPrev();
  } else if (e.key === ' ' || e.key === 'Spacebar') {
    togglePlayPause();
  } else if (e.key === 'r' || e.key === 'R') {
    safeGtag('event', 'reload_keyboard', {
      animation_name: playlist.current(),
    });
    experience.reloadCurrent();
  }
};

// Menu teleport
const iconEl = document.getElementById('icon');
if (iconEl) iconEl.onclick = () => teleportMenu();

// Title shuffle effect
let shuffleTitleInterval: ReturnType<typeof setInterval> | undefined;
setTimeout(function () {
  shuffleTitleInterval = shuffleTitle();
}, 5000);

window.addEventListener('beforeunload', () => {
  clearInterval(shuffleTitleInterval);
});

window.TVStaticLoading = TVStaticLoading;
