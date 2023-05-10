import * as Sentry from "@sentry/browser";
import { BrowserTracing } from "@sentry/tracing";

import "./sass/main.scss";
import { virus } from "./ascii";
import Flash from "./components/flash/flash";
import { randomInt, randomNumberBetween } from "./util";
import Playlist from "./components/Playlist";

// @ts-ignore
import gtag from "gtag";

Sentry.init({
  dsn: "https://2cead2fbc81748d68231d7729b5812f9@o4504890125582336.ingest.sentry.io/4504890229194752",
  integrations: [new BrowserTracing()],

  // Set tracesSampleRate to 1.0 to capture 100%
  // of transactions for performance monitoring.
  // We recommend adjusting this value in production
  tracesSampleRate: 0.5,
});

console.log(
  `%c
  ${virus}
`,
  "color: #00ffff"
);

const playlist = new Playlist();

class VirusLoader {
  iframe = <HTMLIFrameElement>document.getElementById("container");
  loadRandomInterval: any;
  loadingAnimEl: HTMLDivElement = document.getElementById(
    "loading-anim"
  ) as HTMLDivElement;
  loadingAnim;

  constructor() {
    this.loadingAnim = new Flash(this.loadingAnimEl);
    this.iframe.addEventListener("load", this.iframeLoaded.bind(this));
    this.loadVirus(playlist.current());
    this.startRandomization();
  }

  iframeLoaded() {
    this.loadingAnim.stop();
  }

  loadVirus(name: string) {
    this.loadingAnim.start();
    this.iframe.src = `/viruses/${name}/`;
  }

  skipNext() {
    this.loadVirus(playlist.next());
    this.startRandomization();
  }

  skipPrev() {
    this.loadVirus(playlist.prev());
    this.startRandomization();
  }

  startRandomization(name?: string) {
    clearInterval(this.loadRandomInterval);

    let randomTime = randomNumberBetween(2, 12) * 1000;
    let virusToLoad: string;

    this.loadRandomInterval = setInterval(() => {
      if (name) {
        virusToLoad = name;
      } else {
        virusToLoad = playlist.next();
      }
      this.loadVirus(virusToLoad);
      this.startRandomization();
    }, randomTime);
  }
}

const vl = new VirusLoader();

window.addEventListener("orientationchange", function () {
  vl.skipNext();
});

document.getElementById("skip-previous")!.onclick = () => {
  gtag("event", "skip_previous");
  vl.skipPrev();
};

function togglePlayPause() {
  const playPauseBtn = document.getElementById("play-pause")!;
  if (playPauseBtn.innerText === "pause") {
    playPauseBtn.innerText = "play_arrow";
    clearInterval(vl.loadRandomInterval);
    gtag("event", "pause", {
      animation_name: playlist.current(),
    });
  } else {
    playPauseBtn.innerText = "pause";
    gtag("event", "play");
    vl.skipNext();
  }
}

document.getElementById("play-pause")!.onclick = togglePlayPause;

function resumePlayback() {
  const playButton = document.getElementById("play-pause")!;
  if (playButton.innerText === "play_arrow") {
    playButton.innerText = "pause";
  }
}

document.getElementById("skip-next")!.onclick = () => {
  gtag("event", "skip_next");
  vl.skipNext();

  resumePlayback();
};

document.getElementById("info-btn")!.onclick = (e) => {
  const target = <HTMLElement>e.target;
  toggleInfo();
};

function toggleInfo() {
  const infoEl = document.querySelector(".modal.info-modal")!;

  if (infoEl.classList.contains("show")) {
    hideInfo();
  } else {
    displayInfo();
  }
}

function displayInfo() {
  document.querySelector(".modal.info-modal")!.classList.add("show");
  document.getElementById("info-btn")!.innerText = "close";
  gtag("event", "display_info");
}

function hideInfo() {
  document.querySelector(".modal.info-modal")!.classList.remove("show");
  document.getElementById("info-btn")!.innerText = "info";
}

document.onkeyup = (e) => {
  if (e.key === "Escape") {
    hideInfo();
    // hideComments();
  } else if (e.key === "ArrowRight") {
    gtag("event", "skip_next_keyboard");
    vl.skipNext();
    resumePlayback();
  } else if (e.key === "ArrowLeft") {
    gtag("event", "skip_prev_keyboard");
    vl.skipPrev();
  } else if (e.key === " " || e.key === "Spacebar") {
    togglePlayPause();
  } else if (e.key === "?") {
    toggleInfo();
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

document.getElementById("icon")!.onclick = () => {
  teleportMenu();
};

function teleportMenu() {
  const animationClassName = "teleporting";
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

  menu.classList.add(animationClassName);
  setTimeout(() => {
    menu.style.inset = menuPositions[randomInt(menuPositions.length)];
    setTimeout(() => {
      menu.classList.remove(animationClassName);
    }, 400);
  }, 300);

  gtag("event", "v_icon_click");
}
