import * as Sentry from "@sentry/browser";

import { virus } from "./ascii";
import Flash from "./components/flash/flash";
import Playlist from "./components/Playlist";
import TVStaticLoading from "./components/TVStaticLoading";
import VirusLab from "./components/VirusLab";
import { showVirusThumbnailOverlay } from "./components/VirusThumbnailOverlay";
import "./sass/main.scss";
import { createStyledIframe } from "./utils/iframe";
import { isMobile } from "./utils/misc";
import Random from "./utils/random";

declare let gtag: (
  eventName: string,
  eventType: string,
  options?: object,
) => void;

declare global {
  interface Window {
    TVStaticLoading?: typeof TVStaticLoading;
  }
}

// Check if we're in production mode using Vite's import.meta.env
if (import.meta.env.PROD) {
  Sentry.init({
    dsn: "https://2cead2fbc81748d68231d7729b5812f9@o4504890125582336.ingest.sentry.io/4504890229194752",
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.browserProfilingIntegration(),
    ],
    tracesSampleRate: 1.0,
    profilesSampleRate: 1.0,
  });
}

console.log(
  `%c
  ${virus}
`,
  "color: #00ffff",
);

const playlist = new Playlist();

let virusHasKeyboardControl = false;

interface KeyboardControlMessage {
  type: string;
  enabled: boolean;
}

function isKeyboardControlMessage(
  data: unknown,
): data is KeyboardControlMessage {
  return (
    typeof data === "object" &&
    data !== null &&
    "type" in data &&
    "enabled" in data &&
    data.type === "requestKeyboardControl" &&
    typeof data.enabled === "boolean"
  );
}

window.addEventListener("message", (event) => {
  if (isKeyboardControlMessage(event.data)) {
    virusHasKeyboardControl = event.data.enabled;
  }
});

class VirusLoader {
  iframe: HTMLIFrameElement;
  loadRandomInterval: ReturnType<typeof setInterval>;
  loadingAnimEl: HTMLDivElement = document.getElementById(
    "loading-anim",
  ) as HTMLDivElement;
  loadingAnimStartTime = 0;
  loadingAnim: { start: () => void; stop: () => void };
  loadingRing: HTMLDivElement = document.getElementById(
    "loading-ring",
  ) as HTMLDivElement;
  sourceCodeLink: HTMLAnchorElement = document.querySelector("#source-code a")!;
  sourceCodeDiv: HTMLElement = document.getElementById("source-code")!;
  virusLab: VirusLab | null = null;
  isNavigating = false;

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

    // Check for virus redirect parameter
    const virusParam = new URLSearchParams(window.location.search).get("virus");

    if (virusParam && playlist.viruses.includes(virusParam)) {
      playlist.setCurrentVirus(virusParam);
      this.loadVirus(virusParam);
      document.getElementById("play-pause")!.innerText = "play_arrow";
      clearInterval(this.loadRandomInterval);
      window.history.replaceState({}, "", window.location.pathname);
    } else {
      this.loadVirus(playlist.current());
      this.startRandomization();
    }

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
        virusLoader: this,
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
    virusHasKeyboardControl = false;

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
      ".mixed-virus-container",
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
            { once: true },
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
          { once: true },
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
        { once: true },
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
    if (this.isNavigating) return;
    this.isNavigating = true;

    // Clean up any existing mixed virus container
    const existingMixContainer = document.querySelector(
      ".mixed-virus-container",
    );
    if (existingMixContainer) {
      existingMixContainer.remove();
    }

    const nextVirus = playlist.next();
    console.log("Skipping to next virus:", nextVirus);
    this.loadVirus(nextVirus);
    this.startRandomization();

    setTimeout(() => {
      this.isNavigating = false;
    }, 300);
  }

  skipPrev() {
    if (this.isNavigating) return;
    this.isNavigating = true;

    // Clean up any existing mixed virus container
    const existingMixContainer = document.querySelector(
      ".mixed-virus-container",
    );
    if (existingMixContainer) {
      existingMixContainer.remove();
    }

    const prevVirus = playlist.prev();
    console.log("Skipping to previous virus:", prevVirus);
    this.loadVirus(prevVirus);
    this.startRandomization();

    setTimeout(() => {
      this.isNavigating = false;
    }, 300);
  }

  /**
   * Starts the randomization timer for virus switching
   */
  startRandomization() {
    // Clear any existing interval first
    clearInterval(this.loadRandomInterval);

    // Set random time between 2-12 seconds
    const randomTime = Random.numberBetween(2, 12) * 1000;

    // Create a new interval - simplified without recursive calls
    this.loadRandomInterval = setInterval(() => {
      // Clean up any existing mixed virus container
      const existingMixContainer = document.querySelector(
        ".mixed-virus-container",
      );
      if (existingMixContainer) {
        existingMixContainer.remove();
      }

      // Get next virus and load it
      const nextVirus = playlist.next();
      this.loadVirus(nextVirus);
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

      document.getElementById("menu")!.style.display = "flex";

      const labButton = document.getElementById("lab-btn")!;
      labButton.innerHTML = "🧪";
      labButton.title = "Virus Lab";
      gtag("event", "close_lab");

      // Simplified lab closing logic
      clearInterval(this.loadRandomInterval);

      if (currentMix && currentMix.id) {
        // Load the current mix from the lab
        this.loadVirus(`mixed:${currentMix.id}`);
        // Update playlist's current index to point to our mix
        const mixId = `mixed:${currentMix.id}`;
        playlist.setCurrentVirus(mixId);
      } else {
        // If no saved mix, just show the current virus
        this.iframe.style.display = "block";
        this.loadVirus(playlist.current());
      }

      // Update play/pause button state
      const playPauseBtn = document.getElementById("play-pause")!;
      if (playPauseBtn.innerText === "play_arrow") {
        playPauseBtn.innerText = "pause";
      }

      // Start randomization
      this.startRandomization();
    } else {
      // Open lab
      this.iframe.style.display = "none";
      document.getElementById("menu")!.style.display = "none";
      this.hideModals();

      // Clean up any existing mixed virus container
      const existingMixContainer = document.querySelector(
        ".mixed-virus-container",
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
      labContainer.style.right = "0";
      labContainer.style.bottom = "0";
      labContainer.style.width = "100%";
      labContainer.style.height = "100%";
      labContainer.style.zIndex = "1000";
      labContainer.style.overflow = "visible";
      labContainer.style.pointerEvents = "auto";

      document.body.appendChild(labContainer);
      this.virusLab = new VirusLab(labContainer, playlist);

      const labButton = document.getElementById("lab-btn")!;
      labButton.innerHTML = "✕";
      labButton.title = "Close Virus Lab";
      gtag("event", "open_lab");
    }
  }

  reloadCurrent() {
    if (this.isNavigating) return; // Prevent rapid clicks
    this.isNavigating = true;

    // Clean up any existing mixed virus container
    const existingMixContainer = document.querySelector(
      ".mixed-virus-container",
    );
    if (existingMixContainer) {
      existingMixContainer.remove();
    }

    const currentVirus = playlist.current();
    console.log("Reloading current virus:", currentVirus);
    this.loadVirus(currentVirus);
    this.startRandomization();

    // Reset navigation flag after a short delay
    setTimeout(() => {
      this.isNavigating = false;
    }, 300);
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
  vl.reloadCurrent();
};

// Device detection
const DEVICE = {
  isMobile: (): boolean => isMobile(),
} as const;

// Fullscreen functionality
const FULLSCREEN = {
  isActive: (): boolean => {
    const doc = document as Document & {
      fullscreenElement?: Element;
      webkitFullscreenElement?: Element;
      mozFullScreenElement?: Element;
      msFullscreenElement?: Element;
    };
    return !!(
      doc.fullscreenElement ||
      doc.webkitFullscreenElement ||
      doc.mozFullScreenElement ||
      doc.msFullscreenElement
    );
  },

  toggleUI: (show: boolean): void => {
    const elements = ["menu", "lab-btn", "thumbnail-btn", "source-code"];
    elements.forEach((id) => {
      const el = document.getElementById(id);
      if (el) {
        el.style.opacity = show ? "1" : "0";
        el.style.pointerEvents = show ? "auto" : "none";
      }
    });
  },

  async callMethod(
    obj: Record<string, unknown>,
    methods: string[],
  ): Promise<void> {
    const methodName = methods.find((m) => typeof obj[m] === "function");
    if (methodName && typeof obj[methodName] === "function") {
      await (obj[methodName] as () => Promise<void>)();
    }
  },

  async enter(el: HTMLElement): Promise<void> {
    await FULLSCREEN.callMethod(el as unknown as Record<string, unknown>, [
      "requestFullscreen",
      "webkitRequestFullscreen",
      "mozRequestFullScreen",
      "msRequestFullscreen",
    ]);
  },

  async exit(): Promise<void> {
    await FULLSCREEN.callMethod(
      document as unknown as Record<string, unknown>,
      [
        "exitFullscreen",
        "webkitExitFullscreen",
        "mozCancelFullScreen",
        "msExitFullscreen",
      ],
    );
  },
};

// Initialize fullscreen functionality only for desktop
if (!DEVICE.isMobile()) {
  const fullscreenBtn = document.createElement("span");
  fullscreenBtn.id = "fullscreen";
  fullscreenBtn.className = "material-symbols-outlined";
  fullscreenBtn.innerHTML = "fullscreen";
  fullscreenBtn.title = "Toggle Fullscreen";
  document.querySelector("#menu .controls")!.appendChild(fullscreenBtn);

  fullscreenBtn.onclick = async () => {
    const doc = document.documentElement;

    try {
      if (!FULLSCREEN.isActive()) {
        await FULLSCREEN.enter(doc);
        fullscreenBtn.innerHTML = "fullscreen_exit";
        gtag("event", "enter_fullscreen");
      } else {
        await FULLSCREEN.exit();
        fullscreenBtn.innerHTML = "fullscreen";
        gtag("event", "exit_fullscreen");
      }
    } catch (error) {
      console.error("Fullscreen error:", error);
    }
  };

  // Update fullscreen button icon when fullscreen state changes
  document.addEventListener("fullscreenchange", () => {
    const isFullscreen = FULLSCREEN.isActive();
    fullscreenBtn.innerHTML = isFullscreen ? "fullscreen_exit" : "fullscreen";
    FULLSCREEN.toggleUI(!isFullscreen);
  });
}

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

function forwardKeyboardEventToIframe(event: KeyboardEvent, eventType: string) {
  if (!virusHasKeyboardControl) return;

  const mainIframe = document.getElementById("container") as HTMLIFrameElement;
  const mixedContainer = document.querySelector(".mixed-virus-container");
  const activeIframe = mixedContainer
    ? (mixedContainer.querySelector("iframe") as HTMLIFrameElement)
    : mainIframe;

  if (activeIframe?.contentWindow) {
    activeIframe.contentWindow.postMessage(
      {
        type: "keyboardEvent",
        eventType,
        key: event.key,
        code: event.code,
        shiftKey: event.shiftKey,
        ctrlKey: event.ctrlKey,
        altKey: event.altKey,
        metaKey: event.metaKey,
      },
      "*",
    );
  }
}

document.onkeydown = (e) => {
  if (virusHasKeyboardControl) {
    forwardKeyboardEventToIframe(e, "keydown");
  }
};

document.onkeyup = (e) => {
  if (e.key === "Escape") {
    hideInfo();
    return;
  } else if (e.key === "?") {
    toggleInfo();
    return;
  }

  if (virusHasKeyboardControl) {
    forwardKeyboardEventToIframe(e, "keyup");
    return;
  }

  if (e.key === "ArrowRight") {
    gtag("event", "skip_next_keyboard");
    vl.skipNext();
    resumePlayback();
  } else if (e.key === "ArrowLeft") {
    gtag("event", "skip_prev_keyboard");
    vl.skipPrev();
  } else if (e.key === " " || e.key === "Spacebar") {
    togglePlayPause();
  } else if (e.key === "r" || e.key === "R") {
    gtag("event", "reload_keyboard", {
      animation_name: playlist.current(),
    });
    vl.reloadCurrent();
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

window.TVStaticLoading = TVStaticLoading;
