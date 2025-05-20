import * as Sentry from "@sentry/browser";

import { virus } from "./ascii";
import Flash from "./components/flash/flash";
import Playlist from "./components/Playlist";
import VirusLab from "./components/VirusLab";
import "./sass/main.scss";
import Random from "./utils/random";

declare let gtag: (
  eventName: string,
  eventType: string,
  options?: object
) => void;

Sentry.init({
  dsn: "https://2cead2fbc81748d68231d7729b5812f9@o4504890125582336.ingest.sentry.io/4504890229194752",
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.browserProfilingIntegration(),
  ],
  tracesSampleRate: 1.0,
  profilesSampleRate: 1.0,
});

console.log(
  `%c
  ${virus}
`,
  "color: #00ffff"
);

const playlist = new Playlist();

class VirusLoader {
  iframe: HTMLIFrameElement;
  loadRandomInterval: ReturnType<typeof setInterval>;
  loadingAnimEl: HTMLDivElement = document.getElementById(
    "loading-anim"
  ) as HTMLDivElement;
  loadingAnim;
  loadingRing: HTMLDivElement = document.getElementById(
    "loading-ring"
  ) as HTMLDivElement;
  sourceCodeLink: HTMLAnchorElement = document.querySelector("#source-code a")!;
  virusLab: VirusLab | null = null;

  constructor() {
    this.loadingAnim = new Flash(this.loadingAnimEl);

    // Get the container iframe
    this.iframe = document.getElementById("container") as HTMLIFrameElement;
    this.iframe.style.width = "100%";
    this.iframe.style.height = "100%";
    this.iframe.style.border = "none";
    this.iframe.style.position = "absolute";
    this.iframe.style.top = "0";
    this.iframe.style.left = "0";
    this.iframe.style.background = "#000";

    // We'll add the load event listener dynamically when loading viruses
    this.loadVirus(playlist.current());
    this.startRandomization();

    this.sourceCodeLink.addEventListener("click", () => {
      gtag("event", "source-click", {
        animation_name: playlist.current(),
      });
    });

    // Add lab button
    const labButton = document.createElement("button");
    labButton.id = "lab-btn";
    labButton.innerHTML = "🧪";
    labButton.title = "Virus Lab";
    labButton.className = "lab-button";
    labButton.style.position = "fixed";
    labButton.style.bottom = "20px";
    labButton.style.right = "20px";
    labButton.style.width = "50px";
    labButton.style.height = "50px";
    labButton.style.borderRadius = "50%";
    labButton.style.background = "#00ffff";
    labButton.style.border = "none";
    labButton.style.color = "#000";
    labButton.style.fontSize = "24px";
    labButton.style.cursor = "pointer";
    labButton.style.zIndex = "2000";
    labButton.style.transition = "all 0.3s ease";
    labButton.style.boxShadow = "0 2px 10px rgba(0, 255, 255, 0.3)";
    document.body.appendChild(labButton);

    labButton.addEventListener("click", () => this.toggleLab());
  }

  loadVirus(name: string) {
    console.log("Loading virus:", name);
    this.loadingAnim.start();
    this.sourceCodeLink?.classList.add("hide");
    this.loadingRing.classList.add("loading");

    // Clean up any existing mixed virus
    const existingMixContainer = document.querySelector(
      ".mixed-virus-container"
    );
    if (existingMixContainer) {
      existingMixContainer.remove();
    }

    // Set a safety timeout in case iframe loading fails
    const safetyTimeout = setTimeout(() => {
      console.log("Safety timeout: forcing loading animation to stop");
      this.iframeLoaded();
    }, 5000);

    try {
      if (playlist.isMixedVirus(name)) {
        const mix = playlist.getMixById(name);
        if (mix) {
          // Hide the main iframe
          this.iframe.style.display = "none";

          // Create a custom container for the mixed virus display
          const mixContainer = document.createElement("div");
          mixContainer.className = "mixed-virus-container";
          mixContainer.style.position = "absolute";
          mixContainer.style.top = "0";
          mixContainer.style.left = "0";
          mixContainer.style.width = "100%";
          mixContainer.style.height = "100%";
          mixContainer.style.zIndex = "1";

          // Create iframes for primary and secondary viruses
          const primaryFrame = document.createElement("iframe");
          const secondaryFrame = document.createElement("iframe");

          // Style iframes
          [primaryFrame, secondaryFrame].forEach((frame) => {
            frame.style.width = "100%";
            frame.style.height = "100%";
            frame.style.border = "none";
            frame.style.position = "absolute";
            frame.style.top = "0";
            frame.style.left = "0";
            frame.style.background = "#000";
          });

          // Set mix-blend-mode and opacity for secondary frame
          secondaryFrame.style.mixBlendMode = "screen";
          secondaryFrame.className = "secondary-virus";
          secondaryFrame.style.opacity = mix.mixRatio.toString();

          // Force mix-blend-mode with inline style
          secondaryFrame.setAttribute(
            "style",
            `width:100%; height:100%; border:none; position:absolute; top:0; left:0; background:#000; mix-blend-mode:screen; opacity:${mix.mixRatio}`
          );

          // Track iframe loading
          let loadedFrames = 0;
          const frameLoaded = () => {
            loadedFrames++;
            if (loadedFrames === 2) {
              // Both iframes have loaded
              clearTimeout(safetyTimeout);
              this.iframeLoaded();
            }
          };

          // Add load event listeners
          primaryFrame.addEventListener("load", frameLoaded);
          secondaryFrame.addEventListener("load", frameLoaded);

          // Add error handlers in case a virus fails to load
          primaryFrame.addEventListener("error", frameLoaded);
          secondaryFrame.addEventListener("error", frameLoaded);

          // Load viruses
          primaryFrame.src = `/viruses/${mix.primary}/`;
          secondaryFrame.src = `/viruses/${mix.secondary}/`;

          // Add iframes to container
          mixContainer.appendChild(primaryFrame);
          mixContainer.appendChild(secondaryFrame);

          // Add container to document
          document.body.appendChild(mixContainer);

          this.sourceCodeLink.href = this.sourceCodeUrl(name);
        } else {
          console.error("Mix not found for ID:", name);
          this.iframe.src = `/viruses/${playlist.viruses[0]}/`;
          this.iframe.style.display = "block";
          this.iframe.addEventListener(
            "load",
            () => {
              clearTimeout(safetyTimeout);
              this.iframeLoaded();
            },
            { once: true }
          );
        }
      } else {
        // For regular viruses, use the standard iframe
        this.iframe.src = `/viruses/${name}/`;
        this.iframe.style.display = "block";
        this.iframe.addEventListener(
          "load",
          () => {
            clearTimeout(safetyTimeout);
            this.iframeLoaded();
          },
          { once: true }
        );
      }
    } catch (error) {
      console.error("Error loading virus:", error);
      this.iframe.src = `/viruses/${playlist.viruses[0]}/`;
      this.iframe.style.display = "block";
      this.iframe.addEventListener(
        "load",
        () => {
          clearTimeout(safetyTimeout);
          this.iframeLoaded();
        },
        { once: true }
      );
    }
  }

  iframeLoaded() {
    this.loadingAnim.stop();
    this.sourceCodeLink.classList.remove("hide");
    this.sourceCodeLink.href = this.sourceCodeUrl(playlist.current());
    this.loadingRing.classList.remove("loading");
  }

  sourceCodeUrl(virus: string) {
    return `https://github.com/pulsedemon/thisisnotavirus/tree/master/viruses/${virus}`;
  }

  skipNext() {
    // Clean up any existing mixed virus container
    const existingMixContainer = document.querySelector(
      ".mixed-virus-container"
    );
    if (existingMixContainer) {
      existingMixContainer.remove();
    }

    const nextVirus = playlist.next();
    console.log("Skipping to next virus:", nextVirus);
    this.loadVirus(nextVirus);
    this.startRandomization();
  }

  skipPrev() {
    // Clean up any existing mixed virus container
    const existingMixContainer = document.querySelector(
      ".mixed-virus-container"
    );
    if (existingMixContainer) {
      existingMixContainer.remove();
    }

    const prevVirus = playlist.prev();
    console.log("Skipping to previous virus:", prevVirus);
    this.loadVirus(prevVirus);
    this.startRandomization();
  }

  startRandomization(name?: string) {
    clearInterval(this.loadRandomInterval);

    const randomTime = Random.numberBetween(2, 12) * 1000;
    let virusToLoad: string;

    this.loadRandomInterval = setInterval(() => {
      // Clean up any existing mixed virus container
      const existingMixContainer = document.querySelector(
        ".mixed-virus-container"
      );
      if (existingMixContainer) {
        existingMixContainer.remove();
      }

      if (name) {
        virusToLoad = name;
      } else {
        virusToLoad = playlist.next();
      }
      this.loadVirus(virusToLoad);
      this.startRandomization();
    }, randomTime);
  }

  private hideModals() {
    document.querySelectorAll(".modal.show").forEach((modal) => {
      modal.classList.remove("show");
    });
  }

  toggleLab() {
    if (this.virusLab) {
      // Close lab
      const labContainer = document.getElementById("virus-lab");
      if (labContainer) {
        labContainer.remove();
      }
      this.virusLab = null;
      this.iframe.style.display = "block";
      document.getElementById("menu")!.style.display = "inline-block";

      const labButton = document.getElementById("lab-btn")!;
      labButton.innerHTML = "🧪";
      labButton.title = "Virus Lab";
      gtag("event", "close_lab");

      // Resume playlist if it was playing
      const playPauseBtn = document.getElementById("play-pause")!;
      if (playPauseBtn.innerText === "play_arrow") {
        playPauseBtn.innerText = "pause";
        this.skipNext();
      }
    } else {
      // Open lab
      this.iframe.style.display = "none";
      document.getElementById("menu")!.style.display = "none";
      this.hideModals();

      // Clean up any existing mixed virus container
      const existingMixContainer = document.querySelector(
        ".mixed-virus-container"
      );
      if (existingMixContainer) {
        existingMixContainer.remove();
      }

      // Pause playlist
      const playPauseBtn = document.getElementById("play-pause")!;
      if (playPauseBtn.innerText === "pause") {
        playPauseBtn.innerText = "play_arrow";
        clearInterval(this.loadRandomInterval);
      }

      const labContainer = document.createElement("div");
      labContainer.id = "virus-lab";
      labContainer.style.position = "absolute";
      labContainer.style.top = "0";
      labContainer.style.left = "0";
      labContainer.style.width = "100%";
      labContainer.style.height = "100%";
      labContainer.style.zIndex = "1000";

      document.body.appendChild(labContainer);
      this.virusLab = new VirusLab(labContainer, playlist);

      const labButton = document.getElementById("lab-btn")!;
      labButton.innerHTML = "✕";
      labButton.title = "Close Virus Lab";
      gtag("event", "open_lab");
    }
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

document.getElementById("info-btn")!.onclick = () => {
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

  const menuPositions = [
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
    menu.style.inset = menuPositions[Random.int(menuPositions.length)];
    setTimeout(() => {
      menu.classList.remove(animationClassName);
    }, 400);
  }, 300);

  gtag("event", "v_icon_click");
}
