import { randomInt } from '../utils/random';
import { safeGtag } from '../utils/gtag';

export function toggleInfo(): void {
  const infoEl = document.querySelector('.modal.info-modal');
  if (!infoEl) return;

  if (infoEl.classList.contains('show')) {
    hideInfo();
  } else {
    displayInfo();
  }
}

export function displayInfo(): void {
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

export function teleportMenu(): void {
  const animationClassName = 'teleporting';
  const menu = document.getElementById('menu');
  if (!menu) return;

  const menuPositions = [
    '0px auto auto 0px',
    '0px 0px auto auto',
    'auto auto 0px 0px',
    'auto 0px 0px auto',
  ];

  const currentInset = menu.style.inset || '0px 0px auto auto';
  const index = menuPositions.indexOf(currentInset);
  if (index > -1) {
    menuPositions.splice(index, 1);
  }

  menu.classList.add(animationClassName);
  setTimeout(() => {
    menu.style.inset = menuPositions[randomInt(menuPositions.length)];
    setTimeout(() => {
      menu.classList.remove(animationClassName);
    }, 400);
  }, 300);

  safeGtag('event', 'v_icon_click');
}

export function shuffleTitle(): void {
  const originalTitle = document.title;
  let intervalCounter = 0;
  setInterval(function () {
    intervalCounter++;
    if (intervalCounter % 5 === 0) {
      document.title = originalTitle;
      return;
    }
    document.title = document.title
      .split('')
      .sort(function () {
        return 0.5 - Math.random();
      })
      .join('');
  }, 200);
}
