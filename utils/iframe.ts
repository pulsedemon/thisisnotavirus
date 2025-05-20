/**
 * Applies standard styling to an iframe element
 */
export function styleIframe(
  iframe: HTMLIFrameElement,
  isSecondary = false
): void {
  iframe.style.width = "100%";
  iframe.style.height = "100%";
  iframe.style.border = "none";
  iframe.style.position = "absolute";
  iframe.style.top = "0";
  iframe.style.left = "0";
  iframe.style.background = "#000";

  if (isSecondary) {
    iframe.style.mixBlendMode = "screen";
    iframe.className = "secondary-virus";
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
