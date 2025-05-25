import { formatVirusName } from "../utils/misc";
import Playlist from "./Playlist";
import overlayTemplate from "./templates/virus-thumbnail-overlay.hbs";

export function showVirusThumbnailOverlay({
  onSelect,
  onClose,
}: {
  onSelect: (virus: string) => void;
  onClose: () => void;
}) {
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

  // Close button event
  const closeBtn = overlay.querySelector(
    ".virus-thumbnail-close"
  ) as HTMLButtonElement;
  closeBtn.onclick = (e) => {
    e.stopPropagation();
    overlay.remove();
    onClose();
  };

  // Add click events for each thumbnail
  overlay.querySelectorAll(".virus-thumbnail-item").forEach((thumbWrapper) => {
    thumbWrapper.addEventListener("click", (e) => {
      e.stopPropagation();
      overlay.remove();
      const virus = (thumbWrapper as HTMLElement).getAttribute("data-virus")!;
      onSelect(virus);
    });
  });

  // Close overlay on background click
  overlay.onclick = (e) => {
    if (e.target === overlay) {
      overlay.remove();
      onClose();
    }
  };

  document.body.appendChild(overlay);
}
