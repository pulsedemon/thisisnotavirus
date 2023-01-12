const viruses = ["random-blocks", "sphere", "uzumaki", "random-characters"];
import { preloadImage } from "./util.js";

preloadImage("/viruses/uzumaki/uzumaki.webp");

const random_times = [
  2000, 3000, 4000, 5000, 6000, 7000, 8000, 9000, 10000, 11000, 12000,
];

let params = new URLSearchParams(window.location.search);

let loadRandomInterval;
const loadRandomVirus = () => {
  const vParam = params.get("v");
  let randomVirus;
  if (getLastVirusLoaded() !== "flash") {
    randomVirus = "flash";
  } else {
    if (vParam !== null) {
      randomVirus = vParam;
    } else {
      randomVirus = viruses[Math.floor(Math.random() * viruses.length)];
    }
  }

  if (vParam === null && getLastVirusLoadedNotFlash() === randomVirus) {
    return loadRandomVirus();
  }

  document.getElementById("container").src = `/viruses/${randomVirus}`;

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

    if (vParam !== null) {
      playPauseButton.innerText = "play_arrow";
      window.history.replaceState({}, window.location.title, "/");
      params.delete("v");
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
    gtag("event", "pause", {
      animation_name: getLastVirusLoaded(),
    });
  } else {
    e.target.innerText = "pause";
    gtag("event", "play");
    loadRandomVirus();
  }
};

document.getElementById("skip-next").onclick = (e) => {
  clearInterval(loadRandomInterval);
  gtag("event", "skip_next");
  loadRandomVirus();
};

document.getElementById("info-btn").onclick = (e) => {
  if (e.target.innerText === "info") {
    displayInfo();
  } else {
    hideInfo();
  }
};

function displayInfo() {
  document.getElementById("info").classList.add("show");
  document.getElementById("info-btn").innerText = "close";
  gtag("event", "display_info");
}

function hideInfo() {
  document.getElementById("info").classList.remove("show");
  document.getElementById("info-btn").innerText = "info";
}

document.onkeyup = (e) => {
  if (e.key === "Escape") {
    hideInfo();
  }
};

function shuffleTitle() {
  const originalTitle = document.title;
  let intervalCounter = 0;
  setInterval(function () {
    intervalCounter++;
    if (intervalCounter % 5 === 0) {
      document.title = originalTitle;
      return;
    }
    document.title = document.title
      .split("")
      .sort(function () {
        return 0.5 - Math.random();
      })
      .join("");
  }, 200);
}

setTimeout(function () {
  shuffleTitle();
}, 2000);
