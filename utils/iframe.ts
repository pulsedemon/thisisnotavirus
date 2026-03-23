/**
 * Applies standard styling to an iframe element
 */
export function styleIframe(
  iframe: HTMLIFrameElement,
  isSecondary = false
): void {
  iframe.classList.add('virus-iframe');
  if (isSecondary) {
    iframe.classList.add('virus-iframe--secondary');
    iframe.classList.add('secondary-virus');
  }
}

/**
 * Creates and styles a new iframe element
 */
export function createStyledIframe(isSecondary = false): HTMLIFrameElement {
  const iframe = document.createElement('iframe');
  styleIframe(iframe, isSecondary);
  return iframe;
}
