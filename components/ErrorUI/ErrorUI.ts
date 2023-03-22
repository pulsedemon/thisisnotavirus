import { randomInt, randomNumberBetween } from "../../util";
import "./error-ui.scss";

export default class ErrorUI {
  el;
  text = "ERROR";
  numEls = 500;
  width = window.innerWidth;
  height = window.innerHeight;
  constructor(el) {
    this.el = el;
    console.log("el", el);
    this.fillScreen();
  }

  fillScreen() {
    setTimeout(() => {
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
    errorDiv.innerText = this.text;
    errorDiv.classList.add("error");
    const coords = this.getRandomCoords();
    console.log("coords", coords);
    errorDiv.style.top = `${coords.y}px`;
    errorDiv.style.left = `${coords.x}px`;
    errorDiv.style.fontSize = this.randomFontSize();

    this.el.append(errorDiv);
    console.log("dfkrgmk");
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
