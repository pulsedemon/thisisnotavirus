import { randomRgbColor } from '../../utils/random';
import { FLASH_INTERVAL_MS, FLASH_STOP_DELAY_MS } from '../constants';

export default class Flash {
  el: HTMLDivElement;
  animationInterval: ReturnType<typeof setInterval> | undefined;
  private stopTimeout: ReturnType<typeof setTimeout> | undefined;

  constructor(el: HTMLDivElement) {
    this.el = el;
  }

  start() {
    // a stop() still waiting would hide this run of the shared element
    clearTimeout(this.stopTimeout);
    clearInterval(this.animationInterval);
    this.el.style.display = 'block';
    this.animationInterval = setInterval(
      () => this.update(),
      FLASH_INTERVAL_MS
    );
  }

  stop() {
    clearTimeout(this.stopTimeout);
    this.stopTimeout = setTimeout(() => {
      clearInterval(this.animationInterval);
      this.el.style.display = 'none';
    }, FLASH_STOP_DELAY_MS);
  }

  update() {
    const randomColor = randomRgbColor();
    this.el.style.backgroundColor = 'rgb(' + randomColor + ')';
  }
}
