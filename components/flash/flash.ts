import { randomRgbColor } from '../../utils/random';
import { FLASH_INTERVAL_MS, FLASH_STOP_DELAY_MS } from '../constants';

export default class Flash {
  el: HTMLDivElement;
  animationInterval: ReturnType<typeof setInterval>;

  constructor(el: HTMLDivElement) {
    this.el = el;
  }

  start() {
    this.el.style.display = 'block';
    this.animationInterval = setInterval(
      () => this.update(),
      FLASH_INTERVAL_MS
    );
  }

  stop() {
    setTimeout(() => {
      clearInterval(this.animationInterval);
      this.el.style.display = 'none';
    }, FLASH_STOP_DELAY_MS);
  }

  update() {
    const randomColor = randomRgbColor();
    this.el.style.backgroundColor = 'rgb(' + randomColor + ')';
  }
}
