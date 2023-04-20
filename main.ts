import * as Sentry from "@sentry/browser";
import { BrowserTracing } from "@sentry/tracing";

import "./sass/main.scss";
import { virus } from "./ascii";
import Flash from "./components/flash/flash";
import { preloadImage, randomInt, randomNumberBetween } from "./util";
import Playlist from "./components/Playlist";
import Comments from "./components/comments/Comments";
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

preloadImage("/viruses/uzumaki/uzumaki.webp");
preloadImage("/viruses/faces/images/eye-blink.webp");

class VirusLoader {
  iframe = <HTMLIFrameElement>document.getElementById("container");
  loadRandomInterval: any;
  loadingAnimEl: HTMLCanvasElement = document.getElementById(
    "loading-anim"
  ) as HTMLCanvasElement;
  loadingAnim;

  constructor() {
    this.loadingAnim = new Flash(this.loadingAnimEl);
    this.loading(true);
    console.log("this.loadingAnim", this.loadingAnim);
    this.loadVirus(playlist.current());
    this.startRandomization();
  }

  loading(state: boolean) {
    let display;
    if (state) {
      display = "block";
    } else {
      display = "none";
    }

    this.loadingAnimEl.style.display = display;
  }

  loadVirus(name: string) {
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
  clearInterval(vl.loadRandomInterval);
  gtag("event", "skip_previous");
  vl.skipPrev();
};

document.getElementById("play-pause")!.onclick = (e) => {
  const target = <HTMLElement>e.target;
  if (target.innerText === "pause") {
    target.innerText = "play_arrow";
    clearInterval(vl.loadRandomInterval);
    gtag("event", "pause", {
      animation_name: playlist.current(),
    });
  } else {
    target.innerText = "pause";
    gtag("event", "play");
    vl.skipNext();
  }
};

document.getElementById("skip-next")!.onclick = () => {
  gtag("event", "skip_next");
  vl.skipNext();

  const playButton = document.getElementById("play-pause")!;
  if (playButton.innerText === "play_arrow") {
    playButton.innerText = "pause";
  }
};

document.getElementById("info-btn")!.onclick = (e) => {
  const target = <HTMLElement>e.target;
  if (target.innerText === "info") {
    displayInfo();
    // hideComments();
  } else {
    hideInfo();
  }
};

// document.getElementById("comments-btn")!.onclick = (e) => {
//   const target = <HTMLElement>e.target;
//   if (target.innerText === "comment") {
//     displayComments();
//     hideInfo();
//   } else {
//     hideComments();
//   }
// };

function displayInfo() {
  document.querySelector(".modal.info-modal")!.classList.add("show");
  document.getElementById("info-btn")!.innerText = "close";
  gtag("event", "display_info");
}

function hideInfo() {
  document.querySelector(".modal.info-modal")!.classList.remove("show");
  document.getElementById("info-btn")!.innerText = "info";
}

function displayComments() {
  document.querySelector(".modal.comments-modal")!.classList.add("show");
  document.getElementById("comments-btn")!.innerText = "close";
  new Comments();
  gtag("event", "display_comments");
}

function hideComments() {
  document.querySelector(".modal.comments-modal")!.classList.remove("show");
  document.getElementById("comments-btn")!.innerText = "comment";
}

document.onkeyup = (e) => {
  if (e.key === "Escape") {
    hideInfo();
    // hideComments();
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
