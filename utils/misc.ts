import { UAParser } from "ua-parser-js";
import Random from "./random";

const usparser = new UAParser();

/**
 * Comprehensive mobile device detection
 * Uses multiple detection methods for better accuracy
 */
export function isMobile(): boolean {
  // Check user agent
  const uaResult = usparser.getResult();
  const isUAMobile = uaResult.device.type === "mobile";

  // Check for touch capabilities
  const hasTouch = "ontouchstart" in window || navigator.maxTouchPoints > 0;

  // Check user agent string for mobile patterns
  const isUserAgentMobile =
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent,
    );

  // Check for small screen sizes (common mobile breakpoints)
  const isSmallScreen = window.innerWidth <= 768;

  // Consider it mobile if any of these conditions are true
  return isUAMobile || hasTouch || isUserAgentMobile || isSmallScreen;
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
    randomIndex = Random.int(currentIndex);
    currentIndex--;

    // And swap it with the current element.
    [array[currentIndex], array[randomIndex]] = [
      array[randomIndex],
      array[currentIndex],
    ];
  }

  return array;
}

export function draggable(el: HTMLElement) {
  const downEvent = isMobile() ? "touchstart" : "mousedown";
  const upEvent = isMobile() ? "touchend" : "mouseup";
  const moveEvent = isMobile() ? "touchmove" : "mousemove";

  el.addEventListener(downEvent, function (e: MouseEvent | TouchEvent) {
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
      if (!isMobile()) e.preventDefault();
      const clientY =
        e instanceof MouseEvent ? e.clientY : e.changedTouches[0].clientY;
      const clientX =
        e instanceof MouseEvent ? e.clientX : e.changedTouches[0].clientX;
      el.style.top = clientY - offsetY + "px";
      el.style.left = clientX - offsetX + "px";
    }

    function reset() {
      window.removeEventListener(moveEvent, moveHandler);
      window.removeEventListener(upEvent, reset);
    }

    window.addEventListener(moveEvent, moveHandler);
    window.addEventListener(upEvent, reset);
  });
}

export function stripTags(str: string) {
  return str.replace(/(<([^>]+)>)/gi, "");
}

// export async function checkResponse(response: Response) {
//   const status = response.status;
//   if (response.ok) {
//     return response.json();
//   } else {
//     return response.json().then((response) => {
//       throw {
//         error: response.detail,
//         status: status,
//       };
//     });
//   }
// }

export function formatVirusName(name: string) {
  return name.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}
