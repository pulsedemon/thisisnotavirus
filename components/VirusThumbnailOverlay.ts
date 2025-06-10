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
  }));

  // Render overlay HTML using Handlebars template
  const overlayDiv = document.createElement("div");
  overlayDiv.innerHTML = overlayTemplate({ viruses, isMobile });
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
      const label = formatVirusName(virus).toLowerCase();
      const matches =
        label.includes(term) || virus.toLowerCase().includes(term);

      if (matches) {
        htmlItem.classList.remove("filtered-out");
        htmlItem.style.removeProperty("display");
        filteredItems.push(htmlItem);
      } else {
        htmlItem.classList.add("filtered-out");
      }
    });
  }

  // Search input event listener
  searchInput.addEventListener("input", (e) => {
    const target = e.target as HTMLInputElement;
    filterItems(target.value);
  });

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

  function handleKeyNavigation(e: KeyboardEvent) {
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
          overlay.remove();

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
        overlay.remove();

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
  }

  // Close button event
  closeBtn.onclick = (e) => {
    e.stopPropagation();
    overlay.remove();

    // Track close button click
    if (typeof gtag !== "undefined") {
      gtag("event", "virus_overlay_close", {
        event_category: "engagement",
        event_label: "close_button",
      });
    }

    onClose();
  };

  // Add click events for each thumbnail
  thumbnailItems.forEach((thumbWrapper) => {
    const htmlWrapper = thumbWrapper as HTMLElement;
    htmlWrapper.addEventListener("click", (e) => {
      e.stopPropagation();
      overlay.remove();
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
    });

    // Add keyboard support for individual items
    htmlWrapper.addEventListener("keydown", (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        const virus = htmlWrapper.getAttribute("data-virus")!;
        overlay.remove();

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
    });
  });

  // Close overlay on background click
  overlay.onclick = (e) => {
    if (e.target === overlay) {
      overlay.remove();

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

  // Add keyboard event listeners
  overlay.addEventListener("keydown", handleKeyNavigation);

  // Focus search input initially
  setTimeout(() => {
    searchInput.focus();
  }, 100);

  // Add overlay to DOM with animation
  document.body.appendChild(overlay);

  // Prevent body scroll when overlay is open
  document.body.style.overflow = "hidden";

  // Cleanup function to restore body scroll
  const cleanup = () => {
    document.body.style.overflow = "";
    overlay.removeEventListener("keydown", handleKeyNavigation);
  };

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
