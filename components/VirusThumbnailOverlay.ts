import { formatVirusName } from "../utils/misc";
import Playlist from "./Playlist";
import overlayTemplate from "./templates/virus-thumbnail-overlay.hbs";

declare let gtag: (
  command: "config" | "event",
  targetId: string,
  config?: Record<string, any>
) => void;

export function showVirusThumbnailOverlay({
  onSelect,
  onClose,
}: {
  onSelect: (virus: string) => void;
  onClose: () => void;
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
      mix.secondary
    )} (${Math.round(mix.mixRatio * 100)}%)`,
    type: "custom",
    mix: {
      ...mix,
      mixRatioPercent: Math.round(mix.mixRatio * 100),
    },
  }));

  // Render overlay HTML using Handlebars template
  const overlayDiv = document.createElement("div");
  overlayDiv.innerHTML = overlayTemplate({
    viruses,
    customViruses,
    hasCustomViruses: customViruses.length > 0,
    isMobile,
  });
  const overlay = overlayDiv.firstElementChild as HTMLElement;

  // Get references to key elements
  const searchInput = overlay.querySelector(
    ".virus-search"
  ) as HTMLInputElement;
  const thumbnailItems = overlay.querySelectorAll(".virus-thumbnail-item");
  const closeBtn = overlay.querySelector(
    ".virus-thumbnail-close"
  ) as HTMLButtonElement;

  // Search functionality
  let filteredItems = Array.from(thumbnailItems) as HTMLElement[];

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
            customVirus.mix.primary
          ).toLowerCase();
          const secondaryVirus = formatVirusName(
            customVirus.mix.secondary
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
          filteredItems.length - 1
        );
        updateFocus(nextIndex);
        break;
      }
      case "ArrowLeft": {
        if (document.activeElement === searchInput) return;
        e.preventDefault();
        const prevIndex = Math.max(
          currentFocusIndex - Math.floor(filteredItems.length / 4) || 1,
          0
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
    htmlWrapper: HTMLElement
  ) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      const virus = htmlWrapper.getAttribute("data-virus")!;
      cleanup();

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

  // Add click events for each thumbnail
  const thumbnailHandlers = new Map<
    HTMLElement,
    {
      click: (e: MouseEvent) => void;
      keydown: (e: KeyboardEvent) => void;
    }
  >();

  thumbnailItems.forEach((thumbWrapper) => {
    const htmlWrapper = thumbWrapper as HTMLElement;
    const handlers = {
      click: (e: MouseEvent) => handleThumbnailClick(e, htmlWrapper),
      keydown: (e: KeyboardEvent) => handleThumbnailKeydown(e, htmlWrapper),
    };

    thumbnailHandlers.set(htmlWrapper, handlers);
    htmlWrapper.addEventListener("click", handlers.click);
    htmlWrapper.addEventListener("keydown", handlers.keydown);
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
    });
    thumbnailHandlers.clear();

    overlay.remove();
  }

  // Store cleanup function on overlay for potential external cleanup
  (overlay as HTMLElement & { cleanup: () => void }).cleanup = cleanup;

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
