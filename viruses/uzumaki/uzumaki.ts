import { randomBool, randomItem } from "../../utils/random";
import "./uzumaki.scss";

const colors = [
  "#ff0000",
  "#00ffff",
  "#ffffff",
  "#FF80ED",
  "#FFD700",
  "#00FF00",
  "#00FF7F",
  "#FFFF66",
  "#8A2BE2",
  "#CCFF00",
  "#8458B3",
  "#ff1d58",
  "#f75990",
];
const randomizeBgContinuously = randomBool();
let randomColor;

if (randomizeBgContinuously) {
  setInterval(() => {
    randomColor = randomItem(colors);
    document.body.style.backgroundColor = randomColor;
  }, 200);
} else {
  randomColor = randomItem(colors);
  document.body.style.backgroundColor = randomColor;
}
