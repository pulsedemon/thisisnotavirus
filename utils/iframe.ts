/**
 * Applies standard CSS classes to an iframe element
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
 * Creates a new iframe element with standard CSS classes
 */
export function createStyledIframe(isSecondary = false): HTMLIFrameElement {
  const iframe = document.createElement('iframe');
  styleIframe(iframe, isSecondary);
  return iframe;
}
