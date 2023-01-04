const viruses = ["random-blocks", "sphere", "uzumaki"];
import { preloadImage } from "./util.js";

preloadImage("/viruses/uzumaki/uzumaki.webp");

const random_times = [
  2000, 3000, 4000, 5000, 6000, 7000, 8000, 9000, 10000, 11000, 12000,
];

let loadRandomInterval;
const loadRandomVirus = () => {
  let randomVirus;
  if (getLastVirusLoaded() !== "flash") {
    randomVirus = "flash";
  } else {
    randomVirus = viruses[Math.floor(Math.random() * viruses.length)];
  }

  if (getLastVirusLoaded() === randomVirus) return loadRandomVirus();

  document.getElementById(
    "container"
  ).src = `/viruses/${randomVirus}/index.html`;

  setLastVirusLoaded(randomVirus);

  clearInterval(loadRandomInterval);

  let random_time;
  let this_time;
  if (randomVirus === "flash") {
    random_time = 400;
  } else {
    this_time = Math.floor(Math.random() * random_times.length);
    random_time = random_times[this_time];
  }
  loadRandomInterval = setInterval(function () {
    return loadRandomVirus();
  }, random_time);
};

const getLastVirusLoaded = () => {
  return localStorage.getItem("lastVirusLoaded");
};

const setLastVirusLoaded = (virus) => {
  return localStorage.setItem("lastVirusLoaded", virus);
};

loadRandomVirus();

window.addEventListener("orientationchange", function (event) {
  loadRandomVirus();
});
