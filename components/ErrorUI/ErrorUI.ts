import "./error-ui.scss";
import Random from "../../utils/random";

export default class ErrorUI {
  el;
  text = "ERROR";
  numEls = 700;
  width = window.innerWidth;
  height = window.innerHeight;
  fillScreenTimeout: ReturnType<typeof setTimeout>;

  constructor(el: Element, text?: string) {
    this.el = el;
    if (text) {
      this.text = text.toUpperCase();
    }
  }

  start() {
    this.el.classList.add("disable-overflow");
    this.fillScreen();
  }

  stop() {
    clearTimeout(this.fillScreenTimeout);
    this.el.classList.remove("disable-overflow");
    this.clearScreen();
  }

  clearScreen() {
    const errors = this.el.querySelectorAll(".error");
    errors.forEach((e) => {
      this.el.removeChild(e);
    });
  }

  fillScreen() {
    this.fillScreenTimeout = setTimeout(() => {
      this.numEls--;
      this.appendError();
      if (this.numEls > 0) {
        this.fillScreen();
      }
    }, 1);
  }

  randomFontSize() {
    return `${Random.numberBetween(10, 100)}px`;
  }

  appendError() {
    const errorDiv = document.createElement("div");
    const coords = this.getRandomCoords();

    errorDiv.innerText = this.text;
    errorDiv.classList.add("error");
    errorDiv.style.top = `${coords.y}px`;
    errorDiv.style.left = `${coords.x}px`;
    errorDiv.style.fontSize = this.randomFontSize();

    const randomBool = Math.random() < 0.5;
    if (randomBool) {
      errorDiv.classList.add("vary");
    }

    this.el.append(errorDiv);
  }

  getRandomCoords() {
    const randomX = Random.int(this.width);
    const randomY = Random.int(this.height);

    return {
      x: randomX - 40,
      y: randomY - 40,
    };
  }
}
