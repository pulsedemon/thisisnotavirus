import UAParser from "ua-parser-js";
import Random from "./random";

const usparser = new UAParser();
export const isMobile =
  usparser.getResult().device.type === "mobile" ? true : false;
export const browserName = usparser.getResult().browser.name;

export function preloadImage(url: string) {
  let img = new Image();
  img.src = url;
}

export function shuffle(array: any[]): any[] {
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

export function draggable(el: any) {
  const downEvent = isMobile ? "touchstart" : "mousedown";
  const upEvent = isMobile ? "touchend" : "mouseup";
  const moveEvent = isMobile ? "touchmove" : "mousemove";

  el.addEventListener(downEvent, function (e: any) {
    if (!isMobile) e.preventDefault();
    const clientY = e.clientY || e.changedTouches[0].clientY;
    const clientX = e.clientX || e.changedTouches[0].clientX;
    const offsetX = clientX - parseInt(window.getComputedStyle(e.target).left);
    const offsetY = clientY - parseInt(window.getComputedStyle(e.target).top);

    function moveHandler(e: any) {
      if (!isMobile) e.preventDefault();
      const clientY = e.clientY || e.changedTouches[0].clientY;
      const clientX = e.clientX || e.changedTouches[0].clientX;
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

export async function checkResponse(response: Response) {
  const status = response.status;
  if (response.ok) {
    return response.json();
  } else {
    return response.json().then((response) => {
      throw {
        error: response.detail,
        status: status,
      };
    });
  }
}
