import { randomNumberBetween } from "../../util";
import "./uzumaki.scss";

const imageUrl = `/viruses/uzumaki/uzumaki.webp`;
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
const randomizeBgContinuously =
  randomNumberBetween(1, 10) % 2 === 0 ? true : false;
let randomColor = colors[Math.floor(Math.random() * colors.length)];
if (randomizeBgContinuously) {
  setInterval(() => {
    randomColor = colors[Math.floor(Math.random() * colors.length)];
    document.body.style.backgroundColor = randomColor;
  }, 200);
} else {
  document.body.style.backgroundColor = randomColor;
}

const css =
  "#container::before { background-image: " + `url(${imageUrl})` + "; }');";
let styleSheet = document.createElement("style");
styleSheet.innerText = css;
document.head.appendChild(styleSheet);
