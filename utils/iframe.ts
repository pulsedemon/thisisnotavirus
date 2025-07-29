/**
 * Applies standard styling to an iframe element
 */
export function styleIframe(
  iframe: HTMLIFrameElement,
  isSecondary = false
): void {
  // Ensure both iframes have identical positioning and dimensions
  iframe.style.width = "100%";
  iframe.style.height = "100%";
  iframe.style.border = "none";
  iframe.style.position = "absolute";
  iframe.style.top = "0";
  iframe.style.left = "0";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.background = "#000";
  iframe.style.margin = "0";
  iframe.style.padding = "0";
  iframe.style.boxSizing = "border-box";
  iframe.style.pointerEvents = "none";

  // Ensure responsive behavior
  iframe.style.minWidth = "100%";
  iframe.style.minHeight = "100%";
  iframe.style.maxWidth = "100%";
  iframe.style.maxHeight = "100%";

  if (isSecondary) {
    iframe.style.mixBlendMode = "screen";
    iframe.className = "secondary-virus";
    // Ensure secondary iframe is perfectly aligned over primary
    iframe.style.zIndex = "1";
  } else {
    iframe.style.zIndex = "0";
  }
}

/**
 * Creates and styles a new iframe element
 */
export function createStyledIframe(isSecondary = false): HTMLIFrameElement {
  const iframe = document.createElement("iframe");
  styleIframe(iframe, isSecondary);
  return iframe;
}
