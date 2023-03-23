import "./error-ui.scss";
import { randomInt, randomNumberBetween } from "../../util";

export default class ErrorUI {
  el;
  text = "ERROR";
  numEls = 600;
  width = window.innerWidth;
  height = window.innerHeight;
  fillScreenTimeout: any;

  constructor(el: Element) {
    this.el = el;
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
    errors.forEach((e, i) => {
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
    return `${randomNumberBetween(10, 100)}px`;
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
    const randomX = randomInt(this.width);
    const randomY = randomInt(this.height);

    return {
      x: randomX - 40,
      y: randomY - 40,
    };
  }
}
