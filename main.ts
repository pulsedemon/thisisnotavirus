import * as Sentry from "@sentry/browser";

import { virus } from "./ascii";
import Flash from "./components/flash/flash";
import Playlist from "./components/Playlist";
import TVStaticLoading from "./components/TVStaticLoading";
import VirusLab from "./components/VirusLab";
import { showVirusThumbnailOverlay } from "./components/VirusThumbnailOverlay";
import "./sass/main.scss";
import { createStyledIframe } from "./utils/iframe";
import Random from "./utils/random";

declare let gtag: (
  eventName: string,
  eventType: string,
  options?: object
) => void;

declare global {
  interface Window {
    TVStaticLoading?: any;
  }
}

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
  loadingAnimStartTime = 0;
  loadingAnim: { start: () => void; stop: () => void };
  loadingRing: HTMLDivElement = document.getElementById(
    "loading-ring"
  ) as HTMLDivElement;
  sourceCodeLink: HTMLAnchorElement = document.querySelector("#source-code a")!;
  sourceCodeDiv: HTMLElement = document.getElementById("source-code")!;
  virusLab: VirusLab | null = null;

  constructor() {
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

    // Add a floating button to open the overlay in the bottom left
    const thumbBtn = document.createElement("button");
    thumbBtn.id = "thumbnail-btn";
    thumbBtn.innerHTML =
      "<span class='material-symbols-outlined'>grid_view</span>";
    thumbBtn.title = "Gallery";
    thumbBtn.className = "lab-button";
    thumbBtn.style.position = "fixed";
    thumbBtn.style.bottom = "20px";
    thumbBtn.style.left = "20px";
    thumbBtn.style.right = "";
    thumbBtn.style.background = "#00ffff";
    thumbBtn.style.color = "#000";
    thumbBtn.style.border = "none";
    thumbBtn.style.borderRadius = "50%";
    thumbBtn.style.width = "50px";
    thumbBtn.style.height = "50px";
    thumbBtn.style.cursor = "pointer";
    thumbBtn.style.fontSize = "24px";
    thumbBtn.style.zIndex = "2000";
    thumbBtn.style.transition = "all 0.3s ease";
    thumbBtn.style.boxShadow = "0 2px 10px rgba(0, 255, 255, 0.3)";
    thumbBtn.style.display = "flex";
    thumbBtn.style.alignItems = "center";
    thumbBtn.style.justifyContent = "center";
    document.body.appendChild(thumbBtn);

    thumbBtn.onclick = () => {
      showVirusThumbnailOverlay({
        onSelect: (virus) => {
          // Pause playlist
          const playPauseBtn = document.getElementById("play-pause");
          if (playPauseBtn) playPauseBtn.innerText = "play_arrow";
          clearInterval(this.loadRandomInterval);
          // Reload saved mixes to ensure playlist has latest data
          playlist.loadSavedMixes();
          // Set playlist current virus and load selected virus
          playlist.setCurrentVirus(virus);
          this.loadVirus(virus);
        },
        onClose: () => {
          // No-op for now
        },
      });
    };
  }

  private showSourceCodeLink() {
    this.sourceCodeLink?.classList.remove("hide");
  }

  private hideSourceCodeLink() {
    this.sourceCodeLink?.classList.add("hide");
  }

  loadVirus(name: string) {
    // Randomly choose the loading animation for each load
    if (Math.random() < 0.5) {
      const tvStatic = new TVStaticLoading();
      this.loadingAnim = {
        start: () => tvStatic.show(),
        stop: () => tvStatic.hide(),
      };
    } else {
      this.loadingAnim = new Flash(this.loadingAnimEl);
    }

    console.log("Loading virus:", name);
    this.loadingAnim.start();
    this.loadingAnimStartTime = Date.now();
    this.hideSourceCodeLink();
    this.loadingRing.classList.add("loading");

    // Add spinning animation to reload button
    const reloadBtn = document.getElementById("reload");
    if (reloadBtn) reloadBtn.classList.add("spinning");

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
      this._delayedIframeLoaded();
    }, 5000);

    try {
      if (playlist.isMixedVirus(name)) {
        // Reload saved mixes to ensure we have the latest data
        playlist.loadSavedMixes();
        const mix = playlist.getMixById(name);
        if (mix) {
          // Hide the main iframe
          this.iframe.style.display = "none";
          // Hide the source code element for mixes
          this.hideSourceCodeLink();

          // Create a custom container for the mixed virus display
          const mixContainer = document.createElement("div");
          mixContainer.className = "mixed-virus-container";
          mixContainer.style.position = "absolute";
          mixContainer.style.top = "0";
          mixContainer.style.left = "0";
          mixContainer.style.width = "100%";
          mixContainer.style.height = "100%";
          mixContainer.style.zIndex = "1";

          // Create a single iframe that uses the lab template
          const mixFrame = createStyledIframe();

          // Load the lab template with the mix parameters
          mixFrame.src = `/viruses/lab/?primary=${mix.primary}&secondary=${mix.secondary}&ratio=${mix.mixRatio}`;

          // Add load event listener
          mixFrame.addEventListener("load", () => {
            clearTimeout(safetyTimeout);
            this._delayedIframeLoaded();
          });

          // Add error handler
          mixFrame.addEventListener("error", () => {
            clearTimeout(safetyTimeout);
            this._delayedIframeLoaded();
          });

          // Add iframe to container
          mixContainer.appendChild(mixFrame);

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
              this._delayedIframeLoaded();
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
            this._delayedIframeLoaded();
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
          this._delayedIframeLoaded();
        },
        { once: true }
      );
    }
  }

  _delayedIframeLoaded() {
    const minDuration = 500; // 0.5 second
    const elapsed = Date.now() - this.loadingAnimStartTime;
    if (elapsed >= minDuration) {
      this.iframeLoaded();
    } else {
      setTimeout(() => this.iframeLoaded(), minDuration - elapsed);
    }
  }

  iframeLoaded() {
    this.loadingAnim.stop();
    // Failsafe: Remove any lingering static canvas that could block UI
    document.querySelectorAll(".tv-static-canvas").forEach((el) => {
      (el as HTMLElement).style.pointerEvents = "none";
      el.parentNode?.removeChild(el);
    });
    // Only show source code if not a mix
    if (!playlist.isMixedVirus(playlist.current())) {
      this.showSourceCodeLink();
    }
    this.sourceCodeLink.href = this.sourceCodeUrl(playlist.current());
    this.loadingRing.classList.remove("loading");

    // Remove spinning animation from reload button
    const reloadBtn = document.getElementById("reload");
    if (reloadBtn) reloadBtn.classList.remove("spinning");
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

  /**
   * Starts the randomization timer for virus switching
   */
  startRandomization() {
    // Clear any existing interval first
    clearInterval(this.loadRandomInterval);

    // Set random time between 2-12 seconds
    const randomTime = Random.numberBetween(2, 12) * 1000;

    // Create a new interval
    this.loadRandomInterval = setInterval(() => {
      // Clean up any existing mixed virus container
      const existingMixContainer = document.querySelector(
        ".mixed-virus-container"
      );
      if (existingMixContainer) {
        existingMixContainer.remove();
      }

      // Get next virus and load it
      const nextVirus = playlist.next();
      this.loadVirus(nextVirus);

      // Create a new interval after loading
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
      const currentMix = this.virusLab.getCurrentMix();
      const labContainer = document.getElementById("virus-lab");
      if (labContainer) {
        labContainer.remove();
      }
      this.virusLab = null;

      document.getElementById("menu")!.style.display = "inline-block";

      const labButton = document.getElementById("lab-btn")!;
      labButton.innerHTML = "🧪";
      labButton.title = "Virus Lab";
      gtag("event", "close_lab");

      // Make sure the current mix is visible when lab is closed
      if (currentMix && currentMix.id) {
        // First, clear any existing interval so we don't have conflicts
        clearInterval(this.loadRandomInterval);

        // Load the current mix from the lab
        this.loadVirus(`mixed:${currentMix.id}`);

        // Update the play/pause button to ensure it's in the right state
        const playPauseBtn = document.getElementById("play-pause")!;
        if (playPauseBtn.innerText === "play_arrow") {
          // If it was paused before, resume playback
          playPauseBtn.innerText = "pause";
        }

        // Create a new interval that will keep the current mix displayed for a full cycle
        // before advancing to the next virus in the playlist
        const randomTime = Random.numberBetween(5, 12) * 1000; // Longer time for custom mixes
        this.loadRandomInterval = setInterval(() => {
          const nextVirus = playlist.next();
          this.loadVirus(nextVirus);
          this.startRandomization(); // Continue with normal playlist after this
        }, randomTime);

        // Update playlist's current index to point to our mix so "next" works properly
        const mixId = `mixed:${currentMix.id}`;
        playlist.setCurrentVirus(mixId);
      } else {
        // If no saved mix, just show the current virus
        this.iframe.style.display = "block";

        // Reset the animation interval with the current virus from playlist
        const playPauseBtn = document.getElementById("play-pause")!;
        if (playPauseBtn.innerText === "play_arrow") {
          playPauseBtn.innerText = "pause";
        }

        // Clear any existing interval
        clearInterval(this.loadRandomInterval);

        // Create a new interval that will display the current virus for a full cycle
        const randomTime = Random.numberBetween(2, 12) * 1000;
        this.loadVirus(playlist.current()); // Make sure we're showing the current virus

        this.loadRandomInterval = setInterval(() => {
          const nextVirus = playlist.next();
          this.loadVirus(nextVirus);
          this.startRandomization(); // Continue with normal playlist
        }, randomTime);
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
  gtag("event", "skip-next", {
    animation_name: playlist.current(),
  });
  vl.skipNext();

  resumePlayback();
};

document.getElementById("reload")!.onclick = () => {
  gtag("event", "reload", {
    animation_name: playlist.current(),
  });
  vl.loadVirus(playlist.current());
};

// Add fullscreen button
const fullscreenBtn = document.createElement("span");
fullscreenBtn.id = "fullscreen";
fullscreenBtn.className = "material-symbols-outlined";
fullscreenBtn.innerHTML = "fullscreen";
fullscreenBtn.title = "Toggle Fullscreen";
document.querySelector("#menu .controls")!.appendChild(fullscreenBtn);

fullscreenBtn.onclick = () => {
  const doc = document.documentElement;
  if (
    !document.fullscreenElement &&
    !(document as any).webkitFullscreenElement &&
    !(document as any).mozFullScreenElement &&
    !(document as any).msFullscreenElement
  ) {
    if (doc.requestFullscreen) {
      doc.requestFullscreen();
    } else if ((doc as any).webkitRequestFullscreen) {
      (doc as any).webkitRequestFullscreen();
    } else if ((doc as any).mozRequestFullScreen) {
      (doc as any).mozRequestFullScreen();
    } else if ((doc as any).msRequestFullscreen) {
      (doc as any).msRequestFullscreen();
    }
    fullscreenBtn.innerHTML = "fullscreen_exit";
    gtag("event", "enter_fullscreen");
  } else {
    if (document.exitFullscreen) {
      document.exitFullscreen();
    } else if ((document as any).webkitExitFullscreen) {
      (document as any).webkitExitFullscreen();
    } else if ((document as any).mozCancelFullScreen) {
      (document as any).mozCancelFullScreen();
    } else if ((document as any).msExitFullscreen) {
      (document as any).msExitFullscreen();
    }
    fullscreenBtn.innerHTML = "fullscreen";
    gtag("event", "exit_fullscreen");
  }
};

// Update fullscreen button icon when fullscreen state changes
document.addEventListener("fullscreenchange", () => {
  const menu = document.getElementById("menu")!;
  const labBtn = document.getElementById("lab-btn")!;
  const thumbBtn = document.getElementById("thumbnail-btn")!;
  const sourceCode = document.getElementById("source-code")!;

  if (
    document.fullscreenElement ||
    (document as any).webkitFullscreenElement ||
    (document as any).mozFullScreenElement ||
    (document as any).msFullscreenElement
  ) {
    fullscreenBtn.innerHTML = "fullscreen_exit";
    // Hide UI elements in fullscreen
    menu.style.opacity = "0";
    menu.style.pointerEvents = "none";
    labBtn.style.opacity = "0";
    labBtn.style.pointerEvents = "none";
    thumbBtn.style.opacity = "0";
    thumbBtn.style.pointerEvents = "none";
    sourceCode.style.opacity = "0";
    sourceCode.style.pointerEvents = "none";
  } else {
    fullscreenBtn.innerHTML = "fullscreen";
    // Show UI elements when exiting fullscreen
    menu.style.opacity = "1";
    menu.style.pointerEvents = "auto";
    labBtn.style.opacity = "1";
    labBtn.style.pointerEvents = "auto";
    thumbBtn.style.opacity = "1";
    thumbBtn.style.pointerEvents = "auto";
    sourceCode.style.opacity = "1";
    sourceCode.style.pointerEvents = "auto";
  }
});

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
  } else if (e.key === "r" || e.key === "R") {
    gtag("event", "reload_keyboard", {
      animation_name: playlist.current(),
    });
    vl.loadVirus(playlist.current());
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

(window as any).TVStaticLoading = TVStaticLoading;
