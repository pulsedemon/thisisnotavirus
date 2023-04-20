import "./error-like-text.scss";

import ErrorUI from "../../components/ErrorUI/ErrorUI";
import { randomNumberBetween } from "../../util";

class ErrorLikeText {
  constructor() {
    const container = document.getElementById("container");
    const texts = ["game over"];
    const errorUi = new ErrorUI(
      container!,
      texts[randomNumberBetween(0, texts.length)]
    );
    errorUi.start();
  }
}

new ErrorLikeText();
