import "./error-like-text.scss";

import ErrorUI from "../../components/ErrorUI/ErrorUI";
import { randomIntBetween } from "../../utils/random";

class ErrorLikeText {
  constructor() {
    const container = document.getElementById("container");
    const texts = ["game over"];
    const errorUi = new ErrorUI(
      container!,
      texts[randomIntBetween(0, texts.length)]
    );
    errorUi.start();
  }
}

new ErrorLikeText();
