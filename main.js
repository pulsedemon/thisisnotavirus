const viruses = ["random-blocks", "sphere", "uzumaki", "random-characters"];
import { preloadImage } from "./util.js";

preloadImage("/viruses/uzumaki/uzumaki.webp");

const random_times = [
  2000, 3000, 4000, 5000, 6000, 7000, 8000, 9000, 10000, 11000, 12000,
];

const params = new Proxy(new URLSearchParams(window.location.search), {
  get: (searchParams, prop) => searchParams.get(prop),
});

let loadRandomInterval;
const loadRandomVirus = () => {
  let randomVirus;
  if (getLastVirusLoaded() !== "flash") {
    randomVirus = "flash";
  } else {
    if (params.v !== null) {
      randomVirus = params.v;
    } else {
      randomVirus = viruses[Math.floor(Math.random() * viruses.length)];
    }
  }

  if (params.v === null && getLastVirusLoadedNotFlash() === randomVirus) {
    return loadRandomVirus();
  }

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
    setLastVirusLoadedNotFlash(randomVirus);
  }
  loadRandomInterval = setInterval(function () {
    return loadRandomVirus();
  }, random_time);

  if (randomVirus !== "flash") {
    let playPauseButton = document.getElementById("play-pause");

    if (params.v !== null) {
      playPauseButton.innerText = "play_arrow";
      window.history.replaceState(null, window.location.title, "/");
    }

    if (playPauseButton.innerText === "play_arrow") {
      clearInterval(loadRandomInterval);
    }
  }
};

const getLastVirusLoaded = () => {
  return localStorage.getItem("lastVirusLoaded");
};

const getLastVirusLoadedNotFlash = () => {
  return localStorage.getItem("lastVirusLoadedNotFlash");
};

const setLastVirusLoaded = (virus) => {
  return localStorage.setItem("lastVirusLoaded", virus);
};

const setLastVirusLoadedNotFlash = (virus) => {
  return localStorage.setItem("lastVirusLoadedNotFlash", virus);
};

loadRandomVirus();

window.addEventListener("orientationchange", function (event) {
  loadRandomVirus();
});

document.getElementById("play-pause").onclick = (e) => {
  if (e.target.innerText === "pause") {
    e.target.innerText = "play_arrow";
    clearInterval(loadRandomInterval);
  } else {
    e.target.innerText = "pause";
    loadRandomVirus();
  }
};

document.getElementById("skip-next").onclick = (e) => {
  clearInterval(loadRandomInterval);
  loadRandomVirus();
};
