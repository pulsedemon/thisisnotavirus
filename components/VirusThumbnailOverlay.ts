import Playlist from "./Playlist";

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

  const overlay = document.createElement("div");
  overlay.id = "virus-thumbnail-overlay";
  overlay.style.position = "fixed";
  overlay.style.top = "0";
  overlay.style.left = "0";
  overlay.style.width = "100vw";
  overlay.style.height = "100vh";
  overlay.style.background = "rgba(0,0,0,0.96)";
  overlay.style.zIndex = "100000";
  overlay.style.display = "flex";
  overlay.style.flexDirection = "column";
  overlay.style.alignItems = "center";
  overlay.style.justifyContent = "center";
  if (isMobile) overlay.classList.add("mobile");

  // Close button
  const closeBtn = document.createElement("button");
  closeBtn.innerText = "✕";
  closeBtn.className = "virus-thumbnail-close";
  closeBtn.style.position = "absolute";
  if (isMobile) {
    closeBtn.style.top = "12px";
    closeBtn.style.left = "12px";
    closeBtn.style.right = "auto";
    closeBtn.style.width = "56px";
    closeBtn.style.height = "56px";
    closeBtn.style.fontSize = "2.2rem";
  } else {
    closeBtn.style.top = "30px";
    closeBtn.style.right = "40px";
    closeBtn.style.left = "auto";
    closeBtn.style.width = "48px";
    closeBtn.style.height = "48px";
    closeBtn.style.fontSize = "2.5rem";
  }
  closeBtn.style.background = "#00ffff";
  closeBtn.style.color = "#000";
  closeBtn.style.border = "none";
  closeBtn.style.borderRadius = "50%";
  closeBtn.style.cursor = "pointer";
  closeBtn.style.zIndex = "100001";
  closeBtn.onclick = (e) => {
    e.stopPropagation();
    overlay.remove();
    onClose();
  };
  overlay.appendChild(closeBtn);

  // Grid container
  const grid = document.createElement("div");
  grid.className = "virus-thumbnail-grid";
  grid.style.display = "grid";
  if (isMobile) {
    grid.style.gridTemplateColumns = "repeat(auto-fit, minmax(120px, 1fr))";
    grid.style.gap = "0px";
    grid.style.width = "100vw";
    grid.style.maxWidth = "100vw";
    grid.style.padding = "0 20px";
    grid.classList.add("mobile");
  } else {
    grid.style.gridTemplateColumns = "repeat(auto-fit, minmax(220px, 1fr))";
    grid.style.gap = "32px";
    grid.style.width = "80vw";
    grid.style.maxWidth = "1200px";
    grid.style.padding = "60px 0 0 0";
  }
  grid.style.margin = "0 auto";
  grid.style.justifyItems = "center";
  grid.style.alignItems = "center";
  grid.style.overflowY = "auto";
  grid.style.maxHeight = isMobile ? "100%" : "80vh";

  // Get virus list
  const playlist = new Playlist();
  playlist.viruses.forEach((virus) => {
    const thumbWrapper = document.createElement("div");
    thumbWrapper.className = "virus-thumbnail-item";
    if (isMobile) thumbWrapper.classList.add("mobile");
    thumbWrapper.style.display = "flex";
    thumbWrapper.style.flexDirection = "column";
    thumbWrapper.style.alignItems = "center";
    thumbWrapper.style.cursor = "pointer";
    thumbWrapper.style.background = "#111";
    thumbWrapper.style.border = "2px solid #00ffff";
    thumbWrapper.style.borderRadius = "12px";
    thumbWrapper.style.transition = "transform 0.15s, box-shadow 0.15s";
    thumbWrapper.style.overflow = "hidden";
    thumbWrapper.style.boxSizing = "border-box";
    if (isMobile) {
      thumbWrapper.style.width = "100%";
      thumbWrapper.style.maxWidth = "120px";
      thumbWrapper.style.padding = "0px";
      thumbWrapper.style.margin = "0 auto";
    } else {
      thumbWrapper.style.padding = "8px 8px 16px 8px";
    }
    thumbWrapper.onmouseenter = () => {
      thumbWrapper.style.transform = "scale(1.04)";
      thumbWrapper.style.boxShadow = "0 0 16px #00ffff88";
    };
    thumbWrapper.onmouseleave = () => {
      thumbWrapper.style.transform = "none";
      thumbWrapper.style.boxShadow = "none";
    };

    // Iframe thumbnail
    const iframe = document.createElement("iframe");
    iframe.src = `/viruses/${virus}/`;
    iframe.title = virus;
    if (isMobile) {
      iframe.width = "100";
      iframe.height = "56";
      iframe.style.width = "100%";
      iframe.style.maxWidth = "120px";
      iframe.style.height = "56px";
      iframe.style.marginBottom = "0px";
    } else {
      iframe.width = "150";
      iframe.height = "110";
      iframe.style.width = "150px";
      iframe.style.height = "110px";
    }
    iframe.className = isMobile ? "mobile" : "";
    iframe.style.border = "none";
    iframe.style.background = "#000";
    iframe.style.borderRadius = "8px";
    iframe.style.pointerEvents = "none"; // Prevent interaction inside thumb
    thumbWrapper.appendChild(iframe);

    // Virus name
    const label = document.createElement("div");
    label.innerText = virus.replace(/-/g, " ");
    label.style.color = "#00ffff";
    label.style.fontFamily = "monospace";
    label.style.fontSize = isMobile ? "0.95rem" : "1.1rem";
    label.style.textAlign = "center";
    label.style.marginTop = isMobile ? "0px" : "4px";
    thumbWrapper.appendChild(label);

    thumbWrapper.onclick = (e) => {
      e.stopPropagation();
      overlay.remove();
      onSelect(virus);
    };

    grid.appendChild(thumbWrapper);
  });

  overlay.appendChild(grid);

  // Close overlay on background click
  overlay.onclick = (e) => {
    if (e.target === overlay) {
      overlay.remove();
      onClose();
    }
  };

  document.body.appendChild(overlay);
}
