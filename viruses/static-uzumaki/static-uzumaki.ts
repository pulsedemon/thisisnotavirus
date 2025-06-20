import TVStaticLoading from "../../components/TVStaticLoading";
import Random from "../../utils/random";
import "./static-uzumaki.scss";

// Initialize TV static effect
const tvStatic = new TVStaticLoading();
tvStatic.show();

// Color changing background effect
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

const randomizeBgContinuously = Random.bool();
let randomColor;

if (randomizeBgContinuously) {
  setInterval(() => {
    randomColor = Random.itemInArray(colors);
    document.body.style.backgroundColor = randomColor;
  }, 200);
} else {
  randomColor = Random.itemInArray(colors);
  document.body.style.backgroundColor = randomColor;
}
