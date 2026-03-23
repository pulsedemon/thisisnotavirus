import { UAParser } from 'ua-parser-js';
import { randomInt } from './random';

const usparser = new UAParser();
let _isMobileCache: boolean | null = null;

export function isMobile(): boolean {
  if (_isMobileCache !== null) return _isMobileCache;

  const uaResult = usparser.getResult();
  const isUAMobile = uaResult.device.type === 'mobile';

  const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

  const isUserAgentMobile =
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );

  const isSmallScreen = window.innerWidth <= 768;

  const result = isUAMobile || isUserAgentMobile || (isSmallScreen && hasTouch);
  _isMobileCache = result;
  return result;
}

export function _resetIsMobileCache(): void {
  _isMobileCache = null;
}
export const browserName = usparser.getResult().browser.name;

export function preloadImage(url: string) {
  const img = new Image();
  img.src = url;
}

export function shuffle(array: string[]): string[] {
  let currentIndex = array.length,
    randomIndex;

  // While there remain elements to shuffle.
  while (currentIndex != 0) {
    // Pick a remaining element.
    randomIndex = randomInt(currentIndex);
    currentIndex--;

    // And swap it with the current element.
    [array[currentIndex], array[randomIndex]] = [
      array[randomIndex],
      array[currentIndex],
    ];
  }

  return array;
}

export function draggable(el: HTMLElement): () => void {
  const downEvent = isMobile() ? 'touchstart' : 'mousedown';
  const upEvent = isMobile() ? 'touchend' : 'mouseup';
  const moveEvent = isMobile() ? 'touchmove' : 'mousemove';

  let currentReset: (() => void) | null = null;

  function downHandler(e: MouseEvent | TouchEvent) {
    if (!isMobile()) e.preventDefault();
    if (!e.target) return;
    const target = e.target as HTMLElement;
    const clientY =
      e instanceof MouseEvent ? e.clientY : e.changedTouches[0].clientY;
    const clientX =
      e instanceof MouseEvent ? e.clientX : e.changedTouches[0].clientX;
    const offsetX = clientX - parseInt(window.getComputedStyle(target).left);
    const offsetY = clientY - parseInt(window.getComputedStyle(target).top);

    function moveHandler(e: MouseEvent | TouchEvent) {
      if (!el.isConnected) {
        reset();
        return;
      }
      if (!isMobile()) e.preventDefault();
      const clientY =
        e instanceof MouseEvent ? e.clientY : e.changedTouches[0].clientY;
      const clientX =
        e instanceof MouseEvent ? e.clientX : e.changedTouches[0].clientX;
      el.style.top = clientY - offsetY + 'px';
      el.style.left = clientX - offsetX + 'px';
    }

    function reset() {
      window.removeEventListener(moveEvent, moveHandler);
      window.removeEventListener(upEvent, reset);
      currentReset = null;
    }

    currentReset = reset;
    window.addEventListener(moveEvent, moveHandler);
    window.addEventListener(upEvent, reset);
  }

  el.addEventListener(downEvent, downHandler);

  return () => {
    el.removeEventListener(downEvent, downHandler);
    if (currentReset) currentReset();
  };
}

export function stripTags(str: string) {
  return str.replace(/(<([^>]+)>)/gi, '');
}

export function formatVirusName(name: string) {
  return name.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}
