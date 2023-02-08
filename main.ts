import "./sass/main.scss";

const viruses = [
  "random-blocks",
  "sphere",
  "uzumaki",
  "random-characters",
  "buttons",
  "faces",
  "doors",
];
import { preloadImage, randomInt } from "./util";

preloadImage("/viruses/uzumaki/uzumaki.webp");
preloadImage("/viruses/faces/images/eye-blink.webp");
preloadImage("/viruses/faces/images/mouth.webp");

const random_times = [
  2000, 3000, 4000, 5000, 6000, 7000, 8000, 9000, 10000, 11000, 12000,
];

let params = new URLSearchParams(window.location.search);

let loadRandomInterval: any;
const loadRandomVirus = (specificVirusOverride?: string): void => {
  const vParam = params.get("v");
  let randomVirus;
  if (specificVirusOverride) {
    randomVirus = specificVirusOverride;
  } else if (getLastVirusLoaded() !== "flash") {
    randomVirus = "flash";
  } else {
    if (vParam !== null) {
      randomVirus = vParam;
    } else {
      randomVirus = viruses[randomInt(viruses.length)];
    }
  }

  if (vParam === null && getLastVirusLoadedNotFlash() === randomVirus) {
    return loadRandomVirus();
  }

  const iframe = <HTMLIFrameElement>document.getElementById("container");
  iframe.src = `/viruses/${randomVirus}/`;

  setLastVirusLoaded(randomVirus);

  clearInterval(loadRandomInterval);

  let random_time;
  let this_time;
  if (randomVirus === "flash") {
    random_time = 400;
  } else {
    this_time = randomInt(random_times.length);
    random_time = random_times[this_time];

    let previousVirus = getLastVirusLoadedNotFlash();
    if (specificVirusOverride) {
      localStorage.removeItem("previousVirusLoadedNotFlash");
      document.getElementById("skip-previous")!.classList.remove("show");
    } else if (previousVirus) {
      setPreviousVirusLoadedNotFlash(previousVirus);
    }

    setLastVirusLoadedNotFlash(randomVirus);
  }
  loadRandomInterval = setInterval(function () {
    return loadRandomVirus();
  }, random_time);

  if (randomVirus !== "flash") {
    let playPauseButton = document.getElementById("play-pause")!;

    if (vParam !== null) {
      playPauseButton.innerText = "play_arrow";
      window.history.replaceState({}, document.title, "/");
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

const setLastVirusLoaded = (virus: string) => {
  return localStorage.setItem("lastVirusLoaded", virus);
};

const setLastVirusLoadedNotFlash = (virus: string) => {
  return localStorage.setItem("lastVirusLoadedNotFlash", virus);
};

const getPreviousVirusLoadedNotFlash = () => {
  return localStorage.getItem("previousVirusLoadedNotFlash");
};

const setPreviousVirusLoadedNotFlash = (virus: string) => {
  let prevButton = document.getElementById("skip-previous")!;
  if (!prevButton.classList.contains("show")) {
    prevButton.classList.add("show");
  }
  return localStorage.setItem("previousVirusLoadedNotFlash", virus);
};

loadRandomVirus();

window.addEventListener("orientationchange", function () {
  loadRandomVirus();
});

document.getElementById("play-pause")!.onclick = (e) => {
  const target = <HTMLElement>e.target;
  if (target.innerText === "pause") {
    target.innerText = "play_arrow";
    clearInterval(loadRandomInterval);
    gtag("event", "pause", {
      animation_name: getLastVirusLoaded(),
    });
  } else {
    target.innerText = "pause";
    gtag("event", "play");
    loadRandomVirus();
  }
};

document.getElementById("skip-previous")!.onclick = () => {
  clearInterval(loadRandomInterval);
  gtag("event", "skip_previous");
  loadRandomVirus(getPreviousVirusLoadedNotFlash()!);
};

document.getElementById("skip-next")!.onclick = () => {
  clearInterval(loadRandomInterval);
  gtag("event", "skip_next");
  loadRandomVirus();
};

document.getElementById("info-btn")!.onclick = (e) => {
  const target = <HTMLElement>e.target;
  if (target.innerText === "info") {
    displayInfo();
  } else {
    hideInfo();
  }
};

function displayInfo() {
  document.getElementById("info")!.classList.add("show");
  document.getElementById("info-btn")!.innerText = "close";
  gtag("event", "display_info");
}

function hideInfo() {
  document.getElementById("info")!.classList.remove("show");
  document.getElementById("info-btn")!.innerText = "info";
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
}, 5000);

document.getElementById("icon")!.onclick = (e) => {
  const menu = document.getElementById("menu")!;

  let menuPositions = [
    "0px auto auto 0px",
    "0px 0px auto auto",
    "auto auto 0px 0px",
    "auto 0px 0px auto",
  ];

  if (menu.style.inset) {
    const index = menuPositions.indexOf(menu.style.inset);
    if (index > -1) {
      menuPositions.splice(index, 1);
    }
  } else {
    const index = menuPositions.indexOf("0px 0px auto auto");
    if (index > -1) {
      menuPositions.splice(index, 1);
    }
  }

  menu.style.inset = menuPositions[randomInt(menuPositions.length)];
};
