export default class Flash {
  el: HTMLDivElement;
  animationInterval: any;

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
    const randomColor = this.randomColor();
    this.el.style.backgroundColor = "rgb(" + randomColor + ")";
  }

  randomColor() {
    return (
      "" +
      (Math.round(Math.random() * 256) +
        "," +
        Math.round(Math.random() * 256) +
        "," +
        Math.round(Math.random() * 256))
    );
  }
}
