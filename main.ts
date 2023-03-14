import "./sass/main.scss";
import { virus } from "./ascii";
import { preloadImage, randomInt, randomNumberBetween } from "./util";
import Playlist from "./components/Playlist";
import Comments from "./components/comments/Comments";

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
  lastLoaded: string = "flash";
  iframe = <HTMLIFrameElement>document.getElementById("container");
  loadRandomInterval: any;

  constructor() {
    this.loadVirus(playlist.current());
    this.startRandomization();
  }

  loadVirus(name: string) {
    this.iframe.src = `/viruses/${name}/`;
    this.lastLoaded = name;
  }

  skipNext() {
    this.loadVirus("flash");
    this.startRandomization();
  }

  skipPrev() {
    this.loadVirus("flash");
    playlist.prev();
    this.startRandomization(playlist.current());
  }

  startRandomization(name?: string) {
    clearInterval(this.loadRandomInterval);

    let randomTime = randomNumberBetween(2, 12) * 1000;

    let virusToLoad: string;
    if (this.lastLoaded !== "flash") {
      virusToLoad = "flash";
    } else if (name) {
      virusToLoad = name;
      randomTime = 400;
    } else {
      virusToLoad = playlist.next();
      randomTime = 400;
    }

    this.loadRandomInterval = setInterval(() => {
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
      animation_name: vl.lastLoaded,
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
  } else {
    hideInfo();
  }
};

document.getElementById("comments-btn")!.onclick = (e) => {
  const target = <HTMLElement>e.target;
  if (target.innerText === "comment") {
    displayComments();
  } else {
    hideComments();
  }
};

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

displayComments();

function hideComments() {
  document.querySelector(".modal.comments-modal")!.classList.remove("show");
  document.getElementById("comments-btn")!.innerText = "comment";
}

document.onkeyup = (e) => {
  if (e.key === "Escape") {
    hideInfo();
    hideComments();
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
