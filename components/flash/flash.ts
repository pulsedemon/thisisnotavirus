import Random from "../../utils/random";

export default class Flash {
  el: HTMLDivElement;
  animationInterval: ReturnType<typeof setInterval>;

  constructor(el: HTMLDivElement) {
    this.el = el;
  }

  start() {
    this.el.style.display = "block";
    this.animationInterval = setInterval(() => this.update(), 100);
  }

  stop() {
    setTimeout(() => {
      clearInterval(this.animationInterval);
      this.el.style.display = "none";
    }, 200);
  }

  update() {
    const randomColor = Random.rgbColor();
    this.el.style.backgroundColor = "rgb(" + randomColor + ")";
  }
}
