import { formatVirusName } from "../utils/misc";
import Playlist from "./Playlist";

declare let gtag: (
  command: "config" | "event",
  targetId: string,
  config?: Record<string, unknown>,
) => void;

interface VirusLoader {
  virusLab: unknown;
  toggleLab(): void;
}

export function showVirusThumbnailOverlay({
  onSelect,
  onClose,
  virusLoader,
}: {
  onSelect: (virus: string) => void;
  onClose: () => void;
  virusLoader?: VirusLoader; // VirusLoader instance to close lab if open
}) {
  // Track overlay open event
  if (typeof gtag !== "undefined") {
    gtag("event", "virus_overlay_open", {
      event_category: "engagement",
      event_label: "virus_thumbnail_overlay",
    });
  }

  // Remove any existing overlay
  const existing = document.getElementById("virus-thumbnail-overlay");
  if (existing) existing.remove();

  // Detect mobile
  const isMobile = window.innerWidth <= 600;

  // Get virus list
  const playlist = new Playlist();
  const viruses = playlist.viruses.map((virus) => ({
    value: virus,
    label: formatVirusName(virus),
    type: "builtin",
  }));

  // Get custom viruses (saved mixes)
  const customViruses = playlist.savedMixes.map((mix) => ({
    value: `mixed:${mix.id}`,
    label: `${formatVirusName(mix.primary)} / ${formatVirusName(
      mix.secondary,
    )} (${Math.round(mix.mixRatio * 100)}%)`,
    type: "custom",
    mix: {
      ...mix,
      mixRatioPercent: Math.round(mix.mixRatio * 100),
    },
  }));

  // Create overlay HTML directly
  const overlay = document.createElement("div");
  overlay.id = "virus-thumbnail-overlay";
  overlay.className = "virus-overlay";

  overlay.innerHTML = `
    <div class="virus-overlay-header">
      <h2 class="virus-overlay-title">Select Virus</h2>
      <button class="virus-thumbnail-close" aria-label="Close overlay">
        X
      </button>
    </div>
    
    <div class="virus-overlay-content">
      <div class="virus-search-container">
        <input 
          type="text" 
          class="virus-search" 
          placeholder="Search viruses..." 
          aria-label="Search viruses"
          autocomplete="off"
          autocorrect="off"
          autocapitalize="off"
          spellcheck="false"
        />
        <span class="virus-search-icon">🔍</span>
      </div>
      
      <div class="virus-sections">
        <div class="virus-section">
          <div class="virus-section-title-wrapper">
            <h3 class="virus-section-title">Viruses</h3>
          </div>
          <div class="virus-thumbnail-grid ${isMobile ? "mobile" : ""}">
            ${viruses
              .map(
                (virus) => `
              <div class="virus-thumbnail-item" data-virus="${virus.value}" tabindex="0" role="button" aria-label="Select ${virus.label} virus">
                <div class="virus-thumbnail-preview">
                  <iframe 
                    src="/viruses/${virus.value}/" 
                    title="${virus.label} preview" 
                    frameborder="0"
                    loading="lazy"
                    importance="low"
                  ></iframe>
                  <div class="virus-thumbnail-overlay-hover">
                    <span class="play-icon">▶</span>
                  </div>
                </div>
                <div class="virus-label">${virus.label}</div>
              </div>
            `,
              )
              .join("")}
          </div>
        </div>

        ${
          customViruses.length > 0
            ? `
        <div class="virus-section custom-viruses">
          <h3 class="virus-section-title">Mixes</h3>
          <div class="virus-thumbnail-grid ${isMobile ? "mobile" : ""}">
            ${customViruses
              .map(
                (virus) => `
              <div class="virus-thumbnail-item custom-virus" data-virus="${virus.value}" tabindex="0" role="button" aria-label="Select ${virus.label} custom virus">
                <div class="virus-thumbnail-preview custom-preview">
                  <div class="custom-virus-display">
                    <div class="custom-virus-info">
                      <div class="custom-virus-components">
                        <span class="primary-virus">${virus.mix.primary}</span>
                        <span class="mix-symbol">⚡</span>
                        <span class="secondary-virus">${virus.mix.secondary}</span>
                      </div>
                      <div class="mix-ratio">${virus.mix.mixRatioPercent}%</div>
                    </div>
                  </div>
                  <div class="virus-thumbnail-overlay-hover">
                    <span class="play-icon">▶</span>
                  </div>
                </div>
                <div class="virus-label custom-label">${virus.label}</div>
              </div>
            `,
              )
              .join("")}
          </div>
        </div>
        `
            : ""
        }
      </div>
    </div>
  `;

  // Get references to key elements
  const searchInput = overlay.querySelector(
    ".virus-search",
  ) as HTMLInputElement;
  const thumbnailItems = overlay.querySelectorAll(".virus-thumbnail-item");
  const closeBtn = overlay.querySelector(
    ".virus-thumbnail-close",
  ) as HTMLButtonElement;

  // Search functionality
  let filteredItems = Array.from(thumbnailItems) as HTMLElement[];
  let touchStartY = 0;
  let isScrolling = false;

  function filterItems(searchTerm: string) {
    const term = searchTerm.toLowerCase().trim();
    filteredItems = [];

    thumbnailItems.forEach((item) => {
      const htmlItem = item as HTMLElement;
      const virus = htmlItem.getAttribute("data-virus")!;
      let matches = false;

      if (virus.startsWith("mixed:")) {
        // For custom viruses, search in the label and component virus names
        const customVirus = customViruses.find((cv) => cv.value === virus);
        if (customVirus) {
          const label = customVirus.label.toLowerCase();
          const primaryVirus = formatVirusName(
            customVirus.mix.primary,
          ).toLowerCase();
          const secondaryVirus = formatVirusName(
            customVirus.mix.secondary,
          ).toLowerCase();

          matches =
            label.includes(term) ||
            primaryVirus.includes(term) ||
            secondaryVirus.includes(term) ||
            customVirus.mix.primary.toLowerCase().includes(term) ||
            customVirus.mix.secondary.toLowerCase().includes(term);
        }
      } else {
        // For built-in viruses, search in formatted name and virus name
        const label = formatVirusName(virus).toLowerCase();
        matches = label.includes(term) || virus.toLowerCase().includes(term);
      }

      if (matches) {
        htmlItem.classList.remove("filtered-out");
        htmlItem.style.removeProperty("display");
        filteredItems.push(htmlItem);
      } else {
        htmlItem.classList.add("filtered-out");
      }
    });
  }

  // Event handler functions
  const handleSearchInput = (e: Event) => {
    const target = e.target as HTMLInputElement;
    filterItems(target.value);
  };

  const handleTouchStart = (e: TouchEvent) => {
    touchStartY = e.touches[0].clientY;
    isScrolling = false;
  };

  const handleTouchMove = (e: TouchEvent) => {
    const touchY = e.touches[0].clientY;
    const diff = touchStartY - touchY;

    // If scrolling more than 10px vertically, consider it a scroll
    if (Math.abs(diff) > 10) {
      isScrolling = true;
    }
  };

  const handleTouchEnd = (e: TouchEvent, htmlWrapper: HTMLElement) => {
    if (!isScrolling) {
      const virus = htmlWrapper.getAttribute("data-virus")!;
      cleanup();

      // Close lab if it's open
      if (virusLoader && virusLoader.virusLab) {
        virusLoader.toggleLab();
      }

      // Track touch selection
      if (typeof gtag !== "undefined") {
        gtag("event", "virus_select", {
          event_category: "engagement",
          event_label: "touch_select",
          animation_name: virus,
        });
      }

      onSelect(virus);
    }
  };

  const handleKeyNavigation = (e: KeyboardEvent) => {
    if (filteredItems.length === 0) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        currentFocusIndex = (currentFocusIndex + 1) % filteredItems.length;
        updateFocus(currentFocusIndex);
        break;
      case "ArrowUp":
        e.preventDefault();
        currentFocusIndex =
          currentFocusIndex <= 0
            ? filteredItems.length - 1
            : currentFocusIndex - 1;
        updateFocus(currentFocusIndex);
        break;
      case "ArrowRight": {
        if (document.activeElement === searchInput) return;
        e.preventDefault();
        const nextIndex = Math.min(
          currentFocusIndex + Math.floor(filteredItems.length / 4) || 1,
          filteredItems.length - 1,
        );
        updateFocus(nextIndex);
        break;
      }
      case "ArrowLeft": {
        if (document.activeElement === searchInput) return;
        e.preventDefault();
        const prevIndex = Math.max(
          currentFocusIndex - Math.floor(filteredItems.length / 4) || 1,
          0,
        );
        updateFocus(prevIndex);
        break;
      }
      case "Enter":
        if (currentFocusIndex >= 0 && filteredItems[currentFocusIndex]) {
          const virus =
            filteredItems[currentFocusIndex].getAttribute("data-virus")!;
          cleanup();

          // Track keyboard Enter selection
          if (typeof gtag !== "undefined") {
            gtag("event", "virus_select", {
              event_category: "engagement",
              event_label: "keyboard_enter",
              animation_name: virus,
            });
          }

          onSelect(virus);
        }
        break;
      case "Escape":
        cleanup();

        // Track Escape key close
        if (typeof gtag !== "undefined") {
          gtag("event", "virus_overlay_close", {
            event_category: "engagement",
            event_label: "escape_key",
          });
        }

        onClose();
        break;
      case "/":
        if (document.activeElement !== searchInput) {
          e.preventDefault();
          searchInput.focus();
        }
        break;
    }
  };

  const handleCloseClick = (e: MouseEvent) => {
    e.stopPropagation();
    cleanup();

    // Track close button click
    if (typeof gtag !== "undefined") {
      gtag("event", "virus_overlay_close", {
        event_category: "engagement",
        event_label: "close_button",
      });
    }

    onClose();
  };

  const handleBackgroundClick = (e: MouseEvent) => {
    if (e.target === overlay) {
      cleanup();

      // Track background click close
      if (typeof gtag !== "undefined") {
        gtag("event", "virus_overlay_close", {
          event_category: "engagement",
          event_label: "background_click",
        });
      }

      onClose();
    }
  };

  const handleThumbnailClick = (e: MouseEvent, htmlWrapper: HTMLElement) => {
    e.stopPropagation();
    cleanup();
    const virus = htmlWrapper.getAttribute("data-virus")!;

    // Close lab if it's open
    if (virusLoader && virusLoader.virusLab) {
      virusLoader.toggleLab();
    }

    // Track virus selection
    if (typeof gtag !== "undefined") {
      gtag("event", "virus_select", {
        event_category: "engagement",
        event_label: "thumbnail_click",
        animation_name: virus,
      });
    }

    onSelect(virus);
  };

  const handleThumbnailKeydown = (
    e: KeyboardEvent,
    htmlWrapper: HTMLElement,
  ) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      const virus = htmlWrapper.getAttribute("data-virus")!;
      cleanup();

      // Close lab if it's open
      if (virusLoader && virusLoader.virusLab) {
        virusLoader.toggleLab();
      }

      // Track keyboard virus selection
      if (typeof gtag !== "undefined") {
        gtag("event", "virus_select", {
          event_category: "engagement",
          event_label: "keyboard_select",
          animation_name: virus,
        });
      }

      onSelect(virus);
    }
  };

  // Keyboard navigation
  let currentFocusIndex = -1;

  function updateFocus(index: number) {
    // Remove focus from all items
    filteredItems.forEach((item, i) => {
      if (i === index) {
        item.focus();
        item.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    });
    currentFocusIndex = index;
  }

  // Add event listeners
  searchInput.addEventListener("input", handleSearchInput);
  overlay.addEventListener("keydown", handleKeyNavigation);
  closeBtn.addEventListener("click", handleCloseClick);
  overlay.addEventListener("click", handleBackgroundClick);

  // Add click and touch events for each thumbnail
  const thumbnailHandlers = new Map<
    HTMLElement,
    {
      click: (e: MouseEvent) => void;
      keydown: (e: KeyboardEvent) => void;
      touchstart: (e: TouchEvent) => void;
      touchmove: (e: TouchEvent) => void;
      touchend: (e: TouchEvent) => void;
    }
  >();

  thumbnailItems.forEach((thumbWrapper) => {
    const htmlWrapper = thumbWrapper as HTMLElement;
    const handlers = {
      click: (e: MouseEvent) => handleThumbnailClick(e, htmlWrapper),
      keydown: (e: KeyboardEvent) => handleThumbnailKeydown(e, htmlWrapper),
      touchstart: (e: TouchEvent) => handleTouchStart(e),
      touchmove: (e: TouchEvent) => handleTouchMove(e),
      touchend: (e: TouchEvent) => handleTouchEnd(e, htmlWrapper),
    };

    thumbnailHandlers.set(htmlWrapper, handlers);
    htmlWrapper.addEventListener("click", handlers.click);
    htmlWrapper.addEventListener("keydown", handlers.keydown);
    htmlWrapper.addEventListener("touchstart", handlers.touchstart);
    htmlWrapper.addEventListener("touchmove", handlers.touchmove);
    htmlWrapper.addEventListener("touchend", handlers.touchend);
  });

  // Focus search input initially
  setTimeout(() => {
    searchInput.focus();
  }, 100);

  // Add overlay to DOM with animation
  document.body.appendChild(overlay);

  // Prevent body scroll when overlay is open
  document.body.style.overflow = "hidden";

  // Cleanup function to restore body scroll and remove event listeners
  function cleanup() {
    document.body.style.overflow = "";
    overlay.removeEventListener("keydown", handleKeyNavigation);
    searchInput.removeEventListener("input", handleSearchInput);
    closeBtn.removeEventListener("click", handleCloseClick);
    overlay.removeEventListener("click", handleBackgroundClick);

    // Clean up thumbnail event listeners using stored handlers
    thumbnailHandlers.forEach((handlers, element) => {
      element.removeEventListener("click", handlers.click);
      element.removeEventListener("keydown", handlers.keydown);
      element.removeEventListener("touchstart", handlers.touchstart);
      element.removeEventListener("touchmove", handlers.touchmove);
      element.removeEventListener("touchend", handlers.touchend);
    });
    thumbnailHandlers.clear();

    overlay.remove();
  }

  // Store cleanup function on overlay for potential external cleanup
  (overlay as unknown as HTMLElement & { cleanup: () => void }).cleanup =
    cleanup;

  // Auto-cleanup when overlay is removed
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.removedNodes.forEach((node) => {
        if (node === overlay) {
          cleanup();
          observer.disconnect();
        }
      });
    });
  });

  observer.observe(document.body, { childList: true });
}
