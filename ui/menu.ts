import { randomInt } from '../utils/random';
import { safeGtag } from '../utils/gtag';
import { shuffle } from '../utils/misc';

export function toggleInfo(): void {
  const infoEl = document.querySelector('.modal.info-modal');
  if (!infoEl) return;

  if (infoEl.classList.contains('show')) {
    hideInfo();
  } else {
    displayInfo();
  }
}

function displayInfo(): void {
  document.querySelector('.modal.info-modal')?.classList.add('show');
  const infoBtn = document.getElementById('info-btn');
  if (infoBtn) infoBtn.innerText = 'close';
  safeGtag('event', 'display_info');
}

export function hideInfo(): void {
  document.querySelector('.modal.info-modal')?.classList.remove('show');
  const infoBtn = document.getElementById('info-btn');
  if (infoBtn) infoBtn.innerText = 'info';
}

const MENU_POSITIONS = [
  '0px auto auto 0px',
  '0px 0px auto auto',
  'auto auto 0px 0px',
  'auto 0px 0px auto',
] as const;

// the menu starts top-right
let currentMenuPositionIdx = 1;

export function teleportMenu(): void {
  const animationClassName = 'teleporting';
  const menu = document.getElementById('menu');
  if (!menu) return;

  // style.inset serializes differently across browsers, so track the position by index
  const candidates = MENU_POSITIONS.map((_, i) => i).filter(
    i => i !== currentMenuPositionIdx
  );
  const nextIdx = candidates[randomInt(candidates.length)];

  menu.classList.add(animationClassName);
  setTimeout(() => {
    currentMenuPositionIdx = nextIdx;
    menu.style.inset = MENU_POSITIONS[nextIdx];
    setTimeout(() => {
      menu.classList.remove(animationClassName);
    }, 400);
  }, 300);

  safeGtag('event', 'v_icon_click');
}

/** returns a stop function that also restores the title */
export function shuffleTitle(): () => void {
  const originalTitle = document.title;
  let intervalCounter = 0;
  const interval = setInterval(function () {
    intervalCounter++;
    if (intervalCounter % 5 === 0) {
      document.title = originalTitle;
      return;
    }
    document.title = shuffle(document.title.split('')).join('');
  }, 200);

  return () => {
    clearInterval(interval);
    document.title = originalTitle;
  };
}
